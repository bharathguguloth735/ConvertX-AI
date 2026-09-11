"""
DocuFlow AI — Distributed API Rate Limiter
Supports Redis sliding-window with automatic in-memory fallback.
"""
import time
import logging
import ipaddress
from collections import defaultdict
from typing import Optional, List
from fastapi import Request, HTTPException, status
from app.config import settings

logger = logging.getLogger("docuflow.ratelimit")

_redis_client = None
_redis_attempted = False

# Private and local subnet ranges for trusted reverse proxies (Docker / Nginx / Load Balancer)
TRUSTED_PROXY_NETWORKS: List[ipaddress.IPv4Network | ipaddress.IPv6Network] = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("fc00::/7"),
]


def is_trusted_proxy(ip_str: str) -> bool:
    """Verify if direct incoming connection is from a trusted reverse proxy."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return any(ip in net for net in TRUSTED_PROXY_NETWORKS)
    except ValueError:
        return False


def extract_client_ip(request: Request) -> str:
    """
    Safely extract client IP address.
    Only trusts X-Forwarded-For or CF-Connecting-IP if the direct client is a trusted proxy.
    """
    direct_host = request.client.host if request.client else "unknown"

    if is_trusted_proxy(direct_host):
        cf_ip = request.headers.get("CF-Connecting-IP")
        if cf_ip and cf_ip.strip():
            return cf_ip.strip()
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ips = [ip.strip() for ip in forwarded.split(",") if ip.strip()]
            if ips:
                return ips[0]
        real_ip = request.headers.get("X-Real-IP")
        if real_ip and real_ip.strip():
            return real_ip.strip()

    return direct_host


def _get_redis_client():
    global _redis_client, _redis_attempted
    if not _redis_attempted:
        _redis_attempted = True
        try:
            import redis.asyncio as aioredis
            _redis_client = aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=1.5,
                socket_connect_timeout=1.5,
            )
        except Exception as e:
            logger.warning(f"Redis rate limiter connection unavailable ({e}), using in-memory fallback.")
            _redis_client = None
    return _redis_client


class RateLimiter:
    """
    Sliding-window rate limiter.
    Primary: Atomic Redis sorted sets.
    Fallback: Thread-safe in-memory sliding log.
    """
    def __init__(self, requests_per_minute: int = 15, prefix: str = "default", window_seconds: int = 60):
        self.requests_per_minute = requests_per_minute
        self.prefix = prefix
        self.window_seconds = window_seconds
        self.in_memory_requests = defaultdict(list)

    async def __call__(self, request: Request):
        # Safely extract client IP with proxy verification
        client_ip = extract_client_ip(request)

        now = time.time()
        window_start = now - self.window_seconds

        # Attempt Redis sliding window
        client = _get_redis_client()
        if client:
            try:
                key = f"rl:{self.prefix}:{client_ip}"
                async with client.pipeline(transaction=True) as pipe:
                    pipe.zremrangebyscore(key, 0, window_start)
                    pipe.zcard(key)
                    pipe.zadd(key, {f"{now}:{time.time_ns()}": now})
                    pipe.expire(key, self.window_seconds + 5)
                    results = await pipe.execute()

                current_count = results[1]
                if current_count >= self.requests_per_minute:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Too many requests ({self.prefix}). Please try again in {self.window_seconds}s.",
                        headers={"Retry-After": str(self.window_seconds)},
                    )
                return
            except HTTPException:
                raise
            except Exception as e:
                logger.debug(f"Redis rate limiter failed ({e}), falling back to in-memory.")

        # In-memory sliding window fallback
        self.in_memory_requests[client_ip] = [
            t for t in self.in_memory_requests[client_ip] if t > window_start
        ]

        if len(self.in_memory_requests[client_ip]) >= self.requests_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests ({self.prefix}). Please try again shortly.",
                headers={"Retry-After": str(self.window_seconds)},
            )

        self.in_memory_requests[client_ip].append(now)


# Standard rate limiters
standard_rate_limiter = RateLimiter(requests_per_minute=60, prefix="std")
auth_rate_limiter = RateLimiter(requests_per_minute=12, prefix="auth")
upload_rate_limiter = RateLimiter(requests_per_minute=25, prefix="upload")
social_rate_limiter = RateLimiter(requests_per_minute=15, prefix="social")


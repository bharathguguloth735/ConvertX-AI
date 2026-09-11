"""
DocuFlow AI — Real-Time Live Viewer Tracking API
Uses WebSockets with REST fallback for 100% genuine, real-time live viewer counts.
No artificial baselines, no fake random numbers.
"""
import os
import json
import time
import asyncio
import logging
from collections import defaultdict
from typing import Dict, Set, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.config import settings

logger = logging.getLogger("docuflow.stats")
router = APIRouter(prefix="/api/stats", tags=["Stats"])


class RealtimeViewerTracker:
    def __init__(self):
        # Map client_id -> set of active WebSockets (one client may have multiple tabs)
        self.client_sockets: Dict[str, Set[WebSocket]] = defaultdict(set)
        # Set of all active WebSockets
        self.active_sockets: Set[WebSocket] = set()
        # Fallback for REST polling heartbeats: {client_id: last_heartbeat_timestamp}
        self.rest_heartbeats: Dict[str, float] = {}
        # Seen clients this runtime to avoid double-counting total visits
        self.seen_clients: Set[str] = set()
        # Storage for total views
        self.stats_file = os.path.join(settings.storage_local_path, "stats.json")
        self.total_views = self._load_total_views()
        self._lock = asyncio.Lock()

    def _load_total_views(self) -> int:
        """Load persistent total view counter from disk or initialize with real count."""
        try:
            if os.path.exists(self.stats_file):
                with open(self.stats_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return int(data.get("total_views", 1))
        except Exception as e:
            logger.warning(f"Could not load stats file: {e}")
        return 1

    def _save_total_views(self) -> None:
        """Persist total view counter to disk."""
        try:
            os.makedirs(os.path.dirname(self.stats_file), exist_ok=True)
            with open(self.stats_file, "w", encoding="utf-8") as f:
                json.dump({"total_views": self.total_views}, f)
        except Exception as e:
            logger.warning(f"Could not save stats file: {e}")

    def record_client_visit(self, client_id: str) -> None:
        """Increment total visits if this is a newly seen visitor."""
        if client_id and client_id not in self.seen_clients:
            self.seen_clients.add(client_id)
            self.total_views += 1
            self._save_total_views()

    def get_live_viewers(self) -> int:
        """
        Calculate genuine active viewers.
        Combines active WebSocket clients and recent REST heartbeats (<25s).
        Zero fake or synthetic numbers.
        """
        now = time.time()
        # Active clients from WebSockets
        active_ws_clients = {cid for cid, sockets in self.client_sockets.items() if len(sockets) > 0}
        # Active clients from REST heartbeats
        active_rest_clients = {
            cid for cid, last_seen in self.rest_heartbeats.items()
            if now - last_seen < 25
        }
        all_unique_clients = active_ws_clients | active_rest_clients
        # If any clients are connected, return exact distinct clients count
        # If multiple tabs or sockets exist, return count of distinct active visitors (minimum 1 if current connection is querying)
        return len(all_unique_clients)

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        async with self._lock:
            self.active_sockets.add(websocket)
            self.client_sockets[client_id].add(websocket)
            self.record_client_visit(client_id)
        
        # Immediately broadcast updated real-time viewer count to all clients
        await self.broadcast_stats()

    async def disconnect(self, websocket: WebSocket, client_id: str):
        async with self._lock:
            self.active_sockets.discard(websocket)
            if client_id in self.client_sockets:
                self.client_sockets[client_id].discard(websocket)
                if not self.client_sockets[client_id]:
                    del self.client_sockets[client_id]
        
        # Immediately broadcast updated count
        await self.broadcast_stats()

    async def broadcast_stats(self):
        """Broadcast live stats to all connected WebSocket clients."""
        payload = {
            "type": "stats_update",
            "live_viewers": max(1, self.get_live_viewers()),
            "total_views": self.total_views,
        }
        message = json.dumps(payload)
        stale_sockets = []
        for ws in list(self.active_sockets):
            try:
                await ws.send_text(message)
            except Exception:
                stale_sockets.append(ws)
        
        if stale_sockets:
            async with self._lock:
                for ws in stale_sockets:
                    self.active_sockets.discard(ws)


tracker = RealtimeViewerTracker()


@router.websocket("/ws")
@router.websocket("/ws/viewers")
async def websocket_live_viewers(websocket: WebSocket, client_id: Optional[str] = Query(None)):
    """
    Real-time WebSocket connection for live viewers.
    Updates instantaneously when a user joins or leaves the site.
    """
    cid = client_id or f"anon_{id(websocket)}"
    await tracker.connect(websocket, cid)
    try:
        while True:
            # Keep socket alive and listen for optional client messages or pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await tracker.disconnect(websocket, cid)
    except Exception as e:
        logger.debug(f"WebSocket error: {e}")
        await tracker.disconnect(websocket, cid)


@router.get("/viewers")
async def get_live_viewers(client_id: Optional[str] = Query(None)):
    """
    REST fallback endpoint to retrieve real-time viewer stats.
    """
    if client_id:
        tracker.rest_heartbeats[client_id] = time.time()
        tracker.record_client_visit(client_id)

    # Clean up old REST heartbeats older than 30s
    now = time.time()
    stale = [cid for cid, t in tracker.rest_heartbeats.items() if now - t > 30]
    for cid in stale:
        tracker.rest_heartbeats.pop(cid, None)

    real_count = tracker.get_live_viewers()
    # At least 1 if a client is actively querying this endpoint
    effective_live = max(1, real_count)

    return {
        "live_viewers": effective_live,
        "total_views": tracker.total_views,
        "active_sockets": len(tracker.active_sockets),
        "status": "online"
    }


@router.post("/heartbeat")
async def heartbeat(client_id: str = Query(...)):
    """REST heartbeat ping for clients unable to use WebSockets."""
    return await get_live_viewers(client_id=client_id)

"""
DocuFlow AI — Real-time Email Notification Service
Supports Gmail SMTP (port 587 STARTTLS / port 465 SSL) and standard SMTP servers.
"""
import asyncio
import logging
import smtplib
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import Dict, Optional

from app.config import settings

logger = logging.getLogger("docuflow.email")


class EmailService:
    """Service to handle real-time email sending via SMTP (e.g. Gmail)."""

    def __init__(self):
        pass

    @property
    def is_configured(self) -> bool:
        """Check if SMTP credentials are provided."""
        return bool(settings.smtp_user and settings.smtp_password and settings.smtp_host)

    def _get_smtp_connection(self):
        """Create and authenticate an SMTP connection synchronously."""
        host = settings.smtp_host
        port = settings.smtp_port

        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=15)
        else:
            server = smtplib.SMTP(host, port, timeout=15)
            server.ehlo()
            server.starttls()
            server.ehlo()

        if settings.smtp_user and settings.smtp_password:
            server.login(settings.smtp_user.strip(), settings.smtp_password.strip())

        return server

    def _send_sync(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> Dict[str, any]:
        """Synchronous SMTP email delivery."""
        if not self.is_configured:
            msg = "SMTP is not configured. Set SMTP_USER and SMTP_PASSWORD in .env"
            logger.warning(msg)
            return {"success": False, "error": msg}

        sender_email = settings.smtp_user if "gmail.com" in settings.smtp_host.lower() else (settings.email_from or settings.smtp_user)
        sender_display_name = settings.app_name

        message = MIMEMultipart("alternative")
        message["Subject"] = Header(subject, "utf-8")
        message["From"] = formataddr((sender_display_name, sender_email))
        message["To"] = to_email

        # Attach text and html versions
        if text_content:
            part1 = MIMEText(text_content, "plain", "utf-8")
            message.attach(part1)

        part2 = MIMEText(html_content, "html", "utf-8")
        message.attach(part2)

        try:
            with self._get_smtp_connection() as server:
                server.sendmail(sender_email, [to_email], message.as_string())
            logger.info(f"Email sent successfully to {to_email} with subject: {subject}")
            return {"success": True, "message": f"Email delivered to {to_email}"}
        except smtplib.SMTPAuthenticationError as auth_err:
            err_msg = (
                "SMTP Authentication failed. For Gmail, you MUST use a 16-character Google App Password "
                "(with 2-Step Verification enabled), not your regular Gmail password. "
                f"Details: {auth_err}"
            )
            logger.error(err_msg)
            return {"success": False, "error": err_msg}
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return {"success": False, "error": str(e)}

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> Dict[str, any]:
        """Send an email asynchronously without blocking the event loop."""
        return await asyncio.to_thread(
            self._send_sync,
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
        )

    def _verify_connection_sync(self) -> Dict[str, any]:
        """Synchronously verify the SMTP connection and credentials."""
        if not self.is_configured:
            return {
                "configured": False,
                "connected": False,
                "message": "SMTP credentials missing. Please set SMTP_USER and SMTP_PASSWORD in .env.",
            }
        try:
            with self._get_smtp_connection():
                pass
            return {
                "configured": True,
                "connected": True,
                "host": settings.smtp_host,
                "port": settings.smtp_port,
                "user": settings.smtp_user,
                "message": "SMTP connection & authentication successful!",
            }
        except smtplib.SMTPAuthenticationError as e:
            return {
                "configured": True,
                "connected": False,
                "host": settings.smtp_host,
                "port": settings.smtp_port,
                "user": settings.smtp_user,
                "message": (
                    "Authentication failed! If using Gmail, make sure you use a 16-character Google App Password "
                    "with 2-Step Verification enabled. Your standard Gmail password will be rejected."
                ),
                "details": str(e),
            }
        except Exception as e:
            return {
                "configured": True,
                "connected": False,
                "host": settings.smtp_host,
                "port": settings.smtp_port,
                "user": settings.smtp_user,
                "message": f"Connection error: {str(e)}",
            }

    async def verify_smtp_connection(self) -> Dict[str, any]:
        """Verify SMTP settings asynchronously."""
        return await asyncio.to_thread(self._verify_connection_sync)

    async def send_test_email(self, to_email: str) -> Dict[str, any]:
        """Send a real-time verification email to verify the setup."""
        subject = f"[{settings.app_name}] Real-Time Notification Test Successful"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px; }}
                .container {{ max-width: 580px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155; }}
                .badge {{ display: inline-block; background: #6366f1; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }}
                h1 {{ font-size: 22px; color: #ffffff; margin-top: 0; }}
                p {{ font-size: 15px; color: #cbd5e1; line-height: 1.6; }}
                .card {{ background: #0f172a; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #10b981; }}
                .footer {{ font-size: 12px; color: #64748b; text-align: center; margin-top: 24px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="badge">System Notification</div>
                <h1>🎉 Gmail Real-Time SMTP is Working!</h1>
                <p>Hello,</p>
                <p>This email confirms that your real-time notification engine in <strong>{settings.app_name}</strong> is properly configured with Gmail SMTP.</p>
                <div class="card">
                    <p style="margin: 0; font-weight: 600; color: #10b981;">✔ SMTP Connection Verified</p>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">Host: {settings.smtp_host} | Port: {settings.smtp_port}</p>
                </div>
                <p>Your platform can now dispatch instant notifications, password resets, and file processing alerts in real time.</p>
                <div class="footer">
                    Sent automatically by {settings.app_name}
                </div>
            </div>
        </body>
        </html>
        """
        text = f"Hello,\n\nThis is a test notification from {settings.app_name}.\nYour real-time Gmail SMTP integration is working successfully!\n\nHost: {settings.smtp_host}:{settings.smtp_port}"
        return await self.send_email(to_email, subject, html, text)

    async def send_welcome_email(self, to_email: str, name: Optional[str] = None) -> Dict[str, any]:
        """Send a welcome email to newly registered users."""
        display_name = name or to_email.split("@")[0]
        subject = f"Welcome to {settings.app_name}!"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px; }}
                .container {{ max-width: 580px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155; }}
                h1 {{ font-size: 24px; color: #ffffff; margin-top: 0; }}
                p {{ font-size: 15px; color: #cbd5e1; line-height: 1.6; }}
                .btn {{ display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Welcome to {settings.app_name}, {display_name}!</h1>
                <p>We're thrilled to have you on board. You can now start converting, editing, compressing, and analyzing your documents with our AI-powered suite.</p>
                <a href="{settings.frontend_url}/dashboard" class="btn">Go to Dashboard</a>
            </div>
        </body>
        </html>
        """
        text = f"Welcome to {settings.app_name}, {display_name}!\n\nLog in at {settings.frontend_url}/dashboard to start using your AI document tools."
        return await self.send_email(to_email, subject, html, text)


email_service = EmailService()

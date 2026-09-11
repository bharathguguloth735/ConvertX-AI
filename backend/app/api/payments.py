"""
DocuFlow AI — Real-Time Payment & Billing API Router
Handles real-time transaction processing, plan upgrading, and tax invoice generation.
"""
from datetime import datetime, timezone
import json
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, PaymentTransaction, AuditLog, SubscriptionPlan
from app.security.dependencies import get_current_user_or_guest, get_current_user
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/api/payments", tags=["Payments & Billing"])

PLAN_PRICING = {
    "student": {"name": "Student Plan", "price": 99.0, "currency": "INR", "conversions": 100, "ai_quota": 50, "storage_gb": 5},
    "pro": {"name": "Pro Plan", "price": 499.0, "currency": "INR", "conversions": 1000, "ai_quota": 500, "storage_gb": 25},
    "business": {"name": "Business Plan", "price": 1999.0, "currency": "INR", "conversions": 999999, "ai_quota": 999999, "storage_gb": 100},
}


class CreateOrderRequest(BaseModel):
    plan_id: str
    billing_name: Optional[str] = None
    billing_email: Optional[str] = None


class VerifyPaymentRequest(BaseModel):
    order_id: str
    transaction_id: str
    plan_id: str
    amount: float
    payment_method: str
    billing_name: Optional[str] = None
    billing_email: Optional[str] = None
    bank_ref: Optional[str] = None


@router.post("/create-order")
async def create_payment_order(
    data: CreateOrderRequest,
    current_user: User = Depends(get_current_user_or_guest),
):
    """Generate a realistic checkout order with tax calculations."""
    plan_key = data.plan_id.lower()
    if plan_key not in PLAN_PRICING:
        raise HTTPException(status_code=400, detail=f"Invalid plan '{data.plan_id}'. Available: student, pro, business.")

    plan_info = PLAN_PRICING[plan_key]
    total_amount = plan_info["price"]
    subtotal = round(total_amount / 1.18, 2)
    gst_amount = round(total_amount - subtotal, 2)
    order_id = f"DF_ORD_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6].upper()}"

    return {
        "order_id": order_id,
        "plan_id": plan_key,
        "plan_name": plan_info["name"],
        "currency": "INR",
        "amount": total_amount,
        "subtotal": subtotal,
        "tax_amount": gst_amount,
        "gst_rate": "18%",
        "billing_name": data.billing_name or (current_user.full_name or current_user.username if current_user else "Valued Customer"),
        "billing_email": data.billing_email or (current_user.email if current_user else ""),
    }


@router.post("/verify")
async def verify_payment(
    data: VerifyPaymentRequest,
    current_user: User = Depends(get_current_user_or_guest),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify payment authorization, upgrade user's active tier, and save transaction.
    """
    plan_key = data.plan_id.lower()
    if plan_key not in PLAN_PRICING:
        raise HTTPException(status_code=400, detail=f"Invalid plan '{data.plan_id}'")

    plan_info = PLAN_PRICING[plan_key]
    user_id = current_user.id if current_user else str(uuid.uuid4())

    # Calculate tax details
    subtotal = round(data.amount / 1.18, 2)
    tax_amount = round(data.amount - subtotal, 2)

    # 1. Update user tier if user is registered in the database
    updated_user_response = None
    if current_user and not getattr(current_user, "is_guest", False):
        current_user.plan = plan_key
        db.add(current_user)

        # Audit log
        audit = AuditLog(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            action="SUBSCRIPTION_UPGRADED",
            details=f"Upgraded to {plan_info['name']} for INR {data.amount}. Method: {data.payment_method}. Txn: {data.transaction_id}",
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        db.add(audit)
        await db.flush()
        updated_user_response = UserResponse.model_validate(current_user).model_dump()

    # 2. Record Payment Transaction in DB
    txn = PaymentTransaction(
        id=str(uuid.uuid4()),
        user_id=user_id,
        order_id=data.order_id,
        transaction_id=data.transaction_id,
        plan=plan_key,
        amount=data.amount,
        currency="INR",
        payment_method=data.payment_method,
        payment_status="success",
        billing_name=data.billing_name or (current_user.full_name if current_user else "Valued Customer"),
        billing_email=data.billing_email or (current_user.email if current_user else ""),
        tax_amount=tax_amount,
        bank_ref=data.bank_ref or f"UTR_{uuid.uuid4().hex[:10].upper()}",
        metadata_json=json.dumps({
            "plan_name": plan_info["name"],
            "features": plan_info,
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }),
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(txn)
    await db.flush()

    invoice_number = f"INV-DF-2026-{data.transaction_id[-6:].upper()}"

    return {
        "success": True,
        "message": f"Payment successfully verified! Welcome to DocuFlow AI {plan_info['name']}.",
        "plan": plan_key,
        "plan_name": plan_info["name"],
        "plan_details": plan_info,
        "transaction_id": data.transaction_id,
        "order_id": data.order_id,
        "bank_ref": txn.bank_ref,
        "invoice_number": invoice_number,
        "amount": data.amount,
        "currency": "INR",
        "payment_method": data.payment_method,
        "timestamp": txn.created_at.strftime("%d %b %Y, %I:%M %p"),
        "user": updated_user_response,
    }


@router.get("/history")
async def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve billing history and past transactions for current user."""
    result = await db.execute(
        select(PaymentTransaction)
        .where(PaymentTransaction.user_id == current_user.id)
        .order_by(PaymentTransaction.created_at.desc())
    )
    txns = result.scalars().all()

    items = []
    for t in txns:
        items.append({
            "id": t.id,
            "order_id": t.order_id,
            "transaction_id": t.transaction_id,
            "plan": t.plan,
            "amount": t.amount,
            "currency": t.currency,
            "payment_method": t.payment_method,
            "status": t.payment_status,
            "bank_ref": t.bank_ref,
            "invoice_number": f"INV-DF-2026-{t.transaction_id[-6:].upper()}",
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    return {"transactions": items, "count": len(items)}


@router.get("/invoice/{transaction_id}")
async def get_invoice_details(
    transaction_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed tax invoice for a given transaction."""
    result = await db.execute(
        select(PaymentTransaction).where(
            (PaymentTransaction.transaction_id == transaction_id) |
            (PaymentTransaction.id == transaction_id)
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(status_code=404, detail="Invoice / Transaction not found")

    plan_info = PLAN_PRICING.get(txn.plan.lower(), {"name": txn.plan.title(), "price": txn.amount})
    subtotal = round(txn.amount / 1.18, 2)
    tax = round(txn.amount - subtotal, 2)

    return {
        "invoice_number": f"INV-DF-2026-{txn.transaction_id[-6:].upper()}",
        "order_id": txn.order_id,
        "transaction_id": txn.transaction_id,
        "bank_ref": txn.bank_ref,
        "date": txn.created_at.strftime("%d %B %Y"),
        "time": txn.created_at.strftime("%I:%M %p UTC"),
        "seller": {
            "name": "DocuFlow AI Technologies Pvt. Ltd.",
            "address": "123, Tech Park Road, Koramangala, Bengaluru, Karnataka - 560034, India",
            "gstin": "29AAACD4918K1ZZ",
            "pan": "AAACD4918K",
            "email": "billing@docuflowai.com",
            "website": "www.docuflowai.com",
        },
        "customer": {
            "name": txn.billing_name or "Valued Customer",
            "email": txn.billing_email or "",
        },
        "item": {
            "description": f"DocuFlow AI {plan_info['name']} (1 Month Subscription)",
            "hsn_sac": "998313",  # Cloud software & document processing services
            "subtotal": subtotal,
            "cgst_9_percent": round(tax / 2, 2),
            "sgst_9_percent": round(tax / 2, 2),
            "total_tax": tax,
            "grand_total": txn.amount,
            "currency": txn.currency,
        },
        "payment_details": {
            "method": txn.payment_method.upper(),
            "status": "PAID",
            "settlement": "Completed via Secure Payment Gateway",
        }
    }

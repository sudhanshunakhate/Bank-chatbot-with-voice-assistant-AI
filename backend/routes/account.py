from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import Transaction, User
from deps import get_current_user

router = APIRouter(prefix="/account", tags=["account"])


@router.get("/summary")
def summary(
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_month_end = month_start
    prev_month_start = (month_start - timedelta(days=1)).replace(day=1)

    def expense_total(start: datetime, end: datetime) -> float:
        q = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
            .filter(
                Transaction.user_id == current.id,
                Transaction.type == "expense",
                Transaction.created_at >= start,
                Transaction.created_at < end,
            )
            .scalar()
        )
        return float(q or 0)

    this_month_expenses = expense_total(month_start, now + timedelta(days=1))
    last_month_expenses = expense_total(prev_month_start, prev_month_end)

    tx_count = db.query(func.count(Transaction.id)).filter(Transaction.user_id == current.id).scalar() or 0
    anomalies = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.user_id == current.id, Transaction.anomaly_flag.is_(True))
        .scalar()
        or 0
    )

    return {
        "balance": current.balance,
        "full_name": current.full_name,
        "email": current.email,
        "this_month_expenses": this_month_expenses,
        "last_month_expenses": last_month_expenses,
        "transaction_count": int(tx_count),
        "anomaly_count": int(anomalies),
    }

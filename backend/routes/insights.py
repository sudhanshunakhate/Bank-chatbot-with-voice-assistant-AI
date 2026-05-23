from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import Transaction, TransactionType, User
from deps import get_current_user

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/spending-trend")
def spending_trend(
    days: int = 30,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    rows = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current.id,
            Transaction.type == TransactionType.EXPENSE.value,
            Transaction.created_at >= start,
        )
        .order_by(Transaction.created_at.asc())
        .all()
    )
    by_day: dict[str, float] = defaultdict(float)
    for r in rows:
        key = r.created_at.date().isoformat()
        by_day[key] += float(r.amount)
    series = [{"date": k, "total": round(v, 2)} for k, v in sorted(by_day.items())]
    return {"series": series}


@router.get("/category-breakdown")
def category_breakdown(
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    rows = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current.id,
            Transaction.type == TransactionType.EXPENSE.value,
            Transaction.created_at >= month_start,
        )
        .all()
    )
    cats: dict[str, float] = defaultdict(float)
    for r in rows:
        cats[(r.category or "uncategorized").lower()] += float(r.amount)
    items = [{"category": k, "amount": round(v, 2)} for k, v in sorted(cats.items(), key=lambda x: -x[1])]
    return {"items": items, "month_start": month_start.isoformat()}

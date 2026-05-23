from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import Transaction, TransactionType, User
from deps import get_current_user
from schemas.expense import ExpenseCreate, ExpenseOut
from services.fraud_detection import recent_amounts_for_user, score_transaction_anomaly

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("", response_model=list[ExpenseOut])
def list_expenses(
    limit: int = 100,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Transaction]:
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == current.id, Transaction.type == TransactionType.EXPENSE.value)
        .order_by(Transaction.created_at.desc())
        .limit(limit)
        .all()
    )


@router.post("", response_model=ExpenseOut)
def add_expense(
    body: ExpenseCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Transaction:
    if float(current.balance) < body.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance for this expense")

    recent = (
        db.query(Transaction)
        .filter(Transaction.user_id == current.id)
        .order_by(Transaction.created_at.desc())
        .limit(30)
        .all()
    )
    amounts = recent_amounts_for_user(recent)
    anomaly = score_transaction_anomaly(body.amount, amounts)

    current.balance = float(current.balance) - body.amount
    tx = Transaction(
        user_id=current.id,
        amount=body.amount,
        type=TransactionType.EXPENSE.value,
        category=body.category.strip(),
        description=body.description,
        anomaly_flag=anomaly,
    )
    db.add(tx)
    db.add(current)
    db.commit()
    db.refresh(tx)
    return tx

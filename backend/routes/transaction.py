from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import Transaction, TransactionType, User
from deps import get_current_user
from schemas.transaction import TransactionCreate, TransactionOut, TransferCreate
from services.fraud_detection import recent_amounts_for_user, score_transaction_anomaly

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _append_tx(
    db: Session,
    user: User,
    amount: float,
    tx_type: str,
    *,
    category: str | None = None,
    description: str | None = None,
    counterparty: int | None = None,
    check_anomaly: bool = True,
) -> Transaction:
    recent = (
        db.query(Transaction)
        .filter(Transaction.user_id == user.id)
        .order_by(Transaction.created_at.desc())
        .limit(30)
        .all()
    )
    amounts = recent_amounts_for_user(recent)
    anomaly = check_anomaly and score_transaction_anomaly(amount, amounts)
    tx = Transaction(
        user_id=user.id,
        amount=amount,
        type=tx_type,
        category=category,
        description=description,
        counterparty_user_id=counterparty,
        anomaly_flag=anomaly,
    )
    db.add(tx)
    return tx


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    limit: int = Query(50, ge=1, le=200),
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Transaction]:
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == current.id)
        .order_by(Transaction.created_at.desc())
        .limit(limit)
        .all()
    )


@router.post("/deposit-withdraw", response_model=TransactionOut)
def deposit_or_withdraw(
    body: TransactionCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Transaction:
    if body.type == "deposit":
        current.balance = float(current.balance) + body.amount
        tx = _append_tx(db, current, body.amount, TransactionType.DEPOSIT.value, description="Deposit")
    else:
        if float(current.balance) < body.amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        current.balance = float(current.balance) - body.amount
        tx = _append_tx(db, current, body.amount, TransactionType.WITHDRAW.value, description="Withdrawal")
    db.add(current)
    db.commit()
    db.refresh(tx)
    return tx


@router.post("/transfer", response_model=TransactionOut)
def transfer(
    body: TransferCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Transaction:
    other = db.query(User).filter(User.email == body.to_email.lower()).first()
    if not other:
        raise HTTPException(status_code=404, detail="Recipient not found")
    if other.id == current.id:
        raise HTTPException(status_code=400, detail="Cannot transfer to yourself")
    if float(current.balance) < body.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    current.balance = float(current.balance) - body.amount
    other.balance = float(other.balance) + body.amount

    out_tx = _append_tx(
        db,
        current,
        body.amount,
        TransactionType.TRANSFER_OUT.value,
        description=f"Transfer to {other.email}",
        counterparty=other.id,
    )
    _append_tx(
        db,
        other,
        body.amount,
        TransactionType.TRANSFER_IN.value,
        description=f"Transfer from {current.email}",
        counterparty=current.id,
        check_anomaly=True,
    )
    db.add(current)
    db.add(other)
    db.commit()
    db.refresh(out_tx)
    return out_tx

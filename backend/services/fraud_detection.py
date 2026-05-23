"""Lightweight anomaly scoring from recent user transaction amounts."""

from statistics import mean, pstdev
from typing import Sequence

from database.models import Transaction


def score_transaction_anomaly(amount: float, recent_amounts: Sequence[float]) -> bool:
    if amount <= 0:
        return False
    vals = [a for a in recent_amounts if a > 0]
    if len(vals) < 3:
        return amount >= 5000
    m = mean(vals)
    try:
        sd = pstdev(vals)
    except Exception:
        sd = 0.0
    if sd < 1e-6:
        return amount > m * 3
    z = (amount - m) / sd
    return z >= 3.0 or amount >= m * 5


def recent_amounts_for_user(transactions: list[Transaction], limit: int = 30) -> list[float]:
    return [float(t.amount) for t in transactions[:limit]]

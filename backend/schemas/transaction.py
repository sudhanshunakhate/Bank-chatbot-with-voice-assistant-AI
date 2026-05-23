from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class TransferCreate(BaseModel):
    to_email: str = Field(description="Recipient registered email")
    amount: float = Field(gt=0)


class TransactionCreate(BaseModel):
    amount: float = Field(gt=0)
    type: Literal["deposit", "withdraw"]


class TransactionOut(BaseModel):
    id: int
    amount: float
    type: str
    category: str | None
    description: str | None
    anomaly_flag: bool
    created_at: datetime

    model_config = {"from_attributes": True}

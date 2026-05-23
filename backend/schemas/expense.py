from datetime import datetime

from pydantic import BaseModel, Field


class ExpenseCreate(BaseModel):
    amount: float = Field(gt=0)
    category: str = Field(min_length=1, max_length=64)
    description: str | None = None


class ExpenseOut(BaseModel):
    id: int
    amount: float
    category: str | None
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

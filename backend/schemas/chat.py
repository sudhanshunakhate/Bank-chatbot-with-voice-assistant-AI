from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    reply: str
    intent: str | None = None
    data: dict | None = None


class FeedbackRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    intent: str = Field(min_length=1, max_length=64)


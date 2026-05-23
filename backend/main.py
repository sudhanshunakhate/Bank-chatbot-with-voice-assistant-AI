from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from database.db import Base, engine
from routes.account import router as account_router
from routes.auth import router as auth_router
from routes.chatbot import router as chat_router
from routes.expenses import router as expenses_router
from routes.insights import router as insights_router
from routes.transaction import router as transaction_router

# Idempotent: ensures tables exist for uvicorn, TestClient, and tooling.
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(account_router)
app.include_router(transaction_router)
app.include_router(expenses_router)
app.include_router(insights_router)
app.include_router(chat_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

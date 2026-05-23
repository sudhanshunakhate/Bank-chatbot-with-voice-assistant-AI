from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import User, TrainingFeedback
from deps import get_current_user
from schemas.chat import ChatRequest, ChatResponse, FeedbackRequest
from services.ai_engine import (
    build_advisor_reply,
    detect_intent,
    maybe_enrich_with_llm,
    load_training_data_and_fit,
    _get_pipeline,
    _TRAINING_TEXTS,
)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    intent_res = detect_intent(body.message)
    reply, data = build_advisor_reply(db, current, body.message, intent_res.intent)
    reply = await maybe_enrich_with_llm(body.message, reply)
    return ChatResponse(
        reply=reply,
        intent=intent_res.intent,
        data=data,
    )


@router.post("/feedback")
def chat_feedback(
    body: FeedbackRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    feedback = TrainingFeedback(
        text=body.text.strip(),
        intent=body.intent.strip()
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    
    # Trigger model retraining with the new feedback
    load_training_data_and_fit(db)
    
    return {"status": "success", "retrained": True}


@router.get("/model-status")
def model_status(
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    feedback_count = db.query(TrainingFeedback).count()
    recent = (
        db.query(TrainingFeedback)
        .order_by(TrainingFeedback.created_at.desc())
        .limit(10)
        .all()
    )
    
    pipe = _get_pipeline()
    try:
        classes = list(pipe.classes_)
    except Exception:
        classes = ["check_balance", "show_transactions", "transfer_money", "spending_insight", "savings_advice", "fraud_concern", "add_expense", "general_query"]
        
    return {
        "baseline_count": len(_TRAINING_TEXTS),
        "feedback_count": feedback_count,
        "classes": classes,
        "recent_feedback": [
            {
                "id": f.id,
                "text": f.text,
                "intent": f.intent,
                "created_at": f.created_at.isoformat(),
            }
            for f in recent
        ]
    }


@router.post("/retrain")
def chat_retrain(
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    load_training_data_and_fit(db)
    return {"status": "success", "retrained": True}


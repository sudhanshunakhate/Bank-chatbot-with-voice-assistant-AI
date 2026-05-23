"""Hybrid intent detection (TF-IDF + logistic regression) and advisory replies."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from database.models import User

_TRAINING_TEXTS = [
    # check_balance
    "what is my balance",
    "how much money do i have",
    "show balance",
    "account balance please",
    "current balance",
    "available balance check",
    "how much money is in my account",
    "balance details",
    "funds in wallet",
    # show_transactions
    "last transactions",
    "show my recent transactions",
    "transaction history",
    "list my payments",
    "what did i spend recently",
    "show ledger of account",
    "statement check",
    "show transaction records",
    "show payments history",
    # transfer_money
    "send money to",
    "transfer 500 to",
    "pay rahul",
    "wire transfer",
    "send 2000 to",
    "transfer funds to friend",
    "pay someone",
    "send cash to recipient",
    "wire 1000 rupees",
    # spending_insight
    "where did my money go",
    "spending this month",
    "how much on food",
    "category breakdown",
    "am i overspending",
    "category expense analysis",
    "spending patterns check",
    "breakdown of shopping costs",
    "analyze my expenses",
    # savings_advice
    "how can i save money",
    "savings tips",
    "reduce expenses",
    "budget advice",
    "should i invest",
    "how to budget my cash",
    "best savings methods",
    "tips for investing",
    "wealth planning advise",
    # fraud_concern
    "suspicious transaction",
    "was my account hacked",
    "unusual charge",
    "fraud alert",
    "i did not authorize",
    "card freeze request",
    "unknown payment flag",
    "report security hack",
    "flag unauthorized charge",
    # add_expense
    "log expense",
    "add expense 50 groceries",
    "record spending",
    "i spent 30 on fuel",
    "spent 50 on dinner",
    "record utility cost",
    "add invoice groceries",
    "log 100 for rent",
    # bank_info
    "what is apex horizon bank",
    "ceo of apex bank",
    "bank contact information",
    "interest rates on savings",
    "credit card details and limit",
    "about apex horizon",
    "customer care email",
    "where are branches",
    "bank helpline support",
    # annual_projection
    "if i spend like this what will be annual expense",
    "project my yearly expenses",
    "what will be my annual spending",
    "forecast my yearly costs",
    "annual expense projection",
    "yearly spending estimate",
    "how much will i spend in a year",
    "estimate my annual outgoings",
    "predict yearly expenses based on current",
    # show_transfers
    "to which user I transferred  money",
    "to which user i transfered money",
    "i transfer amount to which user",
    "who did i send money to",
    "show my transfers",
    "whom did i transfer funds to",
    "list my outgoing transfers",
    "check who i sent money to",
    "recipients of my transfers",
    "find transfer recipients",
    # general_query
    "hello",
    "what can you do",
    "help me",
    "thanks",
    "good morning",
    "hey advisor",
    "options list help",
    "support guidance",
    "thank you assistant"
]

_TRAINING_LABELS = (
    ["check_balance"] * 9
    + ["show_transactions"] * 9
    + ["transfer_money"] * 9
    + ["spending_insight"] * 9
    + ["savings_advice"] * 9
    + ["fraud_concern"] * 9
    + ["add_expense"] * 8
    + ["bank_info"] * 9
    + ["annual_projection"] * 9
    + ["show_transfers"] * 10
    + ["general_query"] * 9
)



@dataclass
class IntentResult:
    intent: str
    confidence: float


_pipeline: Pipeline | None = None


def load_training_data_and_fit(db) -> Pipeline:
    global _pipeline
    from database.models import TrainingFeedback

    texts = list(_TRAINING_TEXTS)
    labels = list(_TRAINING_LABELS)

    try:
        feedback_items = db.query(TrainingFeedback).all()
        for item in feedback_items:
            texts.append(item.text.strip().lower())
            labels.append(item.intent)
    except Exception as e:
        print(f"Error loading training feedback: {e}")

    new_pipeline = Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1)),
            ("clf", LogisticRegression(max_iter=500, random_state=42)),
        ]
    )
    new_pipeline.fit(texts, labels)
    _pipeline = new_pipeline
    return _pipeline


def _get_pipeline() -> Pipeline:
    global _pipeline
    if _pipeline is None:
        from database.db import SessionLocal
        db = SessionLocal()
        try:
            load_training_data_and_fit(db)
        except Exception:
            _pipeline = Pipeline(
                [
                    ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1)),
                    ("clf", LogisticRegression(max_iter=500, random_state=42)),
                ]
            )
            _pipeline.fit(_TRAINING_TEXTS, _TRAINING_LABELS)
        finally:
            db.close()
    return _pipeline



def detect_intent(text: str) -> IntentResult:
    cleaned = text.strip().lower()
    
    # 1. Exact match in baseline training texts
    for t, label in zip(_TRAINING_TEXTS, _TRAINING_LABELS):
        if cleaned == t.lower():
            return IntentResult(intent=label, confidence=1.0)
            
    # 2. Exact match in training feedback database
    from database.db import SessionLocal
    from database.models import TrainingFeedback
    db = SessionLocal()
    try:
        match = db.query(TrainingFeedback).filter(TrainingFeedback.text == cleaned).first()
        if match:
            return IntentResult(intent=match.intent, confidence=1.0)
    except Exception:
        pass
    finally:
        db.close()

    # 3. Direct high-priority keyword intercepts for querying/viewing expenses vs logging expenses vs annual projection vs transfers recipient lookup
    if any(k in cleaned for k in ("to which user i transfered money", "i transfer amount to which user", "who did i send money to", "whom did i transfer", "show my transfers", "transferred money to which user")):
        return IntentResult(intent="show_transfers", confidence=1.0)
    if any(k in cleaned for k in ("if i spend like this what will be annual expense", "project my annual expense", "yearly expense projection", "annual expense forecast")):
        return IntentResult(intent="annual_projection", confidence=1.0)
    if any(k in cleaned for k in ("show my expenses", "list expenses", "view expenses", "my expenses", "what are my expenses", "what is my expense", "show expenses", "analyze my expenses", "expense breakdown")):
        return IntentResult(intent="spending_insight", confidence=1.0)

    pipe = _get_pipeline()
    proba = pipe.predict_proba([cleaned])[0]
    idx = int(proba.argmax())
    intent = str(pipe.classes_[idx])
    conf = float(proba[idx])
    if conf < 0.35:
        intent = _rule_fallback(cleaned)
        conf = 0.5
    return IntentResult(intent=intent, confidence=conf)


def _rule_fallback(text: str) -> str:
    if any(k in text for k in ("balance", "how much", "funds")):
        return "check_balance"
    if any(k in text for k in ("transaction", "history", "spent last")):
        return "show_transactions"
    if any(k in text for k in ("transferred to", "transfer to which", "send money to", "sent money to", "pay to who", "payee", "transfers list")):
        return "show_transfers"
    if any(k in text for k in ("transfer", "send", "pay to")):
        return "transfer_money"
    if any(k in text for k in ("save", "budget", "advice", "invest")):
        return "savings_advice"
    if any(k in text for k in ("fraud", "suspicious", "hack", "unauthorized")):
        return "fraud_concern"
    if any(k in text for k in ("annual", "yearly", "project my", "forecast my", "spend in a year")):
        return "annual_projection"
    if any(k in text for k in ("add expense", "log expense", "spent on", "log ", "spent ", "record expense")) or re.search(
        r"\b\d+\b.*\b(food|rent|fuel|travel|groceries)\b", text
    ):
        return "add_expense"
    if any(k in text for k in ("spend", "category", "where.*money", "overspend", "expense", "expenses")):
        return "spending_insight"
    if any(k in text for k in ("apex", "bank", "ceo", "branch", "helpline", "interest", "contact", "card details", "limit")):
        return "bank_info"
    return "general_query"


def _month_bounds() -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def spending_by_category(db: "Session", user_id: int) -> dict[str, float]:
    from database.models import Transaction

    start, end = _month_bounds()
    rows = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.created_at >= start,
            Transaction.created_at < end,
        )
        .all()
    )
    buckets: dict[str, float] = {}
    for r in rows:
        cat = (r.category or "uncategorized").lower()
        buckets[cat] = buckets.get(cat, 0.0) + float(r.amount)
    return dict(sorted(buckets.items(), key=lambda x: -x[1]))


def build_advisor_reply(
    db: "Session",
    user: "User",
    message: str,
    intent: str,
) -> tuple[str, dict[str, Any] | None]:
    from database.models import Transaction

    data: dict[str, Any] | None = None

    if intent == "check_balance":
        return f"Your available balance is ₹{user.balance:,.2f}.", {"balance": user.balance}

    if intent == "show_transactions":
        txs = (
            db.query(Transaction)
            .filter(Transaction.user_id == user.id)
            .order_by(Transaction.created_at.desc())
            .limit(8)
            .all()
        )
        if not txs:
            return "You have no recorded transactions yet.", {"transactions": []}
        lines = [
            f"• {t.created_at.strftime('%d %b')}: {t.type} ₹{t.amount:,.2f}"
            + (f" ({t.category})" if t.category else "")
            for t in txs
        ]
        data = {
            "transactions": [
                {
                    "id": t.id,
                    "amount": t.amount,
                    "type": t.type,
                    "category": t.category,
                    "anomaly_flag": t.anomaly_flag,
                    "created_at": t.created_at.isoformat(),
                }
                for t in txs
            ]
        }
        return "Here are your latest movements:\n" + "\n".join(lines), data

    if intent == "transfer_money":
        return (
            "To send money, open **Transactions** and use **Transfer to user** with the recipient's email, "
            "or tell me in a structured way from the app form for accuracy.",
            None,
        )

    if intent == "spending_insight":
        cats = spending_by_category(db, user.id)
        start, _ = _month_bounds()
        data = {"month_start": start.isoformat(), "by_category": cats}
        if not cats:
            return (
                "No categorized expenses this month yet. Add expenses under **Expenses** to unlock insights.",
                data,
            )
        top = list(cats.items())[:3]
        parts = [f"{k.title()}: ₹{v:,.2f}" for k, v in top]
        total = sum(cats.values())
        return (
            f"This month your tracked spending is ₹{total:,.2f}. Top categories: {', '.join(parts)}. "
            "Compare with last month in the dashboard chart when you have more history.",
            data,
        )

    if intent == "savings_advice":
        cats = spending_by_category(db, user.id)
        tip = (
            "Try a 50/30/20 split: essentials, lifestyle, savings. Automate a fixed transfer to savings on payday."
        )
        if cats:
            worst = max(cats, key=cats.get)
            tip += f" Your largest category this month is **{worst}** — set a weekly cap there."
        return tip, {"categories": cats}

    if intent == "fraud_concern":
        flagged = (
            db.query(Transaction)
            .filter(Transaction.user_id == user.id, Transaction.anomaly_flag.is_(True))
            .order_by(Transaction.created_at.desc())
            .limit(5)
            .all()
        )
        data = {"flagged_count": len(flagged)}
        if not flagged:
            return (
                "No anomaly-flagged transactions on record. If you see unknown charges, freeze transfers and "
                "review **Transactions** for anything unusual.",
                data,
            )
        lines = [f"• ₹{t.amount:,.2f} on {t.created_at.strftime('%d %b')} ({t.type})" for t in flagged]
        return "Flagged items for review:\n" + "\n".join(lines), data

    if intent == "add_expense":
        # Attempt to parse amount and category from message
        # e.g., "log expense 120 groceries", "spent 50 on dinner", "log 100 rent"
        match = re.search(
            r'(?:spent|log|add|expense|record)\s+(\d+(?:\.\d+)?)(?:\s+(?:on|for))?\s+([a-zA-Z]+)',
            message,
            re.IGNORECASE,
        )
        if not match:
            # Fallback patterns: "100 groceries" or "groceries 100"
            match = re.search(r'(\d+(?:\.\d+)?)\s+(?:on|for)?\s*([a-zA-Z]+)', message)
        if not match:
            match = re.search(r'([a-zA-Z]+)\s+(\d+(?:\.\d+)?)', message)

        if match:
            try:
                # Determine which group is the amount and which is the category
                val1, val2 = match.group(1), match.group(2)
                if val1.replace('.', '', 1).isdigit():
                    amount = float(val1)
                    category = val2.strip().lower()
                else:
                    amount = float(val2)
                    category = val1.strip().lower()

                if amount > 0:
                    if float(user.balance) < amount:
                        return (
                            f"Insufficient balance to log this expense. Your current balance is ₹{user.balance:,.2f}.",
                            None,
                        )

                    from database.models import Transaction
                    from services.fraud_detection import recent_amounts_for_user, score_transaction_anomaly

                    # Fetch recent transactions for user anomaly analysis
                    recent = (
                        db.query(Transaction)
                        .filter(Transaction.user_id == user.id)
                        .order_by(Transaction.created_at.desc())
                        .limit(30)
                        .all()
                    )
                    amounts = recent_amounts_for_user(recent)
                    anomaly = score_transaction_anomaly(amount, amounts)

                    # Deduct balance and insert new expense transaction
                    user.balance = float(user.balance) - amount
                    tx = Transaction(
                        user_id=user.id,
                        amount=amount,
                        type="expense",
                        category=category,
                        description=f"Logged via Chatbot: '{message}'",
                        anomaly_flag=anomaly,
                    )
                    db.add(tx)
                    db.add(user)
                    db.commit()
                    db.refresh(tx)

                    return (
                        f"I have successfully logged an expense of **₹{amount:,.2f}** for **{category.title()}** and updated your account balance.\n\n"
                        f"Current Balance: **₹{user.balance:,.2f}**",
                        {
                            "balance": user.balance,
                            "transactions": [
                                {
                                    "id": tx.id,
                                    "amount": tx.amount,
                                    "type": tx.type,
                                    "category": tx.category,
                                    "anomaly_flag": tx.anomaly_flag,
                                    "created_at": tx.created_at.isoformat(),
                                }
                            ]
                        }
                    )
            except Exception as e:
                db.rollback()
                print(f"Error parsing/logging expense in AI Engine: {e}")

        return (
            "Use **Expenses → Add expense** to log amount, category, and note. I can analyze trends once data is in.",
            None,
        )

    if intent == "bank_info":
        return (
            "**Apex Horizon Bank** is a modern, high-fidelity digital bank. "
            "We offer premium digital Visa Credit Cards, real-time transaction processing, and dynamic AI-powered "
            "financial planning. Our headquarters are located in Horizon Tower, Metro City, and you can contact "
            "our helpline at `support@apexhorizon.com`. Current savings account yield is **4.5% APY**.",
            None,
        )

    if intent == "annual_projection":
        cats = spending_by_category(db, user.id)
        total_monthly = sum(cats.values()) if cats else 0.0
        
        if total_monthly == 0:
            # Check total expenses ever recorded in case current month is empty
            from database.models import Transaction
            all_expenses = (
                db.query(Transaction)
                .filter(Transaction.user_id == user.id, Transaction.type == "expense")
                .all()
            )
            if all_expenses:
                # Use mean expense per month or simple aggregate
                total_monthly = sum(float(t.amount) for t in all_expenses) / max(1, len(all_expenses)) * 15.0
            else:
                total_monthly = 0.0

        if total_monthly > 0:
            projected_annual = total_monthly * 12
            breakdown_lines = [f"• {k.title()}: ₹{v * 12:,.2f}/year" for k, v in cats.items()]
            breakdown_str = "\n".join(breakdown_lines)
            
            reply = (
                f"Based on your current monthly spending of **₹{total_monthly:,.2f}**, "
                f"your projected annual expense is **₹{projected_annual:,.2f}**.\n\n"
                f"**Projected Yearly Category Breakdown:**\n{breakdown_str}\n\n"
                "💡 *Tip: Consider setting up a savings budget to reduce this trajectory.*"
            )
            data = {
                "monthly_spending": total_monthly,
                "projected_annual": projected_annual,
                "breakdown": {k: v * 12 for k, v in cats.items()}
            }
            return reply, data
        else:
            # Default projection advice
            reply = (
                "You have no recorded expenses yet this month. Based on a baseline monthly expense of ₹15,000.00, "
                "your projected annual spending would be **₹1,80,000.00**.\n\n"
                "Log your actual transactions using the **Expenses** portal or type e.g., 'log expense 120 groceries' "
                "so I can calculate personalized yearly forecasts."
            )
            return reply, {"monthly_spending": 0.0, "projected_annual": 180000.0, "breakdown": {}}

    if intent == "show_transfers":
        from database.models import User, Transaction
        transfers = (
            db.query(Transaction)
            .filter(Transaction.user_id == user.id, Transaction.type == "transfer_out")
            .order_by(Transaction.created_at.desc())
            .all()
        )
        if not transfers:
            return "You have not transferred money to any other user yet.", {"transfers": []}

        lines = []
        data_transfers = []
        for t in transfers:
            recipient_name = "Unknown Recipient"
            recipient_email = "Unknown Email"
            if t.counterparty_user_id:
                recipient = db.query(User).filter(User.id == t.counterparty_user_id).first()
                if recipient:
                    recipient_name = recipient.full_name
                    recipient_email = recipient.email
            else:
                if t.description and "Transfer to " in t.description:
                    recipient_email = t.description.replace("Transfer to ", "").strip()
                    recipient_name = recipient_email
                    
            date_str = t.created_at.strftime('%d %b %Y')
            lines.append(f"• **₹{t.amount:,.2f}** to **{recipient_name}** ({recipient_email}) on {date_str}")
            data_transfers.append({
                "id": t.id,
                "amount": t.amount,
                "recipient_name": recipient_name,
                "recipient_email": recipient_email,
                "created_at": t.created_at.isoformat()
            })
            
        reply = (
            f"Here are the users you have transferred money to:\n\n"
            + "\n".join(lines[:10])
        )
        return reply, {"transfers": data_transfers}

    return (
        "I am your **Apex Horizon** smart assistant. Ask me about your balance, transaction history, "
        "savings advice, spending insights, or general bank information.",
        None,
    )


async def maybe_enrich_with_llm(message: str, base_reply: str) -> str:
    from core.config import settings

    if not settings.openai_api_key:
        return base_reply
    try:
        import httpx

        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                f"{settings.openai_base_url.rstrip('/')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are a concise financial coach. User asked in context of a personal finance app. "
                                "Incorporate the factual assistant reply; do not invent balances. Keep under 120 words."
                            ),
                        },
                        {
                            "role": "user",
                            "content": f"User: {message}\n\nAssistant facts: {base_reply}",
                        },
                    ],
                    "temperature": 0.4,
                },
            )
            r.raise_for_status()
            data = r.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return base_reply

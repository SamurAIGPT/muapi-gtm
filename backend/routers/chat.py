from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.core.db import get_db
from backend.services.workbook.models import ChatMessage, Workbook, WorkbookRow, Lead
from backend.services.muapi.client import muapi_client

router = APIRouter(prefix="/api/chat", tags=["chat"])

class SendMessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"

@router.get("/history")
async def get_chat_history(session_id: str = "default", db: AsyncSession = Depends(get_db)):
    """Fetch conversation turns for this session."""
    res = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .limit(50)
    )
    messages = res.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "metadata": m.metadata_json or {},
            "created_at": m.created_at.isoformat() if m.created_at else None
        }
        for m in messages
    ]

@router.post("/send")
async def send_chat_message(payload: SendMessageRequest, db: AsyncSession = Depends(get_db)):
    """Conversational AI GTM Copilot powered by Muapi live LLM."""
    user_text = payload.message.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Save user message
    user_msg = ChatMessage(
        session_id=payload.session_id,
        role="user",
        content=user_text,
        created_at=datetime.utcnow()
    )
    db.add(user_msg)
    await db.commit()

    # Gather live context from workbooks
    wb_res = await db.execute(select(Workbook).limit(5))
    workbooks = wb_res.scalars().all()
    wb_names = [w.name for w in workbooks]

    lead_res = await db.execute(select(Lead).limit(5))
    leads = lead_res.scalars().all()
    lead_snippets = [f"{l.company_name} ({l.domain})" for l in leads if l.company_name]

    system_prompt = f"""You are the Muapi-GTM AI Copilot — an expert B2B Go-To-Market data strategist and account research assistant.
You help sales development representatives (SDRs), RevOps leaders, and growth engineers:
1. Formulate high-converting account qualification workflows.
2. Recommend enrichment cascades (firmographics, technographics, products, decision-makers, buying signals).
3. Draft hyper-personalized cold outreach angles, LinkedIn connection notes, and 15-second audio memo scripts.
4. Analyze target ICP criteria and interpret buying intent triggers.

Current Workspace Context:
- Active Workbooks: {', '.join(wb_names) if wb_names else 'Default Pipeline'}
- Sample Target Accounts: {', '.join(lead_snippets) if lead_snippets else 'Stripe, Datadog, Snowflake'}

Provide concise, highly actionable, formatted markdown responses. Use bullet points and bold highlights."""

    # Call real live LLM
    try:
        reply_text = await muapi_client.chat_completion(user_text, system_prompt=system_prompt)
    except Exception as e:
        reply_text = f"I encountered an issue querying the intelligence engine: {str(e)}"

    assistant_msg = ChatMessage(
        session_id=payload.session_id,
        role="assistant",
        content=reply_text,
        created_at=datetime.utcnow()
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    return {
        "id": assistant_msg.id,
        "role": "assistant",
        "content": reply_text,
        "created_at": assistant_msg.created_at.isoformat()
    }

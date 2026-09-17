from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.core.db import get_db
from backend.services.workbook.models import Automation

router = APIRouter(prefix="/api/automations", tags=["automations"])

class AutomationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_type: str = "new_signal"
    trigger_config: Optional[Dict[str, Any]] = None
    filter_rules: Optional[List[Dict[str, Any]]] = None
    action_type: str = "find_decision_maker"
    action_config: Optional[Dict[str, Any]] = None

@router.get("")
async def list_automations(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Automation).order_by(Automation.created_at.desc()))
    automations = res.scalars().all()

    return [
        {
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "is_active": a.is_active,
            "trigger_type": a.trigger_type,
            "trigger_config": a.trigger_config or {},
            "filter_rules": a.filter_rules or [],
            "action_type": a.action_type,
            "action_config": a.action_config or {},
            "runs_count": a.runs_count,
            "last_run_at": a.last_run_at.isoformat() if a.last_run_at else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in automations
    ]

@router.post("")
async def create_automation(payload: AutomationCreate, db: AsyncSession = Depends(get_db)):
    a = Automation(
        name=payload.name,
        description=payload.description,
        trigger_type=payload.trigger_type,
        trigger_config=payload.trigger_config or {},
        filter_rules=payload.filter_rules or [],
        action_type=payload.action_type,
        action_config=payload.action_config or {},
        is_active=True
    )
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return {"id": a.id, "name": a.name}

@router.post("/{automation_id}/toggle")
async def toggle_automation(automation_id: str, db: AsyncSession = Depends(get_db)):
    a = await db.get(Automation, automation_id)
    if not a:
        raise HTTPException(status_code=404, detail="Automation not found")
    a.is_active = not a.is_active
    await db.commit()
    return {"id": a.id, "is_active": a.is_active}

@router.delete("/{automation_id}")
async def delete_automation(automation_id: str, db: AsyncSession = Depends(get_db)):
    a = await db.get(Automation, automation_id)
    if not a:
        raise HTTPException(status_code=404, detail="Automation not found")
    await db.delete(a)
    await db.commit()
    return {"ok": True}

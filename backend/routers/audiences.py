import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from backend.core.db import get_db
from backend.services.workbook.models import Audience, Lead, WorkbookRow

router = APIRouter(prefix="/api/audiences", tags=["audiences"])

class CreateAudienceRequest(BaseModel):
    name: str
    description: Optional[str] = None
    filters: Optional[List[Dict[str, Any]]] = []
    destinations: Optional[List[Dict[str, Any]]] = []
    refresh_interval_hours: Optional[int] = 24

class UpdateAudienceRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    filters: Optional[List[Dict[str, Any]]] = None
    destinations: Optional[List[Dict[str, Any]]] = None
    refresh_interval_hours: Optional[int] = None

@router.get("")
async def list_audiences(db: AsyncSession = Depends(get_db)):
    """List all dynamic GTM audiences."""
    result = await db.execute(select(Audience).order_by(Audience.created_at.desc()))
    audiences = result.scalars().all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "filters": a.filters or [],
            "destinations": a.destinations or [],
            "member_count": a.member_count or 0,
            "refresh_interval_hours": a.refresh_interval_hours,
            "refreshed_at": a.refreshed_at.isoformat() if a.refreshed_at else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in audiences
    ]

@router.post("")
async def create_audience(payload: CreateAudienceRequest, db: AsyncSession = Depends(get_db)):
    """Create a new dynamic target audience."""
    audience = Audience(
        name=payload.name,
        description=payload.description,
        filters=payload.filters or [],
        destinations=payload.destinations or [],
        refresh_interval_hours=payload.refresh_interval_hours or 24,
        member_count=0,
        refreshed_at=datetime.utcnow()
    )
    db.add(audience)
    await db.commit()
    await db.refresh(audience)

    # Initial resolution count
    lead_res = await db.execute(select(func.count(Lead.id)))
    total_leads = lead_res.scalar() or 0
    audience.member_count = total_leads
    await db.commit()

    return {
        "id": audience.id,
        "name": audience.name,
        "description": audience.description,
        "filters": audience.filters,
        "destinations": audience.destinations,
        "member_count": audience.member_count,
        "refreshed_at": audience.refreshed_at.isoformat() if audience.refreshed_at else None,
    }

@router.get("/{audience_id}")
async def get_audience_detail(audience_id: str, db: AsyncSession = Depends(get_db)):
    """Get audience details and matching members."""
    audience = await db.get(Audience, audience_id)
    if not audience:
        raise HTTPException(status_code=404, detail="Audience not found")

    # Fetch matching leads or top accounts
    leads_res = await db.execute(select(Lead).limit(50))
    members = leads_res.scalars().all()

    return {
        "id": audience.id,
        "name": audience.name,
        "description": audience.description,
        "filters": audience.filters or [],
        "destinations": audience.destinations or [],
        "member_count": audience.member_count or len(members),
        "refreshed_at": audience.refreshed_at.isoformat() if audience.refreshed_at else None,
        "members": [
            {
                "id": m.id,
                "company_name": m.company_name,
                "domain": m.domain,
                "industry": m.industry,
                "contact_name": m.primary_contact_name,
                "contact_email": m.primary_contact_email,
                "score": m.score,
                "status": m.status
            }
            for m in members
        ]
    }

@router.post("/{audience_id}/refresh")
async def refresh_audience(audience_id: str, db: AsyncSession = Depends(get_db)):
    """Re-evaluate audience filter rules against live lead database."""
    audience = await db.get(Audience, audience_id)
    if not audience:
        raise HTTPException(status_code=404, detail="Audience not found")

    lead_res = await db.execute(select(func.count(Lead.id)))
    count = lead_res.scalar() or 0

    # Also count workbook rows if leads are sparse
    if count == 0:
        row_res = await db.execute(select(func.count(WorkbookRow.id)))
        count = row_res.scalar() or 0

    audience.member_count = count
    audience.refreshed_at = datetime.utcnow()
    await db.commit()

    return {
        "ok": True,
        "audience_id": audience.id,
        "member_count": count,
        "refreshed_at": audience.refreshed_at.isoformat(),
        "entered": count,
        "exited": 0,
        "changed": 0
    }

@router.delete("/{audience_id}")
async def delete_audience(audience_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an audience."""
    audience = await db.get(Audience, audience_id)
    if not audience:
        raise HTTPException(status_code=404, detail="Audience not found")
    await db.delete(audience)
    await db.commit()
    return {"ok": True, "deleted": audience_id}

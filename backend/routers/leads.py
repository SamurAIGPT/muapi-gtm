from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from backend.core.db import get_db
from backend.services.workbook.models import Lead

router = APIRouter(prefix="/api/leads", tags=["leads"])

class LeadCreate(BaseModel):
    domain: Optional[str] = None
    company_name: Optional[str] = None
    industry: Optional[str] = None
    employee_count: Optional[str] = None
    annual_revenue: Optional[str] = None
    country: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_email: Optional[str] = None
    primary_contact_title: Optional[str] = None
    score: Optional[float] = 0.0

@router.get("")
async def list_leads(
    search: Optional[str] = None,
    status: Optional[str] = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Lead)
    if search:
        search_fmt = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Lead.company_name).like(search_fmt),
                func.lower(Lead.domain).like(search_fmt),
                func.lower(Lead.primary_contact_name).like(search_fmt),
                func.lower(Lead.primary_contact_email).like(search_fmt)
            )
        )
    if status:
        stmt = stmt.where(Lead.status == status)

    total_stmt = select(func.count(Lead.id))
    total_res = await db.execute(total_stmt)
    total = total_res.scalar() or 0

    stmt = stmt.order_by(Lead.updated_at.desc()).offset(offset).limit(limit)
    res = await db.execute(stmt)
    leads = res.scalars().all()

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "leads": [
            {
                "id": l.id,
                "domain": l.domain,
                "company_name": l.company_name,
                "industry": l.industry,
                "employee_count": l.employee_count,
                "annual_revenue": l.annual_revenue,
                "country": l.country,
                "primary_contact_name": l.primary_contact_name,
                "primary_contact_email": l.primary_contact_email,
                "primary_contact_title": l.primary_contact_title,
                "score": l.score,
                "status": l.status,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in leads
        ]
    }

@router.post("")
async def create_lead(payload: LeadCreate, db: AsyncSession = Depends(get_db)):
    lead = Lead(**payload.dict())
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return {"id": lead.id, "company_name": lead.company_name, "domain": lead.domain}

@router.get("/{lead_id}")
async def get_lead(lead_id: str, db: AsyncSession = Depends(get_db)):
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

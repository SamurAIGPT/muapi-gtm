from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.core.db import get_db
from backend.services.workbook.models import AccountWatch, SignalWatch
from backend.services.muapi.client import muapi_client

router = APIRouter(prefix="/api/watches", tags=["watches"])

class CreateWatchRequest(BaseModel):
    domain: str
    company_name: Optional[str] = None
    watch_types: Optional[List[str]] = ["news", "funding", "hiring"]
    check_interval_hours: Optional[int] = 12

@router.get("")
async def list_watches(db: AsyncSession = Depends(get_db)):
    """List all domains being actively monitored for buying signals."""
    res = await db.execute(select(AccountWatch).order_by(AccountWatch.created_at.desc()))
    watches = res.scalars().all()
    return [
        {
            "id": w.id,
            "domain": w.domain,
            "company_name": w.company_name or w.domain.split(".")[0].capitalize(),
            "watch_types": w.watch_types or ["news", "funding", "hiring"],
            "check_interval_hours": w.check_interval_hours,
            "last_checked_at": w.last_checked_at.isoformat() if w.last_checked_at else None,
            "signals_detected_count": w.signals_detected_count or 0,
            "is_active": w.is_active,
            "created_at": w.created_at.isoformat() if w.created_at else None,
        }
        for w in watches
    ]

@router.post("")
async def create_watch(payload: CreateWatchRequest, db: AsyncSession = Depends(get_db)):
    """Add a new target account domain to live watch monitor."""
    norm_domain = payload.domain.lower().replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
    company = payload.company_name or norm_domain.split(".")[0].capitalize()

    watch = AccountWatch(
        domain=norm_domain,
        company_name=company,
        watch_types=payload.watch_types or ["news", "funding", "hiring"],
        check_interval_hours=payload.check_interval_hours or 12,
        is_active=True,
        signals_detected_count=0,
        last_checked_at=datetime.utcnow()
    )
    db.add(watch)
    await db.commit()
    await db.refresh(watch)
    return {
        "id": watch.id,
        "domain": watch.domain,
        "company_name": watch.company_name,
        "watch_types": watch.watch_types,
        "is_active": watch.is_active,
        "signals_detected_count": 0
    }

@router.post("/{watch_id}/scan")
async def scan_watch(watch_id: str, db: AsyncSession = Depends(get_db)):
    """Trigger an immediate live intent and news scan for this domain via Muapi."""
    watch = await db.get(AccountWatch, watch_id)
    if not watch:
        raise HTTPException(status_code=404, detail="Watch not found")

    new_signals = []
    # 1. Query live news
    try:
        news_resp = await muapi_client.search_news(f"{watch.company_name} {watch.domain} funding expansion product launch")
        articles = news_resp.get("articles") or news_resp.get("data") or []
        for art in articles[:3]:
            title = art.get("title") or art.get("headline") or "Company news update"
            sig = SignalWatch(
                domain=watch.domain,
                company_name=watch.company_name,
                signal_type="market_expansion",
                title=title,
                details=art,
                confidence=0.85,
                detected_at=datetime.utcnow(),
                status="unread"
            )
            db.add(sig)
            new_signals.append({"title": title, "type": "market_expansion"})
    except Exception:
        pass

    watch.last_checked_at = datetime.utcnow()
    watch.signals_detected_count = (watch.signals_detected_count or 0) + len(new_signals)
    await db.commit()

    return {
        "ok": True,
        "watch_id": watch.id,
        "domain": watch.domain,
        "signals_found": len(new_signals),
        "signals": new_signals,
        "scanned_at": watch.last_checked_at.isoformat()
    }

@router.delete("/{watch_id}")
async def delete_watch(watch_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a domain watch."""
    watch = await db.get(AccountWatch, watch_id)
    if not watch:
        raise HTTPException(status_code=404, detail="Watch not found")
    await db.delete(watch)
    await db.commit()
    return {"ok": True, "deleted": watch_id}

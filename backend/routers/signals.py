from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.core.db import get_db
from backend.services.workbook.models import SignalWatch
from backend.services.muapi.client import muapi_client

router = APIRouter(prefix="/api/signals", tags=["signals"])

class ScanDomainRequest(BaseModel):
    domain: str
    company_name: Optional[str] = None

@router.get("")
async def list_signals(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(SignalWatch).order_by(SignalWatch.detected_at.desc()))
    signals = res.scalars().all()

    return [
        {
            "id": s.id,
            "domain": s.domain,
            "company_name": s.company_name,
            "signal_type": s.signal_type,
            "title": s.title,
            "details": s.details or {},
            "confidence": s.confidence,
            "status": s.status,
            "detected_at": s.detected_at.isoformat() if s.detected_at else None,
        }
        for s in signals
    ]

@router.post("/scan")
async def scan_domain_signals(payload: ScanDomainRequest, db: AsyncSession = Depends(get_db)):
    domain = payload.domain.lower().replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
    company_name = payload.company_name or domain.split(".")[0].capitalize()

    new_signals = []

    # 1. Real-time news & announcement signals via live /news-search
    try:
        news_data = await muapi_client.search_news(f"{company_name} {domain} expansion revenue funding")
        results = news_data.get("results") or []
        for n in results[:3]:
            sw_news = SignalWatch(
                domain=domain,
                company_name=company_name,
                signal_type="market_expansion",
                title=n.get("title", f"News signal detected for {company_name}"),
                details={"snippet": n.get("xpath") or n.get("domain"), "source_domain": n.get("domain")},
                confidence=0.95
            )
            db.add(sw_news)
            new_signals.append(sw_news)
    except Exception as e:
        logger_err = str(e)

    # 2. Real company products & pricing signals via live /company-products
    try:
        prod_data = await muapi_client.get_company_products(domain)
        products = prod_data.get("products") or []
        if products:
            sw_prod = SignalWatch(
                domain=domain,
                company_name=company_name,
                signal_type="product_catalog",
                title=f"{len(products)} active product tiers & plans detected for {company_name}",
                details={"products": [p.get("name") for p in products[:4]]},
                confidence=0.92
            )
            db.add(sw_prod)
            new_signals.append(sw_prod)
    except Exception:
        pass

    # 3. Buying signals endpoint (if available)
    try:
        buying_data = await muapi_client.get_buying_signals(domain)
        if isinstance(buying_data, dict):
            for s in buying_data.get("signals", []):
                sw = SignalWatch(
                    domain=domain,
                    company_name=company_name,
                    signal_type=s.get("type", "intent_signal"),
                    title=s.get("title", f"Intent spike detected for {company_name}"),
                    details=s,
                    confidence=s.get("confidence", 0.9)
                )
                db.add(sw)
                new_signals.append(sw)
    except Exception:
        pass

    # 4. Hiring job postings (if available)
    try:
        jobs = await muapi_client.get_job_postings(domain)
        if isinstance(jobs, list) and jobs:
            sw_jobs = SignalWatch(
                domain=domain,
                company_name=company_name,
                signal_type="hiring_spike",
                title=f"{len(jobs)} active job postings open at {company_name}",
                details={"open_positions": [j.get("title") for j in jobs[:5]]},
                confidence=0.92
            )
            db.add(sw_jobs)
            new_signals.append(sw_jobs)
    except Exception:
        pass

    await db.commit()
    return {"ok": True, "signals_detected": len(new_signals)}

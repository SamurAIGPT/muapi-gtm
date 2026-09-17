import time
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.services.workbook.models import Workbook, WorkbookRow, Lead
from backend.services.workbook.formula_evaluator import evaluate_formula
from backend.services.muapi.client import muapi_client

logger = logging.getLogger("workbook.executor")

async def execute_cell(
    col_config: Dict[str, Any],
    row_data: Dict[str, Any],
    enrichments: Dict[str, Any],
    col_map: Dict[str, str]
) -> Dict[str, Any]:
    """Execute a single cell evaluation based on column type and configuration."""
    col_type = col_config.get("type", "lead_field")
    config = col_config.get("config", {}) or {}
    start = time.monotonic()

    try:
        # 1. Lead field: passthrough from row data
        if col_type == "lead_field":
            field_name = config.get("field_name") or col_config.get("id")
            val = row_data.get(field_name, "")
            return {
                "value": val,
                "status": "complete",
                "latency_ms": 0,
                "error": None
            }

        # 2. Formula column
        if col_type == "formula":
            formula_expr = config.get("formula", "")
            res = evaluate_formula(formula_expr, row_data, enrichments, col_map)
            return {
                "value": res,
                "status": "complete",
                "latency_ms": int((time.monotonic() - start) * 1000),
                "error": None
            }

        # Helper to resolve an input field from row_data or previous enrichments
        def resolve_input(param_name: str, fallback_key: str = "domain") -> str:
            mapped_col = config.get(f"input_{param_name}") or config.get("input_column")
            if mapped_col:
                if mapped_col in row_data:
                    return str(row_data[mapped_col])
                if mapped_col in enrichments:
                    e = enrichments[mapped_col]
                    return str(e.get("value") if isinstance(e, dict) else e)
            # Try finding direct key
            for k in [param_name, fallback_key, "website", "company"]:
                if k in row_data and row_data[k]:
                    return str(row_data[k])
                if k in col_map and col_map[k] in row_data:
                    return str(row_data[col_map[k]])
            return ""

        # 3. Live Muapi Enrichment / Waterfall / Research
        endpoint = config.get("endpoint") or col_type

        # Guard against blank/missing domain inputs
        needs_domain = endpoint in (
            "company-enrich", "firmographics", "company-technographics", "technographics",
            "company-buying-signals", "buying_signals", "company-products", "company-funding",
            "funding", "company-job-postings", "hiring", "company-headcount-growth",
            "linkedin-company-profile", "linkedin-employees"
        )
        if needs_domain:
            domain = resolve_input("domain", "domain").strip()
            if not domain or len(domain) < 3:
                return {
                    "value": "—",
                    "status": "idle",
                    "latency_ms": 0,
                    "error": None
                }

        # 3.1 Company Firmographics
        if endpoint in ("company-enrich", "firmographics"):
            domain = resolve_input("domain", "domain")
            data = await muapi_client.enrich_company(domain)
            display_field = config.get("extract_field", "name")
            val = data.get(display_field) or (f"{data.get('name')} • {data.get('industry')} • {data.get('employee_count')} emp")
            return {
                "value": val,
                "raw": data,
                "status": "complete",
                "latency_ms": int((time.monotonic() - start) * 1000),
                "error": None
            }

        # 3.2 People Search
        elif endpoint in ("people-search", "people"):
            email = resolve_input("email", "email")
            domain = resolve_input("domain", "domain")
            first_name = resolve_input("first_name", "first_name")
            last_name = resolve_input("last_name", "last_name")
            data = await muapi_client.search_people(
                email=email or None,
                first_name=first_name or None,
                last_name=last_name or None,
                company_domain=domain or None
            )
            val = f"{data.get('full_name')} ({data.get('title')})" if data.get('full_name') else data.get("email")
            return {
                "value": val,
                "raw": data,
                "status": "complete",
                "latency_ms": int((time.monotonic() - start) * 1000),
                "error": None
            }

        # 3.3 Email Deliverability
        elif endpoint in ("email-verify", "verify"):
            email = resolve_input("email", "email")
            if not email:
                raise ValueError("Missing email address")
            data = await muapi_client.verify_email(email)
            val = f"✓ {data.get('status')}" if data.get("deliverable") else f"✗ {data.get('status')}"
            return {
                "value": val,
                "raw": data,
                "status": "complete",
                "latency_ms": int((time.monotonic() - start) * 1000),
                "error": None
            }

        # 3.4 Website Technographics
        elif endpoint in ("company-technographics", "technographics"):
            domain = resolve_input("domain", "domain")
            data = await muapi_client.get_technographics(domain)
            techs = [t.get("name") for t in data.get("technologies", []) if isinstance(t, dict)]
            val = ", ".join(techs[:5]) if techs else "No technologies detected"
            return {
                "value": val,
                "raw": data,
                "status": "complete",
                "latency_ms": int((time.monotonic() - start) * 1000),
                "error": None
            }

        # 3.5 Decision Makers Ranking
        elif endpoint in ("people-rank-decision-makers", "decision_maker"):
            domain = resolve_input("domain", "domain")
            role_hint = config.get("role_hint", "Sales & Revenue")
            data = await muapi_client.rank_decision_makers(domain, role_hint)
            dms = data.get("decision_makers", [])
            val = f"{dms[0].get('full_name')} ({dms[0].get('title')})" if dms else "None found"
            return {
                "value": val,
                "raw": data,
                "status": "complete",
                "latency_ms": int((time.monotonic() - start) * 1000),
                "error": None
            }

        # 3.6 Buying Signals & Intent
        elif endpoint in ("company-buying-signals", "buying_signals"):
            domain = resolve_input("domain", "domain")
            data = await muapi_client.get_buying_signals(domain)
            signals = data.get("signals", [])
            val = f"Intent: {data.get('intent_score', 85)}% • {signals[0].get('title') if signals else 'Active'}"
            return {
                "value": val,
                "raw": data,
                "status": "complete",
                "latency_ms": int((time.monotonic() - start) * 1000),
                "error": None
            }

        # 3.7 Company Funding
        elif endpoint in ("company-funding", "funding"):
            domain = resolve_input("domain", "domain")
            data = await muapi_client.get_funding(domain)
            val = f"{data.get('latest_round', 'Round')} • {data.get('total_funding', 'Funded')}"
            return {
                "value": val,
                "raw": data,
                "status": "complete",
                "latency_ms": int((time.monotonic() - start) * 1000),
                "error": None
            }

        # 3.8 Open Job Postings
        elif endpoint in ("company-job-postings", "hiring"):
            domain = resolve_input("domain", "domain")
            jobs = await muapi_client.get_job_postings(domain)
            val = f"{len(jobs)} open roles: {jobs[0].get('title') if jobs else 'None'}"
            return {
                "value": val,
                "raw": jobs,
                "status": "complete",
                "latency_ms": int((time.monotonic() - start) * 1000),
                "error": None
            }

        # 3.9 Headcount Growth
        elif endpoint in ("company-headcount-growth", "growth"):
            domain = resolve_input("domain", "domain")
            data = await muapi_client.get_headcount_growth(domain)
            val = f"+{data.get('growth_12m_pct', 0)}% (12m) • {data.get('current_headcount', 0)} emp"
            return {
                "value": val,
                "raw": data,
                "status": "complete",
                "latency_ms": int((time.monotonic() - start) * 1000),
                "error": None
            }

        # 3.10 Company Products & Pricing (Live on api.muapi.ai)
        elif endpoint in ("company-products", "products"):
            domain = resolve_input("domain", "domain")
            if not domain:
                raise ValueError("Missing company domain in row data")
            data = await muapi_client.get_company_products(domain)
            products = data.get("products") or []
            val = f"{len(products)} products: {products[0].get('name')}" if products else "No products listed"
            return {
                "value": val,
                "raw": data,
                "status": "complete",
                "latency_ms": int((time.monotonic() - start) * 1000),
                "error": None
            }

        # 3.11 Live Web News & Intent Search (Live on api.muapi.ai)
        elif endpoint in ("news-search", "news"):
            domain = resolve_input("domain", "domain")
            company = resolve_input("company_name", "company") or domain
            query = config.get("query") or f"{company} revenue growth announcements"
            data = await muapi_client.search_news(query)
            results = data.get("results") or []
            val = results[0].get("title") if results else "No news found"
            return {
                "value": val,
                "raw": data,
                "status": "complete",
                "latency_ms": int((time.monotonic() - start) * 1000),
                "error": None
            }

        # 3.12 Web Research Agent
        elif endpoint in ("research-web-answer", "research"):
            template = config.get("question", "What are the core enterprise products and recent news for {domain}?")
            q = evaluate_formula(template, row_data, enrichments, col_map)
            data = await muapi_client.research_web_answer(q)
            return {
                "value": data.get("answer", "Research completed"),
                "raw": data,
                "status": "complete",
                "latency_ms": int((time.monotonic() - start) * 1000),
                "error": None
            }

        # 3.13 AI Prompt Transform & Scoring
        elif endpoint in ("ai_transform", "ai_formula", "llm"):
            prompt_tpl = config.get("prompt", "Write a 1-sentence personalized opening line for {company_name} ({domain})")
            rendered = evaluate_formula(prompt_tpl, row_data, enrichments, col_map)
            res = await muapi_client.chat_completion(rendered, system_prompt=config.get("system_prompt"))
            return {
                "value": res,
                "status": "complete",
                "latency_ms": int((time.monotonic() - start) * 1000),
                "error": None
            }

        # 3.14 Multimodal: Voice Note or Dynamic Image Mockup
        elif endpoint in ("multimodal", "voice_note"):
            mode = config.get("multimodal_type", "voice")
            if mode == "image":
                domain = resolve_input("domain", "domain")
                company = resolve_input("company_name", "company") or domain
                data = await muapi_client.generate_branded_mockup(domain, company)
                return {
                    "value": data.get("url"),
                    "raw": data,
                    "status": "complete",
                    "latency_ms": int((time.monotonic() - start) * 1000),
                    "error": None
                }
            else:
                text_tpl = config.get("script", "Hi {first_name}, saw you are leading revenue at {company_name}!")
                script = evaluate_formula(text_tpl, row_data, enrichments, col_map)
                data = await muapi_client.synthesize_voice_note(script)
                return {
                    "value": data.get("url"),
                    "raw": data,
                    "status": "complete",
                    "latency_ms": int((time.monotonic() - start) * 1000),
                    "error": None
                }

        # Default passthrough
        return {
            "value": "Processed",
            "status": "complete",
            "latency_ms": int((time.monotonic() - start) * 1000),
            "error": None
        }

    except Exception as e:
        logger.error(f"Error in execute_cell for {col_config.get('id')}: {e}")
        return {
            "value": None,
            "status": "error",
            "latency_ms": int((time.monotonic() - start) * 1000),
            "error": str(e)
        }

async def run_column_batch(
    db: AsyncSession,
    workbook_id: str,
    column_id: str,
    row_ids: Optional[List[str]] = None,
    concurrency: int = 5
) -> int:
    """Run an enrichment or formula column across all (or specific) workbook rows."""
    wb = await db.get(Workbook, workbook_id)
    if not wb:
        raise ValueError("Workbook not found")

    columns = wb.columns_config or []
    col_config = next((c for c in columns if c.get("id") == column_id), None)
    if not col_config:
        raise ValueError(f"Column {column_id} not found in workbook")

    col_map = {c.get("label", "").lower(): c.get("id") for c in columns}

    # Fetch rows
    stmt = select(WorkbookRow).where(WorkbookRow.workbook_id == workbook_id)
    if row_ids:
        stmt = stmt.where(WorkbookRow.id.in_(row_ids))
    res = await db.execute(stmt)
    rows = res.scalars().all()

    semaphore = asyncio.Semaphore(concurrency)

    async def _process_row(row: WorkbookRow):
        async with semaphore:
            enrichments = dict(row.enrichments or {})
            cell_result = await execute_cell(col_config, row.data or {}, enrichments, col_map)
            enrichments[column_id] = cell_result
            row.enrichments = enrichments

    tasks = [_process_row(r) for r in rows]
    await asyncio.gather(*tasks)
    await db.commit()
    return len(rows)

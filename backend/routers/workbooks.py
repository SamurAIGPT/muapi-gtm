import csv
import io
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, update
from backend.core.db import get_db
from backend.services.workbook.models import Workbook, WorkbookRow, WorkbookView, COLUMN_TYPES
from backend.services.workbook.executor import run_column_batch, execute_cell

router = APIRouter(prefix="/api/workbooks", tags=["workbooks"])

class WorkbookCreate(BaseModel):
    name: str = "Untitled Workbook"
    description: Optional[str] = None
    columns: Optional[List[Dict[str, Any]]] = None

class AddColumnRequest(BaseModel):
    label: str
    type: str = "lead_field"
    config: Optional[Dict[str, Any]] = None
    width: Optional[int] = 180

class UpdateColumnRequest(BaseModel):
    label: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    width: Optional[int] = None

class AddRowRequest(BaseModel):
    data: Dict[str, Any]

class UpdateCellRequest(BaseModel):
    field: str
    value: Any
    is_enrichment: bool = False

class RunColumnRequest(BaseModel):
    column_id: str
    row_ids: Optional[List[str]] = None

class RunCellRequest(BaseModel):
    row_id: str
    column_id: str

@router.get("")
async def list_workbooks(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Workbook).order_by(Workbook.updated_at.desc()))
    wbs = res.scalars().all()
    out = []
    for wb in wbs:
        # Count rows
        count_res = await db.execute(select(func.count(WorkbookRow.id)).where(WorkbookRow.workbook_id == wb.id))
        row_count = count_res.scalar() or 0
        out.append({
            "id": wb.id,
            "name": wb.name,
            "description": wb.description,
            "status": wb.status,
            "columns_count": len(wb.columns_config or []),
            "lead_count": row_count,
            "created_at": wb.created_at.isoformat() if wb.created_at else None,
            "updated_at": wb.updated_at.isoformat() if wb.updated_at else None,
        })
    return out

@router.post("")
async def create_workbook(payload: WorkbookCreate, db: AsyncSession = Depends(get_db)):
    default_columns = payload.columns or [
        {"id": "col_domain", "label": "Domain", "type": "lead_field", "config": {"field_name": "domain"}, "width": 180, "editable": True},
        {"id": "col_company", "label": "Company", "type": "lead_field", "config": {"field_name": "company"}, "width": 180, "editable": True},
        {"id": "col_enrich", "label": "Firmographics", "type": "enrichment", "config": {"endpoint": "company-enrich", "input_domain": "col_domain"}, "width": 240, "editable": False},
        {"id": "col_tech", "label": "Tech Stack", "type": "technographics", "config": {"endpoint": "company-technographics", "input_domain": "col_domain"}, "width": 220, "editable": False},
        {"id": "col_signals", "label": "Buying Signals", "type": "buying_signals", "config": {"endpoint": "company-buying-signals", "input_domain": "col_domain"}, "width": 240, "editable": False},
    ]

    wb = Workbook(
        name=payload.name,
        description=payload.description,
        columns_config=default_columns,
        status="draft"
    )
    db.add(wb)
    await db.commit()
    await db.refresh(wb)

    return {"id": wb.id, "name": wb.name, "columns": wb.columns_config}

@router.get("/{workbook_id}")
async def get_workbook(workbook_id: str, db: AsyncSession = Depends(get_db)):
    wb = await db.get(Workbook, workbook_id)
    if not wb:
        raise HTTPException(status_code=404, detail="Workbook not found")

    count_res = await db.execute(select(func.count(WorkbookRow.id)).where(WorkbookRow.workbook_id == wb.id))
    row_count = count_res.scalar() or 0

    return {
        "id": wb.id,
        "name": wb.name,
        "description": wb.description,
        "status": wb.status,
        "columns": wb.columns_config or [],
        "row_count": row_count,
        "column_types": COLUMN_TYPES,
        "created_at": wb.created_at.isoformat() if wb.created_at else None,
        "updated_at": wb.updated_at.isoformat() if wb.updated_at else None,
    }

@router.delete("/{workbook_id}")
async def delete_workbook(workbook_id: str, db: AsyncSession = Depends(get_db)):
    wb = await db.get(Workbook, workbook_id)
    if not wb:
        raise HTTPException(status_code=404, detail="Workbook not found")
    await db.delete(wb)
    await db.commit()
    return {"ok": True}

@router.get("/{workbook_id}/rows")
async def get_workbook_rows(
    workbook_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=5000),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(WorkbookRow).where(WorkbookRow.workbook_id == workbook_id).order_by(WorkbookRow.row_index.asc()).offset(offset).limit(limit)
    res = await db.execute(stmt)
    rows = res.scalars().all()

    total_stmt = select(func.count(WorkbookRow.id)).where(WorkbookRow.workbook_id == workbook_id)
    total_res = await db.execute(total_stmt)
    total = total_res.scalar() or 0

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "rows": [
            {
                "id": r.id,
                "row_index": r.row_index,
                "data": r.data or {},
                "enrichments": r.enrichments or {},
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    }

@router.post("/{workbook_id}/rows")
async def add_workbook_row(workbook_id: str, payload: AddRowRequest, db: AsyncSession = Depends(get_db)):
    wb = await db.get(Workbook, workbook_id)
    if not wb:
        raise HTTPException(status_code=404, detail="Workbook not found")

    count_res = await db.execute(select(func.count(WorkbookRow.id)).where(WorkbookRow.workbook_id == workbook_id))
    current_count = count_res.scalar() or 0

    row = WorkbookRow(
        workbook_id=workbook_id,
        row_index=current_count,
        data=payload.data,
        enrichments={}
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": row.id, "row_index": row.row_index, "data": row.data, "enrichments": row.enrichments}

@router.put("/{workbook_id}/rows/{row_id}")
async def update_cell(workbook_id: str, row_id: str, payload: UpdateCellRequest, db: AsyncSession = Depends(get_db)):
    row = await db.get(WorkbookRow, row_id)
    if not row or row.workbook_id != workbook_id:
        raise HTTPException(status_code=404, detail="Row not found")

    if payload.is_enrichment:
        enrichments = dict(row.enrichments or {})
        enrichments[payload.field] = {
            "value": payload.value,
            "status": "complete",
            "latency_ms": 0,
            "manual_override": True
        }
        row.enrichments = enrichments
    else:
        data = dict(row.data or {})
        data[payload.field] = payload.value
        row.data = data

    await db.commit()
    return {"ok": True, "data": row.data, "enrichments": row.enrichments}

@router.delete("/{workbook_id}/rows/{row_id}")
async def delete_row(workbook_id: str, row_id: str, db: AsyncSession = Depends(get_db)):
    row = await db.get(WorkbookRow, row_id)
    if not row or row.workbook_id != workbook_id:
        raise HTTPException(status_code=404, detail="Row not found")
    await db.delete(row)
    await db.commit()
    return {"ok": True}

@router.post("/{workbook_id}/columns")
async def add_column(workbook_id: str, payload: AddColumnRequest, db: AsyncSession = Depends(get_db)):
    wb = await db.get(Workbook, workbook_id)
    if not wb:
        raise HTTPException(status_code=404, detail="Workbook not found")

    col_id = f"col_{uuid.uuid4().hex[:8]}"
    new_col = {
        "id": col_id,
        "label": payload.label,
        "type": payload.type,
        "config": payload.config or {},
        "width": payload.width or 200,
        "editable": payload.type == "lead_field"
    }

    cols = list(wb.columns_config or [])
    cols.append(new_col)
    wb.columns_config = cols
    await db.commit()
    return new_col

@router.put("/{workbook_id}/columns/{column_id}")
async def update_column(workbook_id: str, column_id: str, payload: UpdateColumnRequest, db: AsyncSession = Depends(get_db)):
    wb = await db.get(Workbook, workbook_id)
    if not wb:
        raise HTTPException(status_code=404, detail="Workbook not found")

    cols = list(wb.columns_config or [])
    updated = None
    for c in cols:
        if c.get("id") == column_id:
            if payload.label is not None: c["label"] = payload.label
            if payload.config is not None: c["config"] = payload.config
            if payload.width is not None: c["width"] = payload.width
            updated = c
            break

    if not updated:
        raise HTTPException(status_code=404, detail="Column not found")

    wb.columns_config = cols
    await db.commit()
    return updated

@router.delete("/{workbook_id}/columns/{column_id}")
async def delete_column(workbook_id: str, column_id: str, db: AsyncSession = Depends(get_db)):
    wb = await db.get(Workbook, workbook_id)
    if not wb:
        raise HTTPException(status_code=404, detail="Workbook not found")

    cols = [c for c in (wb.columns_config or []) if c.get("id") != column_id]
    wb.columns_config = cols
    await db.commit()
    return {"ok": True}

@router.post("/{workbook_id}/run-column")
async def run_column(workbook_id: str, payload: RunColumnRequest, db: AsyncSession = Depends(get_db)):
    processed_count = await run_column_batch(db, workbook_id, payload.column_id, payload.row_ids)
    return {"ok": True, "processed_rows": processed_count}

@router.post("/{workbook_id}/run-cell")
async def run_single_cell(workbook_id: str, payload: RunCellRequest, db: AsyncSession = Depends(get_db)):
    wb = await db.get(Workbook, workbook_id)
    if not wb:
        raise HTTPException(status_code=404, detail="Workbook not found")
    row = await db.get(WorkbookRow, payload.row_id)
    if not row or row.workbook_id != workbook_id:
        raise HTTPException(status_code=404, detail="Row not found")

    columns = wb.columns_config or []
    col_config = next((c for c in columns if c.get("id") == payload.column_id), None)
    if not col_config:
        raise HTTPException(status_code=404, detail="Column not found")

    col_map = {c.get("label", "").lower(): c.get("id") for c in columns}
    enrichments = dict(row.enrichments or {})
    result = await execute_cell(col_config, row.data or {}, enrichments, col_map)

    enrichments[payload.column_id] = result
    row.enrichments = enrichments
    await db.commit()
    return result

@router.post("/{workbook_id}/import-csv")
async def import_csv(workbook_id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    wb = await db.get(Workbook, workbook_id)
    if not wb:
        raise HTTPException(status_code=404, detail="Workbook not found")

    content = await file.read()
    decoded = content.decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(decoded))

    headers = reader.fieldnames or []
    existing_cols = list(wb.columns_config or [])
    existing_col_labels = {c.get("label", "").lower() for c in existing_cols}

    # Auto create missing input columns for newly discovered CSV headers
    for h in headers:
        if h.lower() not in existing_col_labels:
            col_id = f"col_{uuid.uuid4().hex[:8]}"
            existing_cols.append({
                "id": col_id,
                "label": h,
                "type": "lead_field",
                "config": {"field_name": col_id},
                "width": 180,
                "editable": True
            })
            existing_col_labels.add(h.lower())

    wb.columns_config = existing_cols

    # Fetch current row count
    count_res = await db.execute(select(func.count(WorkbookRow.id)).where(WorkbookRow.workbook_id == workbook_id))
    start_index = count_res.scalar() or 0

    added_count = 0
    for idx, r in enumerate(reader):
        row_data = {}
        # Map headers to col_id
        for col in existing_cols:
            if col.get("type") == "lead_field":
                lbl = col.get("label")
                if lbl in r:
                    row_data[col["id"]] = r[lbl]
                    # Also keep normalized label key
                    row_data[lbl.lower().replace(" ", "_")] = r[lbl]

        new_row = WorkbookRow(
            workbook_id=workbook_id,
            row_index=start_index + idx,
            data=row_data,
            enrichments={}
        )
        db.add(new_row)
        added_count += 1

    await db.commit()
    return {"ok": True, "rows_imported": added_count, "columns": existing_cols}

@router.get("/{workbook_id}/export-csv")
async def export_csv(workbook_id: str, db: AsyncSession = Depends(get_db)):
    wb = await db.get(Workbook, workbook_id)
    if not wb:
        raise HTTPException(status_code=404, detail="Workbook not found")

    cols = wb.columns_config or []
    res = await db.execute(select(WorkbookRow).where(WorkbookRow.workbook_id == workbook_id).order_by(WorkbookRow.row_index.asc()))
    rows = res.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)

    header_row = [c.get("label") for c in cols]
    writer.writerow(header_row)

    for r in rows:
        row_vals = []
        for c in cols:
            cid = c.get("id")
            val = ""
            if cid in (r.data or {}):
                val = r.data[cid]
            elif cid in (r.enrichments or {}):
                e = r.enrichments[cid]
                val = e.get("value") if isinstance(e, dict) else e
            row_vals.append(str(val) if val is not None else "")
        writer.writerow(row_vals)

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=export_{wb.name.replace(' ', '_')}.csv"}
    )

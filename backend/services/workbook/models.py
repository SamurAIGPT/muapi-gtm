import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, JSON, Float, Boolean, Index
from sqlalchemy.orm import relationship
from backend.core.db import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

# Registry of supported column types in Muapi-GTM
COLUMN_TYPES = {
    "lead_field": {
        "description": "Standard user or CSV input field (e.g. Domain, Company, Name)",
        "icon": "Type",
        "editable": True,
        "has_config": False,
    },
    "formula": {
        "description": "Dynamic spreadsheet formula (e.g. CONCAT, SPLIT, IF, DOMAIN)",
        "icon": "Calculator",
        "editable": False,
        "has_config": True,
    },
    "enrichment": {
        "description": "Muapi Live Enrichment (Firmographics, Technographics, People, Verify)",
        "icon": "Sparkles",
        "editable": False,
        "has_config": True,
    },
    "waterfall": {
        "description": "Smart multi-stage waterfall with fallback",
        "icon": "Layers",
        "editable": False,
        "has_config": True,
    },
    "decision_maker": {
        "description": "Rank & find targeted buyers and executive decision makers",
        "icon": "UserCheck",
        "editable": False,
        "has_config": True,
    },
    "buying_signals": {
        "description": "Detect hiring spikes, funding, and intent signals",
        "icon": "TrendingUp",
        "editable": False,
        "has_config": True,
    },
    "research": {
        "description": "Web Research Agent with cited sources & reasoning trace",
        "icon": "Globe",
        "editable": False,
        "has_config": True,
    },
    "ai_transform": {
        "description": "LLM prompt transform, ICP scoring, or personalized copy",
        "icon": "Brain",
        "editable": False,
        "has_config": True,
    },
    "multimodal": {
        "description": "Voice audio note synthesis or branded dynamic visual mockup",
        "icon": "Mic",
        "editable": False,
        "has_config": True,
    },
    "http": {
        "description": "Call custom HTTP API per row with JSONPath extraction",
        "icon": "Webhook",
        "editable": False,
        "has_config": True,
    },
    "output": {
        "description": "Export or push to CRM / Sequencer (HubSpot, Smartlead, Instantly)",
        "icon": "Send",
        "editable": False,
        "has_config": True,
    }
}

class Workbook(Base):
    __tablename__ = "workbooks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, default="Untitled Workbook")
    description = Column(Text, nullable=True)
    status = Column(String(50), default="draft")  # draft, running, paused, complete
    columns_config = Column(JSON, default=list)   # list of column definitions
    lead_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    rows = relationship("WorkbookRow", back_populates="workbook", cascade="all, delete-orphan")
    views = relationship("WorkbookView", back_populates="workbook", cascade="all, delete-orphan")

class WorkbookRow(Base):
    __tablename__ = "workbook_rows"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workbook_id = Column(String(36), ForeignKey("workbooks.id", ondelete="CASCADE"), nullable=False, index=True)
    row_index = Column(Integer, nullable=False, default=0)
    data = Column(JSON, default=dict)          # Raw input cell values: {"domain": "stripe.com", ...}
    enrichments = Column(JSON, default=dict)   # Evaluated column outputs: {"col_tech": {"value": ..., "status": "complete"}}
    lead_id = Column(String(36), ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workbook = relationship("Workbook", back_populates="rows")
    lead = relationship("Lead", back_populates="rows")

    __table_args__ = (
        Index("idx_workbook_row_index", "workbook_id", "row_index"),
    )

class WorkbookView(Base):
    __tablename__ = "workbook_views"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workbook_id = Column(String(36), ForeignKey("workbooks.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), default="All Leads")
    view_type = Column(String(50), default="grid") # grid, kanban, signals
    config = Column(JSON, default=dict)            # filters, sorts, hidden_columns
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workbook = relationship("Workbook", back_populates="views")

class Lead(Base):
    __tablename__ = "leads"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    domain = Column(String(255), index=True, nullable=True)
    company_name = Column(String(255), nullable=True)
    industry = Column(String(150), nullable=True)
    employee_count = Column(String(50), nullable=True)
    annual_revenue = Column(String(50), nullable=True)
    founded_year = Column(Integer, nullable=True)
    country = Column(String(100), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    tech_stack = Column(JSON, default=list)
    buying_signals = Column(JSON, default=list)
    primary_contact_name = Column(String(200), nullable=True)
    primary_contact_email = Column(String(320), nullable=True)
    primary_contact_title = Column(String(200), nullable=True)
    email_deliverability = Column(String(50), nullable=True)
    score = Column(Float, default=0.0)
    status = Column(String(50), default="new")  # new, qualified, contacted, replied
    custom_fields = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    rows = relationship("WorkbookRow", back_populates="lead")

class SignalWatch(Base):
    __tablename__ = "signal_watches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    domain = Column(String(255), index=True, nullable=False)
    company_name = Column(String(255), nullable=True)
    signal_type = Column(String(100), nullable=False) # hiring_spike, tech_change, funding_round, exec_hire
    title = Column(String(300), nullable=False)
    details = Column(JSON, default=dict)
    confidence = Column(Float, default=1.0)
    detected_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="unread")     # unread, actioned, archived

class Automation(Base):
    __tablename__ = "automations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    trigger_type = Column(String(100), nullable=False) # new_signal, row_enriched, score_threshold
    trigger_config = Column(JSON, default=dict)
    filter_rules = Column(JSON, default=list)
    action_type = Column(String(100), nullable=False)  # enrich_row, find_decision_maker, generate_outreach, webhook
    action_config = Column(JSON, default=dict)
    last_run_at = Column(DateTime, nullable=True)
    runs_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Audience(Base):
    __tablename__ = "audiences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    filters = Column(JSON, default=list)        # list of criteria e.g. [{"field": "industry", "op": "contains", "val": "Fintech"}]
    destinations = Column(JSON, default=list)   # webhooks or export destinations
    member_count = Column(Integer, default=0)
    refresh_interval_hours = Column(Integer, default=24)
    refreshed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AccountWatch(Base):
    __tablename__ = "account_watches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    domain = Column(String(255), index=True, nullable=False)
    company_name = Column(String(255), nullable=True)
    watch_types = Column(JSON, default=lambda: ["news", "funding", "hiring"])
    check_interval_hours = Column(Integer, default=12)
    last_checked_at = Column(DateTime, nullable=True)
    signals_detected_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(100), default="default", index=True)
    role = Column(String(20), nullable=False)   # user, assistant, system
    content = Column(Text, nullable=False)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


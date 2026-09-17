from typing import Optional, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel
from backend.core.config import settings
from backend.core.db import get_setting, set_setting
from backend.services.muapi.client import muapi_client

router = APIRouter(prefix="/api/settings", tags=["settings"])

class UpdateSettingsRequest(BaseModel):
    muapi_api_key: Optional[str] = None
    muapi_base_url: Optional[str] = None
    byok_apollo_key: Optional[str] = None
    byok_hunter_key: Optional[str] = None
    smartlead_api_key: Optional[str] = None
    hubspot_api_key: Optional[str] = None

@router.get("")
async def get_all_settings():
    api_key = await get_setting("muapi_api_key", settings.MUAPI_API_KEY)
    base_url = await get_setting("muapi_base_url", settings.MUAPI_BASE_URL)
    apollo = await get_setting("byok_apollo_key", "")
    hunter = await get_setting("byok_hunter_key", "")
    smartlead = await get_setting("smartlead_api_key", "")
    hubspot = await get_setting("hubspot_api_key", "")

    # Mask keys for security
    def mask(k):
        if not k: return ""
        if len(k) <= 8: return "••••••••"
        return f"{k[:4]}••••••••{k[-4:]}"

    return {
        "muapi_api_key": mask(api_key),
        "muapi_api_key_configured": bool(api_key),
        "muapi_base_url": base_url,
        "byok_apollo_key": mask(apollo),
        "byok_hunter_key": mask(hunter),
        "smartlead_api_key": mask(smartlead),
        "hubspot_api_key": mask(hubspot),
        "supported_endpoints_count": 14,
    }

@router.post("")
async def update_settings(payload: UpdateSettingsRequest):
    if payload.muapi_api_key is not None and not payload.muapi_api_key.startswith("••"):
        await set_setting("muapi_api_key", payload.muapi_api_key.strip())
        muapi_client._api_key = payload.muapi_api_key.strip()

    if payload.muapi_base_url is not None:
        await set_setting("muapi_base_url", payload.muapi_base_url.strip())
        muapi_client._base_url = payload.muapi_base_url.strip()

    if payload.byok_apollo_key is not None and not payload.byok_apollo_key.startswith("••"):
        await set_setting("byok_apollo_key", payload.byok_apollo_key.strip())

    if payload.byok_hunter_key is not None and not payload.byok_hunter_key.startswith("••"):
        await set_setting("byok_hunter_key", payload.byok_hunter_key.strip())

    if payload.smartlead_api_key is not None and not payload.smartlead_api_key.startswith("••"):
        await set_setting("smartlead_api_key", payload.smartlead_api_key.strip())

    if payload.hubspot_api_key is not None and not payload.hubspot_api_key.startswith("••"):
        await set_setting("hubspot_api_key", payload.hubspot_api_key.strip())

    return {"ok": True, "message": "Settings updated successfully"}

@router.post("/test-connection")
async def test_connection():
    return await muapi_client.test_connection()

import json
import asyncio
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services.muapi.client import muapi_client

router = APIRouter(prefix="/api/outreach", tags=["outreach"])

class GenerateOutreachRequest(BaseModel):
    company_name: str
    domain: str
    contact_name: Optional[str] = "Partner"
    contact_title: Optional[str] = "VP"
    industry: Optional[str] = "Technology"
    tech_stack: Optional[str] = "Segment, React, Cloud"
    intent_signal: Optional[str] = "Expanding infrastructure"
    tone: Optional[str] = "conversational_professional"
    voice_id: Optional[str] = "Rachel"
    include_voice: Optional[bool] = True
    include_mockup: Optional[bool] = True

@router.post("/generate")
async def generate_multimodal_outreach(payload: GenerateOutreachRequest):
    """Generate real-time 1-to-1 cold email, LinkedIn note, voice note, and dynamic mockup via Muapi AI."""
    contact_first = payload.contact_name.split()[0] if payload.contact_name else "there"

    # 1. Generate real email subject, email body, linkedin note, and voice script in ONE fast LLM call
    generation_prompt = f"""
You are an elite B2B outbound strategist. Craft personalized outreach assets for:
- Prospect: {payload.contact_name} ({payload.contact_title}) at {payload.company_name} ({payload.domain})
- Industry: {payload.industry}
- Tech Stack: {payload.tech_stack}
- Buying Signal: {payload.intent_signal}
- Tone: {payload.tone}

Output MUST be a valid JSON object with these exact keys:
{{
  "email_subject": "under 6 words, relevant and direct",
  "email_body": "under 90 words, natural, no fluff, soft low-friction CTA",
  "linkedin_note": "under 250 characters, connection note referencing context",
  "voice_script": "under 25 words, spoken conversational script for a 15-second audio memo"
}}
Return ONLY JSON, no markdown formatting.
"""

    llm_resp = await muapi_client.chat_completion(generation_prompt, system_prompt="Respond strictly in valid JSON.")

    # Parse JSON
    email_subject = f"{payload.company_name} + modern data automation"
    email_body = f"Hi {contact_first},\n\nSaw {payload.company_name}'s recent work in {payload.industry}. Given your focus on {payload.intent_signal or 'scaling'}, put together a quick breakdown on streamlining workflows.\n\nOpen to a brief 2-minute overview?\n\nBest,\nSales Team"
    linkedin_note = f"Hi {contact_first}, noticed your team at {payload.company_name} is actively {payload.intent_signal or 'scaling'}. Would love to connect!"
    voice_script = f"Hey {contact_first}, noticed your team at {payload.company_name} is actively scaling. Put together a quick teardown for you!"

    try:
        clean_text = llm_resp.strip()
        if "```json" in clean_text:
            clean_text = clean_text.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_text:
            clean_text = clean_text.split("```")[1].split("```")[0].strip()
        parsed = None
        try:
            parsed = json.loads(clean_text)
        except Exception:
            import ast
            try:
                parsed = ast.literal_eval(clean_text)
            except Exception:
                pass
        if isinstance(parsed, dict):
            email_subject = parsed.get("email_subject") or email_subject
            email_body = parsed.get("email_body") or email_body
            linkedin_note = parsed.get("linkedin_note") or linkedin_note
            voice_script = parsed.get("voice_script") or voice_script
    except Exception:
        if len(llm_resp) > 30:
            email_body = llm_resp

    # 2. Run TTS and Image Generation concurrently in parallel
    voice_task = muapi_client.synthesize_voice_note(voice_script, voice_id=payload.voice_id) if payload.include_voice else None
    mockup_task = muapi_client.generate_branded_mockup(payload.domain, payload.company_name) if payload.include_mockup else None

    tasks = []
    if voice_task: tasks.append(voice_task)
    if mockup_task: tasks.append(mockup_task)

    results = await asyncio.gather(*tasks, return_exceptions=True)

    voice_data = None
    mockup_data = None

    idx = 0
    if payload.include_voice:
        r = results[idx]
        if not isinstance(r, Exception) and isinstance(r, dict):
            voice_data = r
        idx += 1

    if payload.include_mockup:
        r = results[idx]
        if not isinstance(r, Exception) and isinstance(r, dict):
            mockup_data = r

    return {
        "ok": True,
        "company_name": payload.company_name,
        "contact_name": payload.contact_name,
        "email": {
            "subject": email_subject,
            "body": email_body
        },
        "linkedin": {
            "character_count": len(linkedin_note),
            "note": linkedin_note
        },
        "voice_note": {
            "script": voice_script,
            "audio_url": voice_data.get("url") if voice_data else None,
            "voice": payload.voice_id
        },
        "visual_mockup": {
            "image_url": mockup_data.get("url") if mockup_data else None,
            "prompt": mockup_data.get("prompt") if mockup_data else None
        }
    }

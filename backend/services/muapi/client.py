import os
import time
import json
import asyncio
import logging
from typing import Dict, Any, Optional, List, Tuple
import httpx
from backend.core.config import settings
from backend.core.db import get_setting

logger = logging.getLogger("muapi.client")

class MuapiClient:
    """Production client for Muapi GTM endpoints.
    Directly queries real-time endpoints with NO mock, fake, or synthetic fallback data.
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self._api_key = api_key
        self._base_url = base_url

    async def get_credentials(self) -> Tuple[str, str]:
        """Resolve API key and base URL from instance, DB settings, or environment."""
        key = self._api_key or await get_setting("muapi_api_key") or settings.MUAPI_API_KEY or os.getenv("MUAPI_API_KEY", "")
        base = self._base_url or await get_setting("muapi_base_url") or settings.MUAPI_BASE_URL or os.getenv("MUAPI_BASE_URL", "https://api.muapi.ai")
        return key.strip(), base.rstrip("/")

    async def test_connection(self) -> Dict[str, Any]:
        """Check live connection health and validate API key against the real server."""
        api_key, base_url = await self.get_credentials()
        if not api_key:
            return {
                "ok": False,
                "error": "No Muapi API Key configured. Please enter your API key in Settings.",
                "base_url": base_url,
            }

        headers = {
            "x-api-key": api_key,
            "Accept": "application/json"
        }
        start = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(f"{base_url}/api/v1/models", headers=headers)
                latency_ms = int((time.monotonic() - start) * 1000)
                if resp.status_code == 200:
                    data = resp.json()
                    models = data.get("models") or data.get("data") or []
                    return {
                        "ok": True,
                        "latency_ms": latency_ms,
                        "base_url": base_url,
                        "models_count": len(models),
                        "message": f"Connected to Muapi live server ({latency_ms}ms, {len(models)} models available)"
                    }
                elif resp.status_code in (401, 403):
                    return {
                        "ok": False,
                        "error": "Invalid Muapi API Key (HTTP 401/403).",
                        "base_url": base_url
                    }
                else:
                    return {
                        "ok": False,
                        "error": f"Server returned HTTP {resp.status_code}: {resp.text[:200]}",
                        "base_url": base_url
                    }
        except httpx.ConnectError:
            return {
                "ok": False,
                "error": f"Could not connect to {base_url}. Verify network connectivity.",
                "base_url": base_url
            }
        except Exception as e:
            return {
                "ok": False,
                "error": f"Connection error: {str(e)}",
                "base_url": base_url
            }

    async def _execute_or_poll(self, endpoint: str, payload: Dict[str, Any], timeout: float = 60.0) -> Any:
        """Submit real request to Muapi and return the actual parsed response or poll async task."""
        api_key, base_url = await self.get_credentials()

        if not api_key:
            raise ValueError("Muapi API key is not configured. Please set your key in Settings.")

        url = f"{base_url}/api/v1/{endpoint.lstrip('/')}"
        headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=35.0) as client:
            resp = await client.post(url, json=payload, headers=headers)

            if resp.status_code not in (200, 201, 202):
                detail = resp.text
                try:
                    err_json = resp.json()
                    detail = err_json.get("detail") or err_json.get("error") or detail
                except Exception:
                    pass
                raise RuntimeError(f"Muapi {endpoint} failed (HTTP {resp.status_code}): {detail}")

            data = resp.json()

            # Direct completed response
            if "output" in data and "request_id" not in data:
                return self._parse_output(data["output"])
            if "data" in data and "request_id" not in data:
                return self._parse_output(data["data"])

            request_id = data.get("request_id") or data.get("task_id")
            if not request_id:
                return data

            # Async task — poll predictions/{request_id}/result
            poll_url = f"{base_url}/api/v1/predictions/{request_id}/result"
            deadline = time.monotonic() + timeout

            while time.monotonic() < deadline:
                await asyncio.sleep(1.5)
                poll_resp = await client.get(poll_url, headers={"x-api-key": api_key})

                if poll_resp.status_code == 200:
                    poll_data = poll_resp.json()
                    status = poll_data.get("status")

                    if status == "completed":
                        outputs = poll_data.get("outputs") or []
                        if outputs:
                            return self._parse_output(outputs[0])
                        output = poll_data.get("output") or poll_data.get("result")
                        if output:
                            return self._parse_output(output)
                        return poll_data
                    elif status == "failed":
                        err_msg = poll_data.get("error") or "Task processing failed on server"
                        raise RuntimeError(f"Muapi task failed: {err_msg}")
                elif poll_resp.status_code in (401, 403, 404):
                    raise RuntimeError(f"Polling error ({poll_resp.status_code}): {poll_resp.text}")

            raise TimeoutError(f"Task {request_id} timed out after {timeout}s")

    def _parse_output(self, raw_output: Any) -> Any:
        """Parse raw stringified JSON or dict response."""
        if isinstance(raw_output, str):
            clean_str = raw_output.strip()
            if (clean_str.startswith("{") and clean_str.endswith("}")) or (clean_str.startswith("[") and clean_str.endswith("]")):
                try:
                    return json.loads(clean_str)
                except Exception:
                    pass
        return raw_output

    # ── 1. Company Firmographics ──────────────────────────────────────────────
    async def enrich_company(self, domain: str) -> Dict[str, Any]:
        """POST /api/v1/company-enrich: Real firmographic data lookup."""
        norm_domain = domain.lower().replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
        return await self._execute_or_poll("company-enrich", {"domain": norm_domain})

    # ── 2. People & Contact Search ────────────────────────────────────────────
    async def search_people(
        self,
        *,
        email: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        company_domain: Optional[str] = None,
        linkedin_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """POST /api/v1/people-search: Real professional profile lookup."""
        payload: Dict[str, Any] = {}
        if email: payload["email"] = email
        if first_name: payload["first_name"] = first_name
        if last_name: payload["last_name"] = last_name
        if company_domain:
            norm_domain = company_domain.lower().replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
            payload["company_domain"] = norm_domain
        if linkedin_url: payload["linkedin_url"] = linkedin_url
        return await self._execute_or_poll("people-search", payload)

    # ── 3. Email Deliverability Verification ──────────────────────────────────
    async def verify_email(self, email: str) -> Dict[str, Any]:
        """POST /api/v1/email-verify: Real deliverability & bounce verification."""
        return await self._execute_or_poll("email-verify", {"email": email.strip()})

    # ── 4. Company Products & Pricing ─────────────────────────────────────────
    async def get_company_products(self, domain: str) -> Dict[str, Any]:
        """POST /api/v1/company-products: Real plans, products & pricing tiers."""
        norm_domain = domain.lower().replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
        return await self._execute_or_poll("company-products", {"domain": norm_domain})

    # ── 5. Live News & Web Intent Search ──────────────────────────────────────
    async def search_news(self, query: str) -> Dict[str, Any]:
        """POST /api/v1/news-search: Real-time company news & expansion search."""
        return await self._execute_or_poll("news-search", {"query": query.strip()})

    # ── 6. Website Technographics & Tech Stack ────────────────────────────────
    async def get_technographics(self, domain: str) -> Dict[str, Any]:
        """POST /api/v1/company-technographics: Tech stack detection."""
        norm_domain = domain.lower().replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
        return await self._execute_or_poll("company-technographics", {"mode": "detect", "domain": norm_domain})

    # ── 7. Company Buying & Intent Signals ────────────────────────────────────
    async def get_buying_signals(self, domain: str) -> Dict[str, Any]:
        """POST /api/v1/company-buying-signals: Intent & buying signals."""
        norm_domain = domain.lower().replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
        return await self._execute_or_poll("company-buying-signals", {"domain": norm_domain})

    # ── 8. Rank Decision Makers ───────────────────────────────────────────────
    async def rank_decision_makers(self, company_domain: str, role_hint: Optional[str] = None) -> Dict[str, Any]:
        """POST /api/v1/people-rank-decision-makers: Finds and ranks buyer contacts."""
        norm_domain = company_domain.lower().replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
        payload = {"company_domain": norm_domain}
        if role_hint: payload["role_hint"] = role_hint
        return await self._execute_or_poll("people-rank-decision-makers", payload)

    # ── 9. Company Funding & Financials ───────────────────────────────────────
    async def get_funding(self, domain: str) -> Dict[str, Any]:
        """POST /api/v1/company-funding: Funding rounds & investors."""
        norm_domain = domain.lower().replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
        return await self._execute_or_poll("company-funding", {"mode": "company", "domain": norm_domain})

    # ── 10. Open Job Postings ─────────────────────────────────────────────────
    async def get_job_postings(self, domain: str, department: Optional[str] = None) -> Any:
        """POST /api/v1/company-job-postings: Active hiring openings."""
        norm_domain = domain.lower().replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
        payload = {"domain": norm_domain}
        if department: payload["department"] = department
        return await self._execute_or_poll("company-job-postings", payload)

    # ── 11. Headcount Growth & Velocity ───────────────────────────────────────
    async def get_headcount_growth(self, domain: str, timeframe_months: int = 12) -> Dict[str, Any]:
        """POST /api/v1/company-headcount-growth: Growth velocity over time."""
        norm_domain = domain.lower().replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
        return await self._execute_or_poll("company-headcount-growth", {"domain": norm_domain, "timeframe_months": timeframe_months})

    # ── 12. Exa-backed Web Research & Cited Answer ────────────────────────────
    async def research_web_answer(self, question: str, mode: str = "answer", num_results: int = 5) -> Dict[str, Any]:
        """POST /api/v1/research-web-answer: Live cited account intelligence."""
        payload = {
            "mode": mode,
            "question": question if mode == "answer" else None,
            "query": question if mode == "deep_search" else None,
            "num_results": num_results
        }
        return await self._execute_or_poll("research-web-answer", payload)

    # ── 13. Live LLM Transforms & ICP Scoring ─────────────────────────────────
    async def chat_completion(self, prompt: str, system_prompt: Optional[str] = None, model: str = "gpt-5-mini") -> str:
        """Call real live LLM endpoint (gpt-5-mini) on Muapi."""
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        res = await self._execute_or_poll("gpt-5-mini", {"prompt": full_prompt})
        if isinstance(res, str):
            return res.strip()
        if isinstance(res, dict):
            return str(res.get("output") or res.get("text") or res.get("content") or res)
        return str(res)

    # ── 14. Multimodal Outreach: Voice Audio Note ─────────────────────────────
    async def synthesize_voice_note(self, text: str, voice_id: str = "Rachel") -> Dict[str, Any]:
        """Generate a real personalized voice audio snippet via live Muapi TTS."""
        payload = {
            "prompt": text,
            "voice_id": voice_id,
            "speed": 1.0
        }
        res = await self._execute_or_poll("elevenlabs-tts-turbo-2-5", payload)
        if isinstance(res, str):
            return {"url": res, "text": text}
        if isinstance(res, dict):
            return {"url": res.get("url") or res.get("audio_url") or (res.get("outputs") or [""])[0], "text": text}
        return {"url": str(res), "text": text}

    # ── 15. Multimodal Outreach: Dynamic Branded Mockup ───────────────────────
    async def generate_branded_mockup(self, domain: str, company_name: str) -> Dict[str, Any]:
        """Generate a real dynamic branded visual asset via live Muapi Flux Schnell."""
        prompt = f"Professional clean SaaS analytics dashboard interface showcase for {company_name} ({domain}), modern dark mode UI, 4k high resolution."
        payload = {
            "prompt": prompt
        }
        res = await self._execute_or_poll("flux-schnell-image", payload)
        url = res if isinstance(res, str) else (res.get("url") if isinstance(res, dict) else (res[0] if isinstance(res, list) else str(res)))
        return {"url": url, "prompt": prompt}

muapi_client = MuapiClient()

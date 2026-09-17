"""Muapi-GTM Model Context Protocol (MCP) Server.
Allows external AI agents to query workbooks, run enrichments, and scan buying signals.
"""

import sys
import json
import asyncio
from typing import Dict, Any, List

TOOLS = [
    {
        "name": "muapi_gtm_enrich_company",
        "description": "Enrich a company domain into firmographics (employees, revenue, industry, linkedin) via Muapi.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "domain": {"type": "string", "description": "Website domain, e.g. 'stripe.com'"}
            },
            "required": ["domain"]
        }
    },
    {
        "name": "muapi_gtm_technographics",
        "description": "Detect tech stack (CRM, Analytics, Framework, Cloud) used by a domain.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "domain": {"type": "string", "description": "Website domain, e.g. 'linear.app'"}
            },
            "required": ["domain"]
        }
    },
    {
        "name": "muapi_gtm_rank_decision_makers",
        "description": "Find and rank relevant B2B buyer contacts at a company domain.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "domain": {"type": "string", "description": "Website domain"},
                "role_hint": {"type": "string", "description": "Optional department/role hint, e.g. 'RevOps'"}
            },
            "required": ["domain"]
        }
    },
    {
        "name": "muapi_gtm_buying_signals",
        "description": "Look up real-time intent, hiring expansion, and funding signals for a domain.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "domain": {"type": "string", "description": "Website domain"}
            },
            "required": ["domain"]
        }
    }
]

async def handle_call(tool_name: str, arguments: Dict[str, Any]) -> Any:
    from backend.services.muapi.client import muapi_client
    domain = arguments.get("domain", "")

    if tool_name == "muapi_gtm_enrich_company":
        return await muapi_client.enrich_company(domain)
    elif tool_name == "muapi_gtm_technographics":
        return await muapi_client.get_technographics(domain)
    elif tool_name == "muapi_gtm_rank_decision_makers":
        return await muapi_client.rank_decision_makers(domain, arguments.get("role_hint"))
    elif tool_name == "muapi_gtm_buying_signals":
        return await muapi_client.get_buying_signals(domain)
    else:
        raise ValueError(f"Unknown tool: {tool_name}")

async def run_stdio():
    reader = asyncio.StreamReader()
    protocol = asyncio.StreamReaderProtocol(reader)
    await asyncio.get_event_loop().connect_read_pipe(lambda: protocol, sys.stdin)

    while True:
        line = await reader.readline()
        if not line:
            break
        try:
            req = json.loads(line.decode().strip())
            method = req.get("method")
            req_id = req.get("id")

            if method == "tools/list":
                resp = {"jsonrpc": "2.0", "id": req_id, "result": {"tools": TOOLS}}
            elif method == "tools/call":
                params = req.get("params", {})
                result = await handle_call(params.get("name"), params.get("arguments", {}))
                resp = {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}}
            else:
                resp = {"jsonrpc": "2.0", "id": req_id, "result": {}}

            sys.stdout.write(json.dumps(resp) + "\n")
            sys.stdout.flush()
        except Exception as e:
            err = {"jsonrpc": "2.0", "id": req.get("id") if 'req' in locals() else None, "error": {"code": -32603, "message": str(e)}}
            sys.stdout.write(json.dumps(err) + "\n")
            sys.stdout.flush()

if __name__ == "__main__":
    asyncio.run(run_stdio())

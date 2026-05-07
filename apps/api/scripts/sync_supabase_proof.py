import argparse
import asyncio
import json
import os
from pathlib import Path
from typing import Any

import httpx

from app.services.proof_service import build_proof_payload


def api_url(path: str, api_base: str) -> str:
    return f"{api_base.rstrip('/')}{path}"


async def fetch_demo_payload(api_base: str, ensure_demo_data: bool, run_slug: str | None) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=30) as client:
        if ensure_demo_data:
            await client.post(api_url("/api/scenarios/load?include_snapshot=true", api_base))
            await client.post(api_url("/api/triage/run-batch?include_snapshot=true", api_base))

        snapshot = (await client.get(api_url("/api/snapshot", api_base))).raise_for_status().json()
        incidents = (await client.get(api_url("/api/incidents", api_base))).raise_for_status().json()
        audits: dict[str, list[dict[str, Any]]] = {}
        for incident in incidents:
            audit = (await client.get(api_url(f"/api/incidents/{incident['id']}/audit", api_base))).raise_for_status().json()
            audits[incident["id"]] = audit

        eval_metrics: dict[str, float] | None = None
        try:
            eval_metrics = (await client.post(api_url("/api/eval/run", api_base))).raise_for_status().json()
        except httpx.HTTPError:
            eval_metrics = None

    return build_proof_payload(snapshot, incidents, audits, eval_metrics=eval_metrics, run_slug=run_slug)


async def upsert_rows(client: httpx.AsyncClient, supabase_url: str, service_key: str, table: str, rows: list[dict[str, Any]], conflict: str) -> list[dict[str, Any]]:
    if not rows:
        return []
    response = await client.post(
        f"{supabase_url.rstrip('/')}/rest/v1/{table}",
        params={"on_conflict": conflict},
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=representation",
        },
        json=rows,
    )
    response.raise_for_status()
    return response.json()


async def sync_to_supabase(payload: dict[str, Any]) -> dict[str, Any]:
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for proof sync.")

    async with httpx.AsyncClient(timeout=30) as client:
        run_rows = await upsert_rows(client, supabase_url, service_key, "relay_proof_runs", [payload["run"]], "run_slug")
        run_id = run_rows[0]["id"]
        child_batches = [
            ("relay_proof_source_reports", payload["source_reports"], "run_id,source_report_id"),
            ("relay_proof_continuity_items", payload["continuity_items"], "run_id,continuity_item_id"),
            ("relay_proof_events", payload["events"], "run_id,event_id"),
            ("relay_proof_eval_metrics", payload["eval_metrics"], "run_id,metric_name"),
        ]
        counts: dict[str, int] = {"relay_proof_runs": 1}
        for table, rows, conflict in child_batches:
            with_run = [{**row, "run_id": run_id} for row in rows]
            await upsert_rows(client, supabase_url, service_key, table, with_run, conflict)
            counts[table] = len(with_run)
        await upsert_rows(client, supabase_url, service_key, "relay_public_snapshots", [payload["public_snapshot"]], "run_slug")
        counts["relay_public_snapshots"] = 1
        return {"run_id": run_id, "run_slug": payload["run"]["run_slug"], "counts": counts}


def write_fixture(payload: dict[str, Any], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload["public_snapshot"]["snapshot_json"], indent=2), encoding="utf-8")


def write_payload(payload: dict[str, Any], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2), encoding="utf-8")


async def main() -> None:
    parser = argparse.ArgumentParser(description="Sync RELAY proof ledger data to Supabase.")
    parser.add_argument("--api-base", default=os.getenv("RELAY_API_BASE", "http://127.0.0.1:8000"))
    parser.add_argument("--ensure-demo-data", action="store_true")
    parser.add_argument("--run-slug", default=os.getenv("SUPABASE_PROOF_RUN_SLUG"))
    parser.add_argument("--fixture-out", default="docs/media/gallery/relay-proof-ledger.fixture.json")
    parser.add_argument("--payload-out", default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    payload = await fetch_demo_payload(args.api_base, args.ensure_demo_data, args.run_slug)
    fixture_path = (Path(__file__).resolve().parents[3] / args.fixture_out).resolve()
    write_fixture(payload, fixture_path)
    payload_path = None
    if args.payload_out:
        payload_path = (Path(__file__).resolve().parents[3] / args.payload_out).resolve()
        write_payload(payload, payload_path)

    if args.dry_run:
        print(
            json.dumps(
                {
                    "dry_run": True,
                    "run": payload["run"],
                    "fixture": str(fixture_path),
                    "payload": str(payload_path) if payload_path else None,
                },
                indent=2,
            )
        )
        return

    result = await sync_to_supabase(payload)
    print(json.dumps({**result, "fixture": str(fixture_path), "payload": str(payload_path) if payload_path else None}, indent=2))


if __name__ == "__main__":
    asyncio.run(main())

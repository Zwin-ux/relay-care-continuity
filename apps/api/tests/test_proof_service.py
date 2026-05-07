import os

from fastapi.testclient import TestClient

os.environ["MODEL_MODE"] = "replay"
os.environ["DATABASE_URL"] = "sqlite:///./test_relay.db"

from app.main import app  # noqa: E402
from app.services.proof_service import build_proof_payload  # noqa: E402


client = TestClient(app)


def prepared_payload():
    client.post("/api/scenarios/load")
    client.post("/api/triage/run-batch")
    snapshot = client.get("/api/snapshot").json()
    incidents = client.get("/api/incidents").json()
    audits = {incident["id"]: client.get(f"/api/incidents/{incident['id']}/audit").json() for incident in incidents}
    eval_metrics = client.post("/api/eval/run").json()
    return build_proof_payload(snapshot, incidents, audits, eval_metrics=eval_metrics, run_slug="test-proof-run")


def test_proof_payload_maps_care_continuity_counts():
    payload = prepared_payload()

    assert payload["run"]["run_slug"] == "test-proof-run"
    assert payload["run"]["source_report_count"] == 30
    assert payload["run"]["continuity_item_count"] >= 6
    assert payload["run"]["unsafe_claim_count"] >= 1
    assert payload["run"]["missing_field_count"] > 0
    assert payload["run"]["audit_event_count"] >= 30
    assert payload["public_snapshot"]["public_read"] is True

    titles = {item["title"] for item in payload["continuity_items"]}
    assert "Medication continuity" in titles
    assert "Power-dependent care" in titles


def test_proof_payload_suppresses_unsafe_medical_advice():
    payload = prepared_payload()
    serialized = str(payload)

    assert "Unsafe medication instruction held for review." in serialized
    assert "extra insulin dose suggestion" not in serialized
    assert "double doses" not in serialized.lower()
    assert "send insulin to everyone" not in serialized.lower()

    medication = next(item for item in payload["continuity_items"] if item["title"] == "Medication continuity")
    assert medication["handoff_status"] == "Unavailable"
    assert medication["unsafe_claims"] == ["Unsafe medication instruction held for review."]

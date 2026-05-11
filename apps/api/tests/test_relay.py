import os

from fastapi.testclient import TestClient

os.environ["MODEL_MODE"] = "replay"
os.environ["DATABASE_URL"] = "sqlite:///./test_relay.db"

from app.main import app  # noqa: E402


client = TestClient(app)


def setup_function():
    with client:
        pass


def test_replay_golden_path_and_audit():
    loaded = client.post("/api/scenarios/load").json()
    assert loaded["loaded"] == 30

    batch = client.post("/api/triage/run-batch").json()
    assert batch["processed"] == 30

    incidents = client.get("/api/incidents").json()
    medication = next(item for item in incidents if "Medication pickup" in item["summary"])
    verified = client.post(
        f"/api/incidents/{medication['id']}/verify",
        json={"note": "Confirmed address and pharmacy contact.", "human_confirmed": True},
    ).json()
    assert verified["state"] == "ACTION_READY"

    dispatched = client.post(
        f"/api/incidents/{medication['id']}/dispatch",
        json={"assignee": "Van team 2", "note": "Pickup assigned after verification.", "human_confirmed": True},
    ).json()
    assert dispatched["state"] == "DISPATCHED"

    audit = client.get(f"/api/incidents/{medication['id']}/audit").json()
    assert [event["event_type"] for event in audit] == ["model_triage", "human_verification", "dispatch_created"]


def test_dispatch_requires_human_confirmation():
    client.post("/api/scenarios/load")
    client.post("/api/triage/run-batch")
    incident = next(item for item in client.get("/api/incidents").json() if "formula" in item["summary"].lower())
    response = client.post(
        f"/api/incidents/{incident['id']}/dispatch",
        json={"assignee": "Supply volunteer", "note": "try dispatch", "human_confirmed": False},
    )
    assert response.status_code == 400
    assert "Human confirmation required" in response.text


def test_hazard_dispatch_is_blocked_until_verified():
    client.post("/api/scenarios/load")
    client.post("/api/triage/run-batch")
    hazard = next(item for item in client.get("/api/incidents").json() if "Road appears blocked" in item["summary"])
    blocked = client.post(
        f"/api/incidents/{hazard['id']}/dispatch",
        json={"assignee": "Road volunteer", "note": "check road", "human_confirmed": True},
    )
    assert blocked.status_code == 400
    assert "Dispatch blocked" in blocked.text

    client.post(
        f"/api/incidents/{hazard['id']}/verify",
        json={"note": "Confirmed exact location; no injuries; avoid downed-line area.", "human_confirmed": True},
    )
    dispatched = client.post(
        f"/api/incidents/{hazard['id']}/dispatch",
        json={"assignee": "Traffic support", "note": "Place cones from safe side only.", "human_confirmed": True},
    )
    assert dispatched.status_code == 200


def test_snapshot_returns_canonical_read_model():
    client.post("/api/scenarios/load")
    initial = client.get("/api/snapshot").json()
    assert initial["app"]["model_mode"] == "replay"
    assert initial["app"]["agent_provider"] == "mock"
    assert initial["app"]["location_pack_id"] == "wildfire_santa_rosa"
    assert initial["app"]["location_label"] == "Santa Rosa, CA"
    assert initial["app"]["context_mode"] == "fixture"
    assert initial["public_context"][0]["context_only"] is True
    assert initial["counts"]["signals_total"] == 30
    assert initial["counts"]["signals_unprocessed"] == 30
    assert initial["board"]["lanes"][0]["cards"] == []

    client.post("/api/triage/run-batch")
    incident = next(item for item in client.get("/api/incidents").json() if "Road appears blocked" in item["summary"])
    snapshot = client.get(f"/api/snapshot?incident_id={incident['id']}").json()
    assert snapshot["counts"]["incidents_total"] > 0
    assert snapshot["selected_incident"]["incident_id"] == incident["id"]
    assert snapshot["selected_incident"]["evidence"]
    assert "missing_information" in snapshot["selected_incident"]
    card = next(
        card
        for lane in snapshot["board"]["lanes"]
        for card in lane["cards"]
        if card["incident_id"] == incident["id"]
    )
    assert set(card) >= {
        "incident_id",
        "summary",
        "incident_type",
        "urgency",
        "confidence",
        "state",
        "missing_information_count",
        "care_domain",
        "required_fields",
        "unsafe_claims",
        "source_assertions",
        "conflicts",
        "handoff_status",
        "follow_status",
    }


def test_location_pack_activation_updates_snapshot_context():
    packs = client.get("/api/location-packs").json()
    assert {pack["id"] for pack in packs} >= {"wildfire_santa_rosa", "flood_asheville", "blackout_phoenix"}

    activated = client.post("/api/location-packs/blackout_phoenix/activate?include_snapshot=true").json()
    assert activated["ok"] is True
    assert activated["location_pack_id"] == "blackout_phoenix"
    assert activated["snapshot"]["app"]["location_label"] == "Phoenix, AZ"
    assert activated["snapshot"]["app"]["hazard_type"] == "heat + blackout"
    assert activated["snapshot"]["app"]["site_type"] == "cooling center"
    assert activated["snapshot"]["counts"]["signals_total"] == 30


def test_care_continuity_fields_persist_into_snapshot():
    client.post("/api/scenarios/load")
    client.post("/api/triage/run-batch")
    incidents = client.get("/api/incidents").json()

    medication = next(item for item in incidents if item["summary"] == "Medication pickup needed for older adults on Maple Ave before evening.")
    assert medication["care_domain"] == "medication"
    assert "recipient identity" in medication["required_fields"]
    assert "pharmacy or pickup location" in medication["required_fields"]
    assert medication["handoff_status"] == "blocked_missing_info"

    oxygen = next(item for item in incidents if "oxygen machine battery" in item["summary"])
    assert oxygen["care_domain"] == "oxygen_power"
    assert {"safe route", "backup power source"} <= set(oxygen["required_fields"])

    unsafe = next(item for item in incidents if "Unsupported insulin request" in item["summary"])
    assert unsafe["care_domain"] == "medication"
    assert unsafe["unsafe_claims"] == ["extra insulin dose suggestion"]
    assert "Unsafe dosing language cannot be treated as a logistics instruction" in unsafe["conflicts"]
    assert unsafe["handoff_status"] == "blocked_unsafe_claim"

    snapshot = client.get(f"/api/snapshot?incident_id={medication['id']}").json()
    card = next(
        card
        for lane in snapshot["board"]["lanes"]
        for card in lane["cards"]
        if card["incident_id"] == medication["id"]
    )
    assert card["care_domain"] == "medication"
    assert "authorized pickup contact" in card["required_fields"]


def test_unsafe_health_claim_blocks_dispatch_even_after_fields_recorded():
    client.post("/api/scenarios/load")
    client.post("/api/triage/run-batch")
    unsafe = next(item for item in client.get("/api/incidents").json() if "Unsupported insulin request" in item["summary"])

    verified = client.post(
        f"/api/incidents/{unsafe['id']}/verify",
        json={"note": "Recorded source details, unsafe claim still requires review.", "human_confirmed": True},
    ).json()
    assert verified["state"] == "ACTION_READY"

    blocked = client.post(
        f"/api/incidents/{unsafe['id']}/dispatch",
        json={"assignee": "Care desk", "note": "try handoff", "human_confirmed": True},
    )
    assert blocked.status_code == 400
    assert "unsafe health or routing claim" in blocked.text


def test_mock_follow_packet_accept_does_not_verify_or_change_state():
    client.post("/api/scenarios/load")
    client.post("/api/triage/run-batch")
    hazard = next(item for item in client.get("/api/incidents").json() if "Road appears blocked" in item["summary"])

    follow = client.post(
        f"/api/incidents/{hazard['id']}/follow",
        json={"objective": "auto", "provider": "default", "instructions": None, "human_triggered": True},
    ).json()
    assert follow["ok"] is True
    assert follow["objective"] == "safety_context"
    assert follow["provider"] == "mock"
    assert follow["status"] == "completed"

    task = client.get(f"/api/follow/{follow['task_id']}").json()
    assert task["result"]["summary"]
    assert task["result"]["findings"]
    assert task["result"]["suggested_next_coordinator_action"]["action_type"] == "request_verification"

    rejected = client.post(
        f"/api/follow/{follow['task_id']}/accept",
        json={
            "human_confirmed": False,
            "accepted_finding_ids": ["find_safety_001"],
            "note_type": "context_note",
            "note": "Do not accept without confirmation.",
        },
    )
    assert rejected.status_code == 400
    assert "Human confirmation required" in rejected.text

    accepted = client.post(
        f"/api/follow/{follow['task_id']}/accept",
        json={
            "human_confirmed": True,
            "accepted_finding_ids": ["find_safety_001"],
            "note_type": "verification_note",
            "note": "Useful callback context, still needs exact road and injury confirmation.",
        },
    ).json()
    assert accepted["ok"] is True
    assert accepted["status"] == "accepted"
    assert accepted["note_type"] == "verification_note"

    incident = client.get(f"/api/incidents/{hazard['id']}").json()
    assert incident["state"] == "NEEDS_VERIFICATION"
    assert incident["missing_information"]
    assert incident["notes"][0]["note_type"] == "verification_note"
    assert "follow_result_accepted" in [event["event_type"] for event in incident["audit"]]

    blocked = client.post(
        f"/api/incidents/{hazard['id']}/dispatch",
        json={"assignee": "Road volunteer", "note": "still unsafe", "human_confirmed": True},
    )
    assert blocked.status_code == 400
    assert "Dispatch blocked" in blocked.text


def test_follow_auto_objective_for_supply_incident():
    client.post("/api/scenarios/load")
    client.post("/api/triage/run-batch")
    supply = next(item for item in client.get("/api/incidents").json() if item["incident_type"] == "shelter_supply")
    follow = client.post(
        f"/api/incidents/{supply['id']}/follow",
        json={"objective": "auto", "provider": "default", "instructions": None, "human_triggered": True},
    ).json()
    assert follow["objective"] == "resource_context"

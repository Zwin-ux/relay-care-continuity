import json
import os
import time
from copy import deepcopy

from ...database import data_root
from ...schemas import FollowOutput
from .base import FollowContext, FollowProviderCancelResult, FollowProviderPollResult, FollowProviderStartResult


class MockFollowProvider:
    name = "mock"

    def start(self, context: FollowContext) -> FollowProviderStartResult:
        delay_ms = int(os.getenv("FOLLOW_MOCK_DELAY_MS", "0"))
        if delay_ms > 0:
            time.sleep(min(delay_ms, 2000) / 1000)
        result = self._result_for_context(context)
        validated = FollowOutput.model_validate(result)
        return FollowProviderStartResult(status="completed", result=validated.model_dump(mode="json"))

    def poll(self, task) -> FollowProviderPollResult:
        result = json.loads(task.result_json or "{}")
        return FollowProviderPollResult(status=task.status, result=result if result else None, error=task.error)

    def cancel(self, task) -> FollowProviderCancelResult:
        return FollowProviderCancelResult(ok=True)

    def _fixture(self) -> dict:
        path = data_root() / "scenarios" / "wildfire_community_center.follow.json"
        return json.loads(path.read_text(encoding="utf-8"))

    def _result_for_context(self, context: FollowContext) -> dict:
        fixture = self._fixture()
        result = deepcopy(fixture.get(context.objective) or fixture["fill_missing_info"])
        incident = context.incident
        supporting_signals = self._supporting_signal_ids(context)

        for finding in result["findings"]:
            if finding.get("evidence_refs") == ["__AUTO__"]:
                finding["evidence_refs"] = supporting_signals

        result["summary"] = result["summary"].format(summary=incident.get("summary", "this incident"))
        result["suggested_next_coordinator_action"]["description"] = result["suggested_next_coordinator_action"][
            "description"
        ].format(summary=incident.get("summary", "this incident"))
        return result

    def _supporting_signal_ids(self, context: FollowContext) -> list[str]:
        incident_type = context.incident.get("incident_type", "")
        summary = context.incident.get("summary", "").lower()
        matches = []
        for signal in context.signals:
            text = signal.get("text", "").lower()
            if incident_type == "infrastructure_hazard" and (
                "road" in text or "tree" in text or "school" in text or "smoke" in text or "wires" in text
            ):
                matches.append(signal["signal_id"])
            elif incident_type == "shelter_supply" and any(term in text for term in ["formula", "diapers", "chargers", "blankets", "cables"]):
                matches.append(signal["signal_id"])
            elif incident_type == "volunteer_task" and any(term in text for term in ["volunteer", "help", "van", "nurse", "traffic"]):
                matches.append(signal["signal_id"])
            elif incident_type == "information_coordination" and any(term in text for term in ["rumor", "confirmed", "bus", "shelter", "policy"]):
                matches.append(signal["signal_id"])
            elif any(word and word in text for word in summary.split()[:5]):
                matches.append(signal["signal_id"])
        return matches[:4] or [signal["signal_id"] for signal in context.signals[:2]]

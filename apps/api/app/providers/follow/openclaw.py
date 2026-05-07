import os

import httpx

from .base import FollowContext, FollowProviderCancelResult, FollowProviderPollResult, FollowProviderStartResult


class OpenClawFollowProvider:
    name = "openclaw"

    def start(self, context: FollowContext) -> FollowProviderStartResult:
        base_url = os.getenv("OPENCLAW_BASE_URL")
        if not base_url:
            return FollowProviderStartResult(status="failed", error="OPENCLAW_BASE_URL is not configured.")
        headers = self._headers()
        try:
            with httpx.Client(timeout=int(os.getenv("FOLLOW_TIMEOUT_SECONDS", "60"))) as client:
                response = client.post(f"{base_url.rstrip('/')}/follow", json=context.__dict__, headers=headers)
                response.raise_for_status()
                body = response.json()
        except Exception as exc:
            return FollowProviderStartResult(status="failed", error=f"OpenClaw follow request failed: {exc}")
        return FollowProviderStartResult(
            status=body.get("status", "completed"),
            external_id=body.get("external_id") or body.get("id"),
            result=body.get("result"),
            error=body.get("error", ""),
        )

    def poll(self, task) -> FollowProviderPollResult:
        base_url = os.getenv("OPENCLAW_BASE_URL")
        if not base_url or not task.external_id:
            return FollowProviderPollResult(status="failed", error="OpenClaw task cannot be polled without base URL and external id.")
        try:
            with httpx.Client(timeout=int(os.getenv("FOLLOW_TIMEOUT_SECONDS", "60"))) as client:
                response = client.get(f"{base_url.rstrip('/')}/follow/{task.external_id}", headers=self._headers())
                response.raise_for_status()
                body = response.json()
        except Exception as exc:
            return FollowProviderPollResult(status="failed", error=f"OpenClaw poll failed: {exc}")
        return FollowProviderPollResult(status=body.get("status", "running"), result=body.get("result"), error=body.get("error", ""))

    def cancel(self, task) -> FollowProviderCancelResult:
        base_url = os.getenv("OPENCLAW_BASE_URL")
        if not base_url or not task.external_id:
            return FollowProviderCancelResult(ok=True)
        try:
            with httpx.Client(timeout=10) as client:
                client.post(f"{base_url.rstrip('/')}/follow/{task.external_id}/cancel", headers=self._headers())
        except Exception as exc:
            return FollowProviderCancelResult(ok=False, error=f"OpenClaw cancel failed: {exc}")
        return FollowProviderCancelResult(ok=True)

    def _headers(self) -> dict[str, str]:
        api_key = os.getenv("OPENCLAW_API_KEY")
        return {"Authorization": f"Bearer {api_key}"} if api_key else {}

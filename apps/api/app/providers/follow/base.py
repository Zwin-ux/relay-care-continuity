from dataclasses import dataclass
from typing import Protocol

from ...models import FollowTask


@dataclass
class FollowContext:
    incident: dict
    signals: list[dict]
    objective: str
    instructions: str


@dataclass
class FollowProviderStartResult:
    status: str
    external_id: str | None = None
    result: dict | None = None
    error: str = ""


@dataclass
class FollowProviderPollResult:
    status: str
    result: dict | None = None
    error: str = ""


@dataclass
class FollowProviderCancelResult:
    ok: bool
    error: str = ""


class FollowProvider(Protocol):
    def start(self, context: FollowContext) -> FollowProviderStartResult:
        ...

    def poll(self, task: FollowTask) -> FollowProviderPollResult:
        ...

    def cancel(self, task: FollowTask) -> FollowProviderCancelResult:
        ...

"""Pluggable semantic assessment. Configuration belongs to the operator environment.

Provider wrappers (Gemini/OpenAI/etc.) implement the same stdin/stdout protocol;
credentials stay in their environment/secret manager, never in a candidate or argv.
Register a new adapter factory without changing lexical verification/publication rules.
No bundled provider SDK, network credential, model invocation or key creation.
"""
import json
import os
import subprocess
from typing import Protocol


class AssessmentAdapter(Protocol):
    is_mock: bool

    def run(self, request: bytes) -> bytes: ...


class CommandAssessor:
    is_mock = False

    def __init__(self, argv):
        if not isinstance(argv, list) or not argv or any(not isinstance(x, str) or not x for x in argv):
            raise ValueError("Assessor argv must be a nonempty string array")
        self.argv = argv

    def run(self, request):
        return subprocess.run(self.argv, input=request, capture_output=True, timeout=60, check=True).stdout


class MockAssessor:
    """Protocol exercise only. Its response can NEVER establish real meaning equivalence."""
    is_mock = True

    def run(self, request):
        value = json.loads(request)
        return json.dumps({"requestSha256": value["requestSha256"], "verdict": "EQUIVALENT",
                           "provider": "MOCK_NO_MODEL", "modelVersion": "protocol-fixture-v1",
                           "vietnameseNatural": True, "rationale": "MOCK: transport/schema test, no semantic research performed",
                           "supportingExtractions": [s["extractionSha256"] for s in value["request"]["sources"][:8]]}).encode()


_FACTORIES = {"disabled": lambda env: None, "mock": lambda env: MockAssessor(),
              "command": lambda env: CommandAssessor(json.loads(env["JIAYOU_ASSESSOR_COMMAND"]))}


def register_provider(name, factory):
    if not name or name in _FACTORIES or not callable(factory):
        raise ValueError("Provider name must be new and factory callable")
    _FACTORIES[name] = factory


def from_environment(env=None):
    env = os.environ if env is None else env
    provider = env.get("JIAYOU_ASSESSOR_PROVIDER", "disabled")
    if provider not in _FACTORIES:
        raise ValueError("Unregistered assessor provider: configure a registered adapter or command wrapper")
    return _FACTORIES[provider](env)

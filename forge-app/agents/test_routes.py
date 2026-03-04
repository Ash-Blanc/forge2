"""
Smoke tests for the Agno FastAPI agent server running on :8321.
Requires the server to be running before executing:
  cd forge-app/agents && uv run uvicorn server:app --port 8321 --reload

Run with:
  uv run pytest test_routes.py -v
"""
import pytest
import requests

BASE_URL = "http://localhost:8321"

EXPECTED_AGENT_IDS = {"forge-analyst", "product-architect", "market-strategist"}


@pytest.fixture(scope="session")
def server_reachable():
    """Skip all tests if the local server isn't running."""
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=3)
        r.raise_for_status()
    except Exception:
        pytest.skip("Agent server not running at :8321 — start it first")


def test_health_endpoint(server_reachable):
    """GET /health should return 200."""
    r = requests.get(f"{BASE_URL}/health", timeout=5)
    assert r.status_code == 200


def test_agents_list_returns_expected_ids(server_reachable):
    """GET /agents should list all three ForgeFlow agents."""
    r = requests.get(f"{BASE_URL}/agents", timeout=5)
    assert r.status_code == 200
    agents = r.json()
    # Accept both list-of-dicts and dict-of-dicts shapes
    if isinstance(agents, list):
        ids = {a.get("agent_id") or a.get("id") for a in agents}
    elif isinstance(agents, dict):
        ids = set(agents.keys())
    else:
        ids = set()
    assert EXPECTED_AGENT_IDS.issubset(ids), f"Missing agents. Got: {ids}"


def test_analyze_returns_400_on_empty_message(server_reachable):
    """POST to an agent with no message should return a 4xx error."""
    r = requests.post(
        f"{BASE_URL}/agents/forge-analyst/runs",
        data={"message": ""},
        timeout=10,
    )
    # Agno either 400 or 422 for empty/invalid payload
    assert r.status_code in (400, 422), f"Expected 4xx, got {r.status_code}"

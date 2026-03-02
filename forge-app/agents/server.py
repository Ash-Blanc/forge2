import os
from agno.os import AgentOS
from dotenv import load_dotenv

from core import (
    forge_analyst,
    product_architect,
    market_strategist,
)
from workflow import forge_flow_instance

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

# Prevent malformed empty credential vars from poisoning boto3 resolution,
# while preserving valid env-based credentials.
for key in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
    value = os.environ.get(key)
    if value is not None and not value.strip():
        os.environ.pop(key, None)

# Initialize AgentOS with our agents and workflows
agent_os = AgentOS(
    id="forge-agents-server",
    description="FORGE Agentic Infrastructure",
    agents=[
        forge_analyst,
        product_architect,
        market_strategist,
    ],
    workflows=[
        forge_flow_instance,
    ],
)

# Get the FastAPI app instance from AgentOS
app = agent_os.get_app()

if __name__ == "__main__":
    # Start the AgentOS server on port 8321
    agent_os.serve(app="server:app", port=8321, reload=True)


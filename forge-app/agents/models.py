import os
from agno.models.aws import AwsBedrock

AVAILABLE_MODELS = {
    "AWS Bedrock — Nova Pro": "amazon.nova-pro-v1:0",
    "AWS Bedrock — Nova 2 Lite": "amazon.nova-lite-v1:0",
}

DEFAULT_MODEL_KEY = "AWS Bedrock — Nova Pro"

def get_model(model_id: str | None = None):
    """Instantiate the native AWS Bedrock model provider."""
    model_id = model_id or AVAILABLE_MODELS[DEFAULT_MODEL_KEY]

    # Accept either "amazon:model-id" or raw model id.
    if model_id.startswith("amazon:"):
        model_id = model_id.split(":", 1)[1]

    # AwsBedrock will automatically use AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION
    # from the environment (loaded via dotenv in server.py).
    return AwsBedrock(
        id=model_id,
    )

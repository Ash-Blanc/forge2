"""Agent definitions and prompts for FORGE Streamlit prototype."""

import os

from agno.agent import Agent
from agno.tools.parallel import ParallelTools
from agno.tools.arxiv import ArxivTools

from utils import parse_agent_json
from tools import SemanticScholarTools

# ── Available Models ──────────────────────────────────────────────────────────

AVAILABLE_MODELS = {
    "AWS Bedrock — Nova Pro": "amazon.nova-pro-v1:0",
    "AWS Bedrock — Nova 2 Lite": "amazon.nova-lite-v1:0",
    "OpenAI — GPT-4o Mini": "openai:gpt-4o-mini",
    "Anthropic — Claude Sonnet": "anthropic:claude-sonnet-4-20250514",
}

DEFAULT_MODEL_KEY = "AWS Bedrock — Nova Pro"

# ── Prompts ───────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are FORGE — a technical startup ideation expert. Your job is to find NON-OBVIOUS, NOVEL applications that others would miss.

The problem with most AI paper analysis: it says generic things like "use this for healthcare" or "apply to finance" - that's useless.

Your job:
1. Find the SPECIFIC technical capability (not the broad domain)
2. Think of UNUSUAL, CREATIVE applications that the paper enables but no one is building
3. Consider edge cases, niche markets, combinations with other tech

OUTPUT JSON ONLY:

{
  "paperAnalysis": {
    "summary": "2-3 sentence plain-English summary - what does this paper actually DO?",
    "coreBreakthrough": "The ONE specific technical thing this enables (be precise)",
    "keyInnovations": ["Specific technical insight 1", "Specific technical insight 2"],
    "applications": [
      "Niche/unusual application 1 - be specific about WHO would use it and WHY",
      "Niche/unusual application 2",
      "Niche/unusual application 3"
    ],
    "limitations": ["Real limitation 1", "Real limitation 2"]
  },
  "swot": {
    "strengths": ["Technical strength 1", "Technical strength 2"],
    "weaknesses": ["Technical weakness 1", "Technical weakness 2"],
    "opportunities": ["Specific opportunity 1", "Specific opportunity 2"],
    "threats": ["Specific threat 1", "Specific threat 2"]
  },
  "startupIdea": {
    "startupName": "Name",
    "oneLiner": "Y Combinator style (what it does, for who)",
    "theHook": "Why NOW? What's the market timing?",
    "targetUser": {
      "persona": "VERY specific role - e.g. 'Junior QA engineer at Series A fintech' not 'developer'",
      "painPoint": "Exact problem they face daily",
      "currentAlternatives": "What do they use now? What's broken about it?"
    },
    "coreTech": "The paper capability used",
    "product": {
      "coreFeature": "The ONE MVP feature",
      "differentiation": "Why better than [specific alternatives]"
    },
    "business": {
      "pricingModel": "Specific: $X/user/mo or $Y/enterprise",
      "gtm": "How to get first 10 customers"
    },
    "metrics": {
      "novelty": "High/Medium/Low",
      "competition": "Low/Medium/High",
      "confidence": 1-10,
      "mvpMonths": 1-6
    }
  }
}"""


COMPETITOR_RESEARCH_PROMPT = """You are an expert market researcher and competitive intelligence analyst.
A user has proposed a new technical startup idea. Your job is to search the live web to find EXACT AND STRONG COMPETITORS or platforms doing something very similar.

Instructions:
1. Search the web using the provided tools to find companies solving the same pain point or building the same core feature.
2. IMPORTANT: When using tools like `parallel_search`, the parameter `search_queries` MUST be a valid JSON array of strings, NOT a stringified list. For example, pass `["query 1", "query 2"]`, not `'["query 1", "query 2"]'`.
3. Select the top 2 to 3 most relevant competitors.
4. If no direct competitors exist, find the closest platform or substitute they are using today.

OUTPUT JSON ONLY. Structure:
{
  "competitors": [
    {
      "name": "Company Name",
      "url": "https://...",
      "description": "What they do in 1 sentence",
      "pricing": "Estimate if known, or 'Unknown'",
      "differentiation": "How the proposed idea is different/better than this competitor"
    }
  ],
  "marketVerdict": "A 2-sentence summary of how crowded or blue-ocean this space is."
}"""

SUGGESTION_PROMPT = """Given this startup idea derived from a research paper, generate 3 alternative ideas the user could explore.

Each should be a different angle but still based on the same paper.

OUTPUT JSON ONLY - array of 3:

{
  "suggestions": [
    {
      "startupName": "Name",
      "oneLiner": "What it does",
      "angle": "e.g. vertical, platform, different user"
    }
  ]
}"""


SAAS_TO_PAPERS_PROMPT = """You are FORGE's Research Scout — an expert at finding cutting-edge academic research that can give a SaaS product a genuine technical edge.

The user will describe their SaaS product or idea. Your job is to:
1. Identify the core technical problems their product must solve
2. Search the web for REAL, PUBLISHED arXiv papers directly applicable to those problems
3. For each paper, explain CONCRETELY how the technique can be used to build a specific feature or improvement

Rules:
- Only return papers that actually exist on arXiv (real arXiv IDs)
- Prioritize papers from the last 3 years (2023–2025)
- Focus on ACTIONABLE techniques, not just vaguely related theory
- Think like a CTO: what research would give this product an unfair technical advantage?

CRITICAL: You MUST output ONLY raw JSON. Do not include ANY conversational text like 'Here are the papers...'. Your entire response must be a valid JSON object matching this exact schema:

{
  "overallStrategy": "2-sentence summary of the recommended R&D direction for this SaaS",
  "papers": [
    {
      "arxivId": "2401.12345",
      "title": "Exact paper title",
      "year": "2024",
      "relevance": "One sentence: why this paper directly applies to the product",
      "boostIdea": "Specific feature or improvement this technique enables — be concrete",
      "implementationHint": "Brief: what would a dev actually do to use this technique?",
      "difficulty": "Medium",
      "impact": "High"
    }
  ]
}"""


# ── Agent runners ─────────────────────────────────────────────────────────────


def get_model(model_id_or_obj):
    if not isinstance(model_id_or_obj, str):
        return model_id_or_obj
    
    provider = "amazon"
    actual_id = model_id_or_obj
    if ":" in model_id_or_obj:
        provider, actual_id = model_id_or_obj.split(":", 1)
    
    if provider == "cerebras":
        from agno.models.cerebras import Cerebras
        return Cerebras(id=actual_id)
    elif provider == "openai":
        from agno.models.openai import OpenAIChat
        return OpenAIChat(id=actual_id)
    elif provider == "anthropic":
        from agno.models.anthropic import Claude
        return Claude(id=actual_id)
    elif provider == "amazon":
        from agno.models.aws.bedrock import AwsBedrock
        return AwsBedrock(id=actual_id)
    else:
        from agno.models.aws.bedrock import AwsBedrock
        return AwsBedrock(id=actual_id)

def run_analysis_agent(prompt: str, model: str, pdf_path: str = None) -> tuple[str, dict | None]:
    """Run the main analysis agent with optional PDF for multimodal context.
    
    Returns (raw_text, parsed_dict_or_none).
    """
    agent = Agent(
        model=get_model(model),
        description=SYSTEM_PROMPT,
        markdown=False,
    )

    args = {"text": prompt}
    if pdf_path and os.path.exists(pdf_path):
        # Attach PDF for Multimodal analysis with Nova Pro
        args["images"] = [pdf_path] 

    raw = ""
    # Note: Using agent.run(..., images=[...]) if Agno supports it directly for Bedrock
    # or passing as part of the message. For Nova Pro, we pass the file.
    for chunk in agent.run(prompt, images=[pdf_path] if pdf_path else None, stream=True):
        content = chunk.content if hasattr(chunk, "content") else str(chunk)
        if content:
            raw += content

    return raw, parse_agent_json(raw)


def run_competitor_agent(idea_context: str, model: str) -> tuple[str, dict | None]:
    """Run the competitor research agent with Parallel.ai search tools."""
    agent = Agent(
        model=get_model(model),
        description=COMPETITOR_RESEARCH_PROMPT,
        tools=[ParallelTools(enable_search=True, enable_extract=True, max_results=3)],
        markdown=False,
    )

    raw = ""
    for chunk in agent.run(idea_context, stream=True):
        content = chunk.content if hasattr(chunk, "content") else str(chunk)
        if content:
            raw += content

    return raw, parse_agent_json(raw)


def run_suggestion_agent(
    idea_oneliner: str, abstract: str, model: str
) -> tuple[str, dict | None]:
    """Run the suggestion agent for alternative ideas."""
    agent = Agent(
        model=get_model(model),
        description=SUGGESTION_PROMPT,
        markdown=False,
    )

    prompt = f"Main idea: {idea_oneliner}\n\nPaper: {abstract[:2000]}"
    raw = ""
    for chunk in agent.run(prompt, stream=True):
        content = chunk.content if hasattr(chunk, "content") else str(chunk)
        if content:
            raw += content

    return raw, parse_agent_json(raw)


def run_saas_boost_agent(saas_description: str, model: str) -> tuple[str, dict | None]:
    """Run the SaaS → Papers agent. Uses both Semantic Scholar API and Arxiv Tools to find papers."""
    agent = Agent(
        model=get_model(model),
        description=SAAS_TO_PAPERS_PROMPT,
        tools=[SemanticScholarTools()],
        markdown=False,
    )

    prompt = f"""Find the most relevant recent arXiv research papers for this SaaS product:

{saas_description}

Use the Semantic Scholar tool to find REAL papers.
Prioritize papers that have an verifiable arXiv ID.

CRITICAL: You must output ONLY raw JSON. Do not include introductory text like 'Here are the papers...'. Start your response with {{ and end with }}."""

    raw = ""
    for chunk in agent.run(prompt, stream=True):
        content = chunk.content if hasattr(chunk, "content") else str(chunk)
        if content:
            raw += content

    return raw, parse_agent_json(raw)

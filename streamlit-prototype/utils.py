"""Utility functions for FORGE Streamlit prototype."""

import json
import os
import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime

import streamlit as st

SESSIONS_FILE = os.path.join(os.path.dirname(__file__), "sessions.json")


# ── Session persistence ──────────────────────────────────────────────────────


def load_sessions() -> dict:
    """Load saved sessions from JSON file."""
    if os.path.exists(SESSIONS_FILE):
        try:
            with open(SESSIONS_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_sessions(sessions: dict) -> None:
    """Persist sessions to JSON file."""
    with open(SESSIONS_FILE, "w") as f:
        json.dump(sessions, f, indent=2)


# ── arXiv helpers ─────────────────────────────────────────────────────────────


def extract_arxiv_id(input_str: str) -> str | None:
    """Extract an arXiv ID from a raw string (plain ID, abs URL, or PDF URL)."""
    input_str = input_str.strip()
    if re.match(r"^\d{4}\.\d{4,5}(v\d+)?$", input_str):
        return input_str
    match = re.search(r"arxiv\.org/(?:abs|pdf)/(\d{4}\.\d{4,5}(?:v\d+)?)", input_str)
    if match:
        return match.group(1)
    match = re.search(r"(\d{4}\.\d{4,5}(?:v\d+)?)", input_str)
    if match:
        return match.group(1)
    return None


def fetch_arxiv_meta(arxiv_id: str, max_retries: int = 3) -> dict:
    """Fetch paper metadata from arXiv API with retry logic.

    Returns dict with title, authors, published, abstract or empty dict on failure.
    """
    url = f"http://export.arxiv.org/api/query?id_list={arxiv_id}"

    for attempt in range(max_retries):
        try:
            response = urllib.request.urlopen(url, timeout=30)
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            ns = {"default": "http://www.w3.org/2005/Atom"}
            entry = root.find("default:entry", ns)
            if not entry:
                st.error(
                    f"No entry found for arXiv ID `{arxiv_id}`. Check the ID is correct."
                )
                return {}

            # arXiv returns an entry even for invalid IDs but with an error id
            entry_id = entry.find("default:id", ns)
            if entry_id is not None and "api/errors" in (entry_id.text or ""):
                st.error(
                    f"arXiv ID `{arxiv_id}` not found. Please double-check the ID."
                )
                return {}

            title_el = entry.find("default:title", ns)
            abstract_el = entry.find("default:summary", ns)

            if title_el is None or title_el.text is None:
                st.error("Paper found but missing title. It may be unavailable.")
                return {}

            return {
                "title": title_el.text.strip().replace("\n", " "),
                "authors": [
                    a.find("default:name", ns).text
                    for a in entry.findall("default:author", ns)
                ],
                "published": entry.find("default:published", ns).text,
                "abstract": (
                    abstract_el.text.strip().replace("\n", " ")
                    if abstract_el is not None and abstract_el.text
                    else ""
                ),
            }
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 2 ** (attempt + 1)
                st.warning(f"Rate limited by arXiv. Retrying in {wait}s...")
                time.sleep(wait)
                continue
            st.error(f"arXiv HTTP error ({e.code}): {e.reason}")
            return {}
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(1)
                continue
            st.error(f"Failed to fetch from arXiv after {max_retries} attempts: {e}")
            return {}

    return {}


# ── JSON parsing ──────────────────────────────────────────────────────────────


def parse_agent_json(raw_text: str) -> dict | None:
    """Parse JSON from agent response with multiple fallback strategies.

    1. Strip markdown code fences
    2. Regex-extract the outermost JSON object
    3. Attempt to load it
    Returns parsed dict or None on failure.
    """
    # Strategy 1: strip markdown fences
    clean = re.sub(r"```json\s*", "", raw_text, flags=re.IGNORECASE)
    clean = re.sub(r"```\s*", "", clean).strip()

    # Strategy 2: regex extract outermost braces
    match = re.search(r"\{[\s\S]*\}", clean)
    if not match:
        return None

    json_str = match.group(0)

    # Strategy 3: try to parse
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        pass

    # Strategy 4: attempt basic repair — trailing commas before closing braces
    repaired = re.sub(r",\s*([}\]])", r"\1", json_str)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError:
        return None


# ── Prompt builder ────────────────────────────────────────────────────────────


def build_prompt(meta: dict) -> str:
    """Build the user prompt from paper metadata."""
    return f"""Analyze this paper and generate both a paper analysis and startup idea.

Title: {meta.get("title", "")}
Authors: {", ".join(meta.get("authors", []))}
Abstract: {meta.get("abstract", "")[:5000]}

Return ONLY valid JSON."""


def build_saas_prompt(description: str) -> str:
    """Build the prompt for SaaS → Papers mode."""
    return f"""Find the most relevant recent arXiv research papers for this SaaS product:

{description.strip()}

Search arXiv and the web to find REAL papers with valid arXiv IDs. Return JSON only."""


# ── Markdown export ───────────────────────────────────────────────────────────


def generate_markdown_report(data: dict, meta: dict, mode: str = "arxiv") -> str:
    """Generate a clean Markdown report from analysis data."""
    lines = []
    
    if mode == "saas":
        lines.append(f"# FORGE SaaS Research Boost\n")
        lines.append(f"**Target SaaS:** {meta.get('title', '').replace('SaaS: ', '')}  \n")
        lines.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
        
        lines.append("---\n## 🎯 Overall R&D Strategy\n")
        lines.append(f"{data.get('overallStrategy', '')}\n")
        
        lines.append("---\n## 📚 Recommended Papers\n")
        for p in data.get("papers", []):
            lines.append(f"### {p.get('title', 'Unknown')}")
            lines.append(f"- **arXiv ID:** [{p.get('arxivId', '')}](https://arxiv.org/abs/{p.get('arxivId', '')}) ({p.get('year', '')})")
            lines.append(f"- **Relevance:** {p.get('relevance', '')}")
            lines.append(f"- **Boost Idea:** {p.get('boostIdea', '')}")
            lines.append(f"- **Implementation:** _{p.get('implementationHint', '')}_")
            lines.append(f"- **Difficulty:** {p.get('difficulty', '')} | **Impact:** {p.get('impact', '')}\n")
            
        return "\n".join(lines)


    # Regular arXiv mode
    paper = data.get("paperAnalysis", {})
    swot = data.get("swot", {})
    idea = data.get("startupIdea", {})
    target = idea.get("targetUser", {})
    metrics = idea.get("metrics", {})
    competitors = data.get("competitorIntelligence", {})
    suggestions = data.get("suggestions", [])

    lines.append(f"# FORGE Analysis: {meta.get('title', 'Unknown Paper')}\n")
    lines.append(
        f"**arXiv:** {meta.get('title', '')}  \n"
        f"**Authors:** {', '.join(meta.get('authors', []))}  \n"
        f"**Published:** {meta.get('published', '')}  \n"
        f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
    )

    # Paper Analysis
    lines.append("---\n## 📝 Paper Analysis\n")
    if paper.get("summary"):
        lines.append(f"**Summary:** {paper['summary']}\n")
    if paper.get("coreBreakthrough"):
        lines.append(f"**Core Breakthrough:** {paper['coreBreakthrough']}\n")
    if paper.get("keyInnovations"):
        lines.append("**Key Innovations:**")
        for inn in paper["keyInnovations"]:
            lines.append(f"- {inn}")
        lines.append("")
    if paper.get("applications"):
        lines.append("**Applications:**")
        for app in paper["applications"]:
            lines.append(f"- {app}")
        lines.append("")
    if paper.get("limitations"):
        lines.append("**Limitations:**")
        for lim in paper["limitations"]:
            lines.append(f"- {lim}")
        lines.append("")

    # SWOT
    if swot:
        lines.append("---\n## ⚖️ SWOT Analysis\n")
        for label, key, icon in [
            ("Strengths", "strengths", "✓"),
            ("Weaknesses", "weaknesses", "✗"),
            ("Opportunities", "opportunities", "+"),
            ("Threats", "threats", "⚠"),
        ]:
            items = swot.get(key, [])
            if items:
                lines.append(f"**{label}:**")
                for item in items:
                    lines.append(f"- {icon} {item}")
                lines.append("")

    # Startup Idea
    if idea:
        lines.append("---\n## 🚀 Startup Idea\n")
        lines.append(f"### {idea.get('startupName', 'TBD')}\n")
        lines.append(f"**{idea.get('oneLiner', '')}**\n")
        lines.append(f"*{idea.get('theHook', '')}*\n")

        lines.append(
            f"| Novelty | Competition | Confidence | MVP |\n"
            f"|---------|-------------|------------|-----|\n"
            f"| {metrics.get('novelty', '?')} | {metrics.get('competition', '?')} "
            f"| {metrics.get('confidence', '?')}/10 | {metrics.get('mvpMonths', '?')} months |\n"
        )

        if target:
            lines.append("**Target User:**")
            lines.append(f"- **Persona:** {target.get('persona', '')}")
            lines.append(f"- **Pain Point:** {target.get('painPoint', '')}")
            lines.append(
                f"- **Current Alternatives:** {target.get('currentAlternatives', '')}\n"
            )

        product = idea.get("product", {})
        if product:
            lines.append(
                f"**Core Feature:** {product.get('coreFeature', '')}  \n"
                f"**Differentiation:** {product.get('differentiation', '')}\n"
            )

        biz = idea.get("business", {})
        if biz:
            lines.append(
                f"**Pricing:** {biz.get('pricingModel', '')}  \n"
                f"**GTM:** {biz.get('gtm', '')}\n"
            )

    # Competitors
    if competitors:
        lines.append("---\n## 🕵️ Competitor Intelligence\n")
        lines.append(f"**Market Verdict:** {competitors.get('marketVerdict', '')}\n")
        for c in competitors.get("competitors", []):
            lines.append(f"### {c.get('name', '?')}")
            lines.append(f"- **URL:** {c.get('url', '')}")
            lines.append(f"- **What they do:** {c.get('description', '')}")
            lines.append(f"- **Pricing:** {c.get('pricing', 'Unknown')}")
            lines.append(f"- **Why we win:** {c.get('differentiation', '')}\n")

    # Suggestions
    if suggestions:
        lines.append("---\n## 💡 Alternative Ideas\n")
        for s in suggestions:
            lines.append(
                f"- **{s.get('startupName', '?')}** — {s.get('oneLiner', '')} _{s.get('angle', '')}_"
            )

    return "\n".join(lines)

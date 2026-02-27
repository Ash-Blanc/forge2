import streamlit as st
import urllib.request
import xml.etree.ElementTree as ET
import re
import json
import os
from datetime import datetime
from agno.agent import Agent
from agno.tools.duckduckgo import DuckDuckGoTools
from dotenv import load_dotenv

SESSIONS_FILE = os.path.join(os.path.dirname(__file__), "sessions.json")


def load_sessions() -> dict:
    if os.path.exists(SESSIONS_FILE):
        try:
            with open(SESSIONS_FILE, "r") as f:
                return json.load(f)
        except:
            return {}
    return {}


def save_sessions(sessions: dict) -> None:
    with open(SESSIONS_FILE, "w") as f:
        json.dump(sessions, f, indent=2)


def init_session_state() -> None:
    if "sessions" not in st.session_state:
        st.session_state.sessions = load_sessions()
    if "current_arxiv_id" not in st.session_state:
        st.session_state.current_arxiv_id = None


init_session_state()

env_path = os.path.join(os.path.dirname(__file__), "..", "full-stack-web", ".env.local")
load_dotenv(env_path)

st.set_page_config(
    page_title="FORGE | Deep Paper Distillery",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
<style>
    .stMetric { background-color: var(--secondary-background-color) !important; padding: 15px; border-radius: 12px; }
    .saas-header { font-weight: 800; font-size: 2.2rem; background: -webkit-linear-gradient(45deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .idea-card { background-color: var(--secondary-background-color); padding: 1rem; border-radius: 12px; margin-bottom: 0.5rem; border: 1px solid var(--faded-text-10); }
    .tag-container { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
    .custom-tag { background-color: var(--secondary-background-color); padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.7rem; font-weight: 600; }
    #MainMenu {visibility: hidden;} footer {visibility: hidden;}
</style>
""",
    unsafe_allow_html=True,
)


def extract_arxiv_id(input_str: str) -> str | None:
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


def fetch_arxiv_meta(arxiv_id: str) -> dict:
    url = f"http://export.arxiv.org/api/query?id_list={arxiv_id}"
    try:
        response = urllib.request.urlopen(url, timeout=30)
        xml_data = response.read()
        root = ET.fromstring(xml_data)
        ns = {"default": "http://www.w3.org/2005/Atom"}
        entry = root.find("default:entry", ns)
        if not entry:
            return {}
        return {
            "title": entry.find("default:title", ns).text.strip().replace("\n", " "),
            "authors": [
                a.find("default:name", ns).text
                for a in entry.findall("default:author", ns)
            ],
            "published": entry.find("default:published", ns).text,
            "abstract": entry.find("default:summary", ns)
            .text.strip()
            .replace("\n", " "),
        }
    except Exception as e:
        st.error(f"Failed to fetch from arXiv: {e}")
        return {}


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
2. Select the top 2 to 3 most relevant competitors.
3. If no direct competitors exist, find the closest platform or substitute they are using today.

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


def build_prompt(meta: dict) -> str:
    return f"""Analyze this paper and generate both a paper analysis and startup idea.

Title: {meta.get("title", "")}
Authors: {", ".join(meta.get("authors", []))}
Abstract: {meta.get("abstract", "")[:5000]}

Return ONLY valid JSON."""


def render_main_idea(data: dict):
    paper = data.get("paperAnalysis", {})
    swot = data.get("swot", {})
    idea = data.get("startupIdea", {})
    m = idea.get("metrics", {})
    target = idea.get("targetUser", {})

    # Summary
    st.subheader("📝 Summary")
    st.info(paper.get("summary", ""))

    # Core Ideas
    st.subheader("💡 Core Ideas")
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Key Innovations**")
        for inn in paper.get("keyInnovations", []):
            st.markdown(f"- {inn}")
    with col2:
        st.markdown("**Applications**")
        for app in paper.get("applications", []):
            st.markdown(f"- {app}")

    colA, colB = st.columns(2)
    with colA:
        st.markdown("**Core Breakthrough**")
        st.write(paper.get("coreBreakthrough", ""))
        st.markdown("**Limitations**")
        for lim in paper.get("limitations", []):
            st.markdown(f"- {lim}")
    with colB:
        st.markdown("**Commercial Viability**")
        score = paper.get("startupViabilityScore", "?")
        st.metric("Viability Score", f"{score}/100")
        st.caption(paper.get("viabilityReasoning", ""))

    # SWOT
    st.subheader("⚖️ SWOT Analysis")
    sc1, sc2 = st.columns(2)
    with sc1:
        st.markdown("**Strengths**")
        for s in swot.get("strengths", []):
            st.write(f"✓ {s}")
        st.markdown("**Opportunities**")
        for o in swot.get("opportunities", []):
            st.write(f"＋ {o}")
    with sc2:
        st.markdown("**Weaknesses**")
        for w in swot.get("weaknesses", []):
            st.write(f"✗ {w}")
        st.markdown("**Threats**")
        for t in swot.get("threats", []):
            st.write(f"⚠ {t}")

    st.divider()

    # Startup Idea
    st.subheader("🚀 Startup Idea")

    if not idea:
        st.warning(
            "⚠️ This paper was evaluated as having too low commercial viability to generate a responsible startup idea. See the viability reasoning above."
        )
        return

    st.markdown(
        f"<div class='saas-header'>{idea.get('startupName', 'TBD')}</div>",
        unsafe_allow_html=True,
    )
    st.markdown(f"**{idea.get('oneLiner', '')}**")
    st.caption(f"🎯 {idea.get('theHook', '')}")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Novelty", m.get("novelty", "?"))
    with col2:
        st.metric("Competition", m.get("competition", "?"))
    with col3:
        st.metric("Confidence", f"{m.get('confidence', '?')}/10")
    with col4:
        st.metric("MVP", f"{m.get('mvpMonths', '?')} months")

    tab1, tab2, tab3, tab4, tab_comp = st.tabs(
        ["🎯 User", "💻 Product", "💰 Business", "🔧 Tech", "🕵️ Competitors"]
    )

    with tab1:
        st.subheader("Who Pays?")
        st.markdown(f"**{target.get('persona', 'TBD')}**")
        st.error(f"Pain: {target.get('painPoint', 'N/A')}")
        st.write(f"Alternatives: {target.get('currentAlternatives', 'N/A')}")

    with tab2:
        st.subheader("Core Feature")
        st.info(idea.get("product", {}).get("coreFeature", ""))
        st.markdown(
            f"**Differentiation:** {idea.get('product', {}).get('differentiation', '')}"
        )

    with tab3:
        st.subheader("Business Model")
        st.markdown(f"**Pricing:** {idea.get('business', {}).get('pricingModel', '')}")
        st.markdown(f"**GTM:** {idea.get('business', {}).get('gtm', '')}")

    with tab4:
        st.subheader("Core Technology")
        st.info(idea.get("coreTech", ""))

    with tab_comp:
        st.subheader("Live Market Intelligence")

        # Check if we already have competitor data
        competitor_data = data.get("competitorIntelligence")

        if competitor_data:
            st.info(f"**Market Verdict:** {competitor_data.get('marketVerdict', '')}")

            comps = competitor_data.get("competitors", [])
            if not comps:
                st.success("No direct strong competitors found! Blue ocean territory.")
            else:
                for c in comps:
                    with st.container():
                        st.markdown(
                            f"""
                        <div class='idea-card'>
                            <h4 style='margin:0 0 0.5rem 0;'>{c.get("name", "Unknown")}</h4>
                            <a href="{c.get("url", "#")}" target="_blank" style="font-size: 0.8rem;">{c.get("url", "No Website")}</a>
                            <p style='margin: 0.5rem 0;'>{c.get("description", "")}</p>
                            <p style='font-size: 0.8rem; color: var(--text-color); margin-bottom: 0.5rem'><strong>Pricing:</strong> {c.get("pricing", "Unknown")}</p>
                            <div style="border-left: 3px solid #3b82f6; padding-left: 10px; margin-top: 10px;">
                                <small><strong>Why we win:</strong> {c.get("differentiation", "")}</small>
                            </div>
                        </div>
                        """,
                            unsafe_allow_html=True,
                        )
        else:
            st.write(
                "Run a live web search to find current platforms and alternatives for this specific idea."
            )

            # Use columns to center/style the button
            button_col1, button_col2, button_col3 = st.columns([1, 2, 1])
            with button_col2:
                if st.button(
                    "🔍 Run Deep Competitor Research",
                    use_container_width=True,
                    key=f"comp_{st.session_state.current_arxiv_id}",
                ):
                    with st.spinner(
                        "Agents are searching DuckDuckGo and analyzing the market..."
                    ):
                        try:
                            # Set up a new agent with search tools
                            comp_agent = Agent(
                                model="cerebras:llama3.3-70b",  # Often better at reasoning over live search
                                description=COMPETITOR_RESEARCH_PROMPT,
                                tools=[DuckDuckGoTools()],
                                markdown=False,
                            )

                            idea_context = f"Idea Name: {idea.get('startupName')}\nOne-liner: {idea.get('oneLiner')}\nTarget User: {target.get('persona')}\nCore Feature: {idea.get('product', {}).get('coreFeature')}"

                            comp_raw = ""
                            for chunk in comp_agent.run(idea_context, stream=True):
                                content = (
                                    chunk.content
                                    if hasattr(chunk, "content")
                                    else str(chunk)
                                )
                                if content:
                                    comp_raw += content

                            clean_comp = re.sub(
                                r"```json\s*", "", comp_raw, flags=re.IGNORECASE
                            )
                            clean_comp = re.sub(r"```\s*", "", clean_comp).strip()
                            match_comp = re.search(r"\{[\s\S]*\}", clean_comp)

                            if match_comp:
                                comp_json = json.loads(match_comp.group(0))

                                # Save back to the session state under the current ID
                                current_id = st.session_state.current_arxiv_id
                                st.session_state.sessions[current_id]["data"][
                                    "competitorIntelligence"
                                ] = comp_json
                                save_sessions(st.session_state.sessions)
                                st.rerun()
                            else:
                                st.error(
                                    "Failed to parse agent findings. Please try again."
                                )
                                st.code(comp_raw)

                        except Exception as e:
                            st.error(f"Search failed: {e}")


def render_suggestions(suggestions: list, parent_arxiv_id: str):
    st.divider()
    st.subheader("💡 Other Ideas to Explore")

    cols = st.columns(3)
    for i, suggestion in enumerate(suggestions):
        with cols[i]:
            with st.container():
                st.markdown(
                    f"""
                <div class='idea-card'>
                    <strong>{suggestion.get("startupName", "TBD")}</strong>
                    <p style='font-size:0.8rem; margin:0.5rem 0;'>{suggestion.get("oneLiner", "")}</p>
                    <span class='custom-tag'>{suggestion.get("angle", "")}</span>
                </div>
                """,
                    unsafe_allow_html=True,
                )

                if st.button(f"Explore →", key=f"suggest_{parent_arxiv_id}_{i}"):
                    new_arxiv_id = f"{parent_arxiv_id}_alt{i + 1}"
                    st.session_state.sessions[new_arxiv_id] = {
                        "timestamp": datetime.now().isoformat(),
                        "productName": suggestion.get("startupName", "TBD"),
                        "data": {"idea": suggestion},
                        "meta": st.session_state.sessions.get(parent_arxiv_id, {}).get(
                            "meta", {}
                        ),
                        "is_suggestion": True,
                        "parent_id": parent_arxiv_id,
                    }
                    save_sessions(st.session_state.sessions)
                    st.session_state.current_arxiv_id = new_arxiv_id
                    st.rerun()


# Sidebar
with st.sidebar:
    st.markdown(
        "<h1 style='font-size: 1.5rem;'>🛠️ Research Forge</h1>", unsafe_allow_html=True
    )
    st.caption("v2.0 | Deep Tech Distillery")
    st.divider()

    arxiv_input = st.text_input("arXiv ID or URL", placeholder="2409.13449")
    analyze_btn = st.button(
        "Distill Blueprint", type="primary", use_container_width=True
    )

    st.divider()
    st.subheader("📚 History")
    sessions = st.session_state.sessions

    if sessions:
        for arxiv_id, data in sorted(
            sessions.items(), key=lambda x: x[1].get("timestamp", ""), reverse=True
        ):
            col1, col2 = st.columns([4, 1])
            with col1:
                label = data.get("productName", arxiv_id)
                if data.get("is_suggestion"):
                    label = f"↳ {label}"
                if st.button(label[:25], key=f"load_{arxiv_id}"):
                    st.session_state.current_arxiv_id = arxiv_id
                    st.rerun()
            with col2:
                if st.button("🗑️", key=f"del_{arxiv_id}"):
                    del st.session_state.sessions[arxiv_id]
                    save_sessions(st.session_state.sessions)
                    if st.session_state.current_arxiv_id == arxiv_id:
                        st.session_state.current_arxiv_id = None
                    st.rerun()
    else:
        st.caption("No analyses yet")

    if st.button("Clear All", use_container_width=True):
        st.session_state.sessions = {}
        st.session_state.current_arxiv_id = None
        save_sessions({})
        st.rerun()


# Main - View saved session
if (
    st.session_state.current_arxiv_id
    and st.session_state.current_arxiv_id in st.session_state.sessions
):
    saved_data = st.session_state.sessions[st.session_state.current_arxiv_id]

    st.info(f"📂 {st.session_state.current_arxiv_id}")

    if st.session_state.current_arxiv_id.endswith(("_alt1", "_alt2", "_alt3")):
        parent = saved_data.get("parent_id", "")
        if parent and st.button("← Back to main idea"):
            st.session_state.current_arxiv_id = parent
            st.rerun()

    if st.button("← New Search"):
        st.session_state.current_arxiv_id = None
        st.rerun()

    data = saved_data.get("data", {})
    if data:
        render_main_idea(data)

        if not saved_data.get("is_suggestion"):
            suggestions = data.get("suggestions", [])
            if suggestions:
                render_suggestions(suggestions, st.session_state.current_arxiv_id)

# Main - New analysis
elif analyze_btn and arxiv_input:
    arxiv_id = extract_arxiv_id(arxiv_input)

    if not arxiv_id:
        st.error("Invalid arXiv ID. Try: 2409.13449")
    else:
        with st.spinner("Retrieving paper..."):
            meta = fetch_arxiv_meta(arxiv_id)

        if not meta:
            st.error("Could not find paper on arXiv.")
        else:
            with st.sidebar:
                st.caption(f"**{meta['title'][:50]}...**")
                with st.expander("Abstract"):
                    st.write(meta["abstract"][:500])

            prog = st.progress(0)
            status = st.status("Analyzing...", expanded=True)

            try:
                agent = Agent(
                    model="cerebras:gpt-oss-120b",
                    description=SYSTEM_PROMPT,
                    markdown=False,
                )

                prog.progress(30)
                status.update(label="Finding the best idea...", state="running")

                full_raw = ""
                for chunk in agent.run(build_prompt(meta), stream=True):
                    content = chunk.content if hasattr(chunk, "content") else str(chunk)
                    if content:
                        full_raw += content

                prog.progress(70)

                clean = re.sub(r"```json\s*", "", full_raw, flags=re.IGNORECASE)
                clean = re.sub(r"```\s*", "", clean).strip()
                match = re.search(r"\{[\s\S]*\}", clean)

                if not match:
                    st.error("Failed to generate idea.")
                    st.code(full_raw)
                else:
                    try:
                        data = json.loads(match.group(0))

                        st.session_state.sessions[arxiv_id] = {
                            "timestamp": datetime.now().isoformat(),
                            "productName": data.get("startupIdea", {}).get(
                                "startupName", "TBD"
                            ),
                            "data": data,
                            "meta": meta,
                        }

                        prog.progress(85)
                        status.update(
                            label="Generating alternatives...", state="running"
                        )

                        try:
                            suggestion_agent = Agent(
                                model="cerebras:gpt-oss-120b",
                                description=SUGGESTION_PROMPT,
                                markdown=False,
                            )

                            suggestion_raw = ""
                            for chunk in suggestion_agent.run(
                                f"Main idea: {data.get('startupIdea', {}).get('oneLiner', '')}\n\nPaper: {meta.get('abstract', '')[:2000]}",
                                stream=True,
                            ):
                                content = (
                                    chunk.content
                                    if hasattr(chunk, "content")
                                    else str(chunk)
                                )
                                if content:
                                    suggestion_raw += content

                            clean_sugg = re.sub(
                                r"```json\s*", "", suggestion_raw, flags=re.IGNORECASE
                            )
                            clean_sugg = re.sub(r"```\s*", "", clean_sugg).strip()
                            match_sugg = re.search(r"\{[\s\S]*\}", clean_sugg)

                            if match_sugg:
                                sugg_data = json.loads(match_sugg.group(0))
                                suggestions = sugg_data.get("suggestions", [])
                                data["suggestions"] = suggestions
                                st.session_state.sessions[arxiv_id]["data"] = data
                        except Exception as e:
                            st.caption(f"Could not generate suggestions: {e}")

                        save_sessions(st.session_state.sessions)
                        st.session_state.current_arxiv_id = arxiv_id

                        prog.progress(100)
                        status.update(label="Done", state="complete", expanded=False)
                        st.toast(
                            f"Generated: {data.get('startupIdea', {}).get('startupName', 'TBD')}",
                            icon="💡",
                        )

                        render_main_idea(data)

                        if data.get("suggestions"):
                            render_suggestions(data["suggestions"], arxiv_id)

                    except json.JSONDecodeError:
                        st.error("Parse error")
                        st.code(full_raw)

            except Exception as e:
                st.error(f"Error: {str(e)}")

else:
    st.markdown(
        "<div class='saas-header'>Distill Intelligence.</div>", unsafe_allow_html=True
    )
    st.write("Enter an arXiv paper to find the best startup idea.")
    st.divider()
    c1, c2, c3 = st.columns(3)
    c1.markdown("### 01. Ingest\nPaper from arXiv")
    c2.markdown("### 02. Analyze\nFind the best idea")
    c3.markdown("### 03. Explore\nTry alternative angles")

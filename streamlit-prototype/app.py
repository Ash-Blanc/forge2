import streamlit as st
import urllib.request
import xml.etree.ElementTree as ET
import re
import json
import os
from datetime import datetime
from agno.agent import Agent
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


SYSTEM_PROMPT = """You are FORGE — a technical co-founder evaluating research papers for startup potential.

Task: Identify the ONE most promising startup idea from this paper.

Focus on:
- Specific technical capability that can be productized
- Realistic user with real pain point
- Feasible with $50k and 3 months
- Low competition, high differentiation

OUTPUT JSON ONLY:

{
  "startupName": "Name",
  "oneLiner": "Y Combinator style one-liner",
  "theHook": "Why NOW?",
  "targetUser": {
    "persona": "Specific role",
    "painPoint": "Exact problem",
    "currentAlternatives": "What they use now"
  },
  "coreTech": "Paper capability used",
  "product": {
    "coreFeature": "MVP feature",
    "differentiation": "Why better"
  },
  "business": {
    "pricingModel": "Specific pricing",
    "gtm": "How to get customers"
  },
  "metrics": {
    "novelty": "High/Medium/Low",
    "competition": "Low/Medium/High",
    "confidence": 1-10,
    "mvpMonths": 1-6
  }
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
    return f"""Analyze this paper and find the ONE best startup idea.

Title: {meta.get("title", "")}
Authors: {", ".join(meta.get("authors", []))}
Abstract: {meta.get("abstract", "")[:5000]}

Return ONLY valid JSON."""


def render_main_idea(idea: dict):
    m = idea.get("metrics", {})
    target = idea.get("targetUser", {})

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

    st.divider()

    tab1, tab2, tab3, tab4 = st.tabs(
        ["🎯 User", "💻 Product", "💰 Business", "🔧 Tech"]
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

    idea = saved_data.get("data", {}).get("idea", {})
    if idea:
        render_main_idea(idea)

        if not saved_data.get("is_suggestion"):
            suggestions = saved_data.get("data", {}).get("suggestions", [])
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
                        idea = data

                        st.session_state.sessions[arxiv_id] = {
                            "timestamp": datetime.now().isoformat(),
                            "productName": idea.get("startupName", "TBD"),
                            "data": {"idea": idea},
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
                                f"Main idea: {idea.get('oneLiner', '')}\n\nPaper: {meta.get('abstract', '')[:2000]}",
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
                            f"Generated: {idea.get('startupName', 'TBD')}", icon="💡"
                        )

                        render_main_idea(idea)

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

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
    .idea-card { background-color: var(--secondary-background-color); padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem; border: 1px solid var(--faded-text-10); }
    .tag-container { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem; }
    .custom-tag { background-color: var(--secondary-background-color); padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.7rem; font-weight: 600; }
    .novelty-high { color: #10b981; }
    .novelty-med { color: #f59e0b; }
    .novelty-low { color: #ef4444; }
    #MainMenu {visibility: hidden;} footer {visibility: hidden;}
</style>
""",
    unsafe_allow_html=True,
)


def extract_arxiv_id(input_str: str) -> str | None:
    """Extract arXiv ID from various input formats."""
    input_str = input_str.strip()

    # Already just the ID
    if re.match(r"^\d{4}\.\d{4,5}(v\d+)?$", input_str):
        return input_str

    # arxiv.org/abs/2409.13449 or arxiv.org/pdf/2409.13449
    match = re.search(r"arxiv\.org/(?:abs|pdf)/(\d{4}\.\d{4,5}(?:v\d+)?)", input_str)
    if match:
        return match.group(1)

    # arxiv.org/abs/2409.13449
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


SYSTEM_PROMPT = """You are FORGE — an expert startup ideation engine. Given a research paper, generate 4 DISTINCT, PROMISING, and NON-OBVIOUS startup ideas.

For each idea, think from a different angle:
1. A "quick win" - obvious application with fast path to revenue
2. A "vertical play" - deep niche, less competition  
3. A "platform play" - build infrastructure others can build on
4. A "contrarian bet" - something most would overlook

REQUIREMENTS PER IDEA:
- Must leverage SPECIFIC technical capabilities from the paper (not generic AI)
- Target a SPECIFIC user persona (not "enterprise" or "businesses")
- Be technically FEASIBLE with today's tools
- Have genuine NOVELTY (not "AI for X" or "GPT for Y")
- Have as little competition as possible

OUTPUT JSON ONLY - array of 4 ideas:

{
  "ideas": [
    {
      "angle": "quick win" / "vertical play" / "platform play" / "contrarian",
      "startupName": "Name",
      "oneLiner": "Y Combinator style (what it does)",
      "theHook": "Why NOW? What's the timing?",
      "targetUser": {
        "persona": "Specific role",
        "painPoint": "Exact problem",
        "currentAlternatives": "What they use now"
      },
      "coreTech": "The paper capability this uses",
      "product": {
        "coreFeature": "MVP feature",
        "differentiation": "Why better than alternatives"
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
      },
      "whyThisAngle": "Why this approach makes sense"
    }
  ]
}"""


def build_prompt(meta: dict) -> str:
    return f"""Generate 4 distinct startup ideas from this paper.

Title: {meta.get("title", "")}
Authors: {", ".join(meta.get("authors", []))}
Published: {meta.get("published", "")}
Abstract: {meta.get("abstract", "")[:5000]}

Return ONLY valid JSON with exactly 4 ideas."""


def render_idea(idea: dict, index: int):
    """Render a single idea card."""
    m = idea.get("metrics", {})

    novelty_color = (
        "novelty-high"
        if m.get("novelty") == "High"
        else "novelty-med"
        if m.get("novelty") == "Medium"
        else "novelty-low"
    )
    comp_color = (
        "novelty-high"
        if m.get("competition") == "Low"
        else "novelty-med"
        if m.get("competition") == "Medium"
        else "novelty-low"
    )

    angle = idea.get("angle", "").upper()
    angle_emoji = {
        "QUICK WIN": "⚡",
        "VERTICAL PLAY": "🎯",
        "PLATFORM PLAY": "🏗️",
        "CONTRARIAN": "🤔",
    }.get(angle, "💡")

    with st.container():
        st.markdown(
            f"""
        <div class='idea-card'>
            <div style='display:flex; justify-content:space-between; align-items:center;'>
                <h3 style='margin:0;'>{angle_emoji} {idea.get("startupName", "TBD")}</h3>
                <span class='custom-tag'>{angle}</span>
            </div>
            <p style='margin:0.5rem 0;'><strong>{idea.get("oneLiner", "")}</strong></p>
            <p style='color:var(--text-color); font-size:0.9rem;'>{idea.get("theHook", "")}</p>
        </div>
        """,
            unsafe_allow_html=True,
        )

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Novelty", m.get("novelty", "?"), delta_color="normal")
        with col2:
            st.metric("Competition", m.get("competition", "?"), delta_color="inverse")
        with col3:
            st.metric("Confidence", f"{m.get('confidence', '?')}/10")
        with col4:
            st.metric("MVP", f"{m.get('mvpMonths', '?')}mo")

        with st.expander("📋 Details"):
            st.markdown("**Target User**")
            st.markdown(f"*{idea.get('targetUser', {}).get('persona', 'TBD')}*")
            st.markdown(f"Pain: {idea.get('targetUser', {}).get('painPoint', 'N/A')}")
            st.markdown(
                f"Alternatives: {idea.get('targetUser', {}).get('currentAlternatives', 'N/A')}"
            )

            st.markdown("**Core Tech**")
            st.info(idea.get("coreTech", ""))

            st.markdown("**Product**")
            st.markdown(f"MVP: {idea.get('product', {}).get('coreFeature', '')}")
            st.markdown(f"Diff: {idea.get('product', {}).get('differentiation', '')}")

            st.markdown("**Business**")
            st.markdown(f"Pricing: {idea.get('business', {}).get('pricingModel', '')}")
            st.markdown(f"GTM: {idea.get('business', {}).get('gtm', '')}")

            st.markdown(f"**Why This Angle:** {idea.get('whyThisAngle', '')}")

        st.divider()


def render_analysis(data: dict):
    ideas = data.get("ideas", [])

    if not ideas:
        st.error("No ideas generated")
        return

    if len(ideas) == 1:
        render_idea(ideas[0], 0)
    else:
        for i, idea in enumerate(ideas):
            render_idea(idea, i)


# Sidebar
with st.sidebar:
    st.markdown(
        "<h1 style='font-size: 1.5rem;'>🛠️ Research Forge</h1>", unsafe_allow_html=True
    )
    st.caption("v3.0 | Multi-Idea Engine")
    st.divider()

    arxiv_input = st.text_input(
        "arXiv ID or URL", placeholder="2409.13449 or arxiv.org/abs/..."
    )
    analyze_btn = st.button("Generate Ideas", type="primary", use_container_width=True)

    st.divider()
    st.subheader("📚 History")
    sessions = st.session_state.sessions

    if sessions:
        for arxiv_id, data in sorted(
            sessions.items(), key=lambda x: x[1].get("timestamp", ""), reverse=True
        ):
            col1, col2 = st.columns([4, 1])
            with col1:
                idea_count = len(data.get("data", {}).get("ideas", []))
                if st.button(
                    f"{arxiv_id} ({idea_count} ideas)", key=f"load_{arxiv_id}"
                ):
                    st.session_state.current_arxiv_id = arxiv_id
                    st.rerun()
            with col2:
                if st.button("🗑️", key=f"del_{arxiv_id}"):
                    del st.session_state.sessions[arxiv_id]
                    save_sessions(st.session_state.sessions)
                    st.rerun()
    else:
        st.caption("No analyses yet")

    if st.button("Clear All History", use_container_width=True):
        st.session_state.sessions = {}
        save_sessions({})
        st.rerun()


# Main
if (
    st.session_state.current_arxiv_id
    and st.session_state.current_arxiv_id in st.session_state.sessions
):
    saved_data = st.session_state.sessions[st.session_state.current_arxiv_id]
    st.info(f"📂 Viewing: {st.session_state.current_arxiv_id}")
    if st.button("← Back to Input"):
        st.session_state.current_arxiv_id = None
        st.rerun()
    render_analysis(saved_data.get("data", {}))

elif analyze_btn and arxiv_input:
    arxiv_id = extract_arxiv_id(arxiv_input)

    if not arxiv_id:
        st.error(
            "Invalid arXiv ID or URL. Try: 2409.13449 or https://arxiv.org/abs/2409.13449"
        )
    else:
        with st.spinner("Retrieving paper..."):
            meta = fetch_arxiv_meta(arxiv_id)

        if not meta:
            st.error("Could not find paper on arXiv. Check the ID.")
        else:
            with st.sidebar:
                with st.container():
                    st.markdown(f"**{meta['title'][:60]}...**")
                    st.caption(
                        f"{meta['published'][:10]} | {len(meta['authors'])} authors"
                    )
                with st.expander("Abstract"):
                    st.write(meta["abstract"])

            prog = st.progress(0)
            status = st.status("Analyzing for opportunities...", expanded=True)

            try:
                agent = Agent(
                    model="cerebras:gpt-oss-120b",
                    description=SYSTEM_PROMPT,
                    markdown=False,
                )

                prog.progress(30)
                status.update(label="Generating 4 startup ideas...", state="running")

                full_raw = ""
                for chunk in agent.run(build_prompt(meta), stream=True):
                    content = chunk.content if hasattr(chunk, "content") else str(chunk)
                    if content:
                        full_raw += content

                prog.progress(80)
                status.update(label="Parsing results...", state="running")

                # Parse JSON
                clean = re.sub(r"```json\s*", "", full_raw, flags=re.IGNORECASE)
                clean = re.sub(r"```\s*", "", clean).strip()
                match = re.search(r"\{[\s\S]*\}", clean)

                if not match:
                    st.error("Failed to generate ideas.")
                    with st.expander("Raw output"):
                        st.code(full_raw)
                else:
                    try:
                        data = json.loads(match.group(0))

                        # Save session
                        idea_count = len(data.get("ideas", []))
                        st.session_state.sessions[arxiv_id] = {
                            "timestamp": datetime.now().isoformat(),
                            "productName": f"{idea_count} ideas",
                            "data": data,
                            "meta": meta,
                        }
                        save_sessions(st.session_state.sessions)
                        st.session_state.current_arxiv_id = arxiv_id
                        st.toast(
                            f"Generated {idea_count} ideas for {arxiv_id}", icon="💡"
                        )

                        prog.progress(100)
                        status.update(label="Done", state="complete", expanded=False)
                        render_analysis(data)

                    except json.JSONDecodeError as je:
                        st.error(f"Parse error: {je}")
                        with st.expander("Raw output"):
                            st.code(full_raw)

            except Exception as e:
                st.error(f"Error: {str(e)}")

else:
    st.markdown(
        "<div class='saas-header'>Distill Intelligence.</div>", unsafe_allow_html=True
    )
    st.write("Generate 4 distinct startup ideas from any research paper.")

    st.markdown("""
    **Supported inputs:**
    - `2409.13449` (just the ID)
    - `https://arxiv.org/abs/2409.13449`
    - `https://arxiv.org/pdf/2409.13449.pdf`
    """)

    st.divider()
    c1, c2, c3, c4 = st.columns(4)
    c1.markdown("### ⚡ Quick Win\nObvious application, fast revenue")
    c2.markdown("### 🎯 Vertical Play\nDeep niche, less competition")
    c3.markdown("### 🏗️ Platform\nBuild infrastructure")
    c4.markdown("### 🤔 Contrarian\nOverlooked opportunity")

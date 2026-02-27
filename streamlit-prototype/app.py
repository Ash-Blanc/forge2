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
        except (json.JSONDecodeError, IOError):
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

# Load .env.local from the parent full-stack-web directory or current if available
env_path = os.path.join(os.path.dirname(__file__), "..", "full-stack-web", ".env.local")
load_dotenv(env_path)

st.set_page_config(
    page_title="FORGE | Deep Paper Distillery",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS for modern dashboard feel
st.markdown(
    """
<style>
    /* Make metrics inherit Streamlit theme */
    .stMetric {
        background-color: var(--secondary-background-color) !important;
        padding: 15px;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        border: 1px solid var(--faded-text-10);
    }
    div[data-testid="stExpander"] {
        border-radius: 12px !important;
        background-color: var(--secondary-background-color) !important;
    }
    .saas-header {
        font-weight: 800;
        font-size: 2.8rem;
        background: -webkit-linear-gradient(45deg, #3b82f6, #8b5cf6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.2rem;
    }
    .tag-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
    .custom-tag {
        background-color: var(--secondary-background-color);
        color: var(--text-color);
        padding: 0.2rem 0.6rem;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
        border: 1px solid var(--faded-text-10);
        text-transform: uppercase;
        letter-spacing: 0.025em;
    }
    .innovation-link {
        border-left: 4px solid #3b82f6;
        padding-left: 1rem;
        margin-bottom: 1rem;
        background-color: var(--secondary-background-color);
        color: var(--text-color);
        padding-top: 0.5rem;
        padding-bottom: 0.5rem;
        border-radius: 0 8px 8px 0;
    }
    .swot-s { color: #10b981; font-weight: bold; }
    .swot-w { color: #ef4444; font-weight: bold; }
    .swot-o { color: #3b82f6; font-weight: bold; }
    .swot-t { color: #f59e0b; font-weight: bold; }
    
    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
</style>
""",
    unsafe_allow_html=True,
)


def fetch_arxiv_meta(arxiv_id: str) -> dict:
    url = f"http://export.arxiv.org/api/query?id_list={arxiv_id}"
    try:
        response = urllib.request.urlopen(url)
        xml_data = response.read()
        root = ET.fromstring(xml_data)
        ns = {"default": "http://www.w3.org/2005/Atom"}
        entry = root.find("default:entry", ns)
        if not entry:
            return {}
        title = entry.find("default:title", ns).text
        abstract = entry.find("default:summary", ns).text
        published = entry.find("default:published", ns).text
        authors = [
            author.find("default:name", ns).text
            for author in entry.findall("default:author", ns)
        ]
        return {
            "title": title.strip().replace("\n", " "),
            "authors": authors,
            "published": published,
            "abstract": abstract.strip().replace("\n", " "),
        }
    except Exception as e:
        st.error(f"Failed to fetch from arXiv: {e}")
        return {}


SYSTEM_PROMPT = """You are FORGE — an elite VC analyst and product strategist. You specialize in Deep Tech Commercialization.
Your goal is to perform a Multi-Pass Analysis of a research paper and translate it into a structured SaaS blueprint.

STRATEGY:
1. TECHNICAL EXTRACTION: Identify the specific breakthrough. Distinguish between 'incremental' and 'quantum' leaps.
2. INNOVATION MAPPING: Every SaaS feature MUST be tied back to a specific innovation or metric from the paper.
3. SKEPTICAL DUE DILIGENCE: Act as a Devil's Advocate. What are the 'unverifiable' claims?

PROCESS:
1. BEFORE outputting JSON, deeply analyze the paper by considering the technical feasibility, market constraints, and mapping innovations to real product features. Output this step-by-step reasoning inside <thinking> ... </thinking> tags.
2. After your thinking process, you MUST return ONLY a single valid JSON object.

OUTPUT FORMAT:
<thinking>
[Your exhaustive SWOT, technical roast, and ideation validation goes here.]
</thinking>
{
  "paperAnalysis": {
    "title": "Clean version of paper title",
    "coreBreakthrough": "1-2 sentence technical summary",
    "technicalArchitecture": "High-level description of the methodology/stack",
    "keyInnovations": ["Innovation A: description", "Innovation B: description"],
    "limitations": ["Limitation A", "Limitation B"]
  },
  "saasBlueprint": {
    "productName": "Startup Name",
    "oneLiner": "Value prop",
    "targetCustomer": "Niche audience",
    "innovationMapping": [
        {"innovation": "Reference to paper innovation", "productFeature": "Resulting product capability"}
    ],
    "metrics": {
       "complexity": "Low/Med/High",
       "mvpDays": 30,
       "confidence": "Scale 1-10"
    }
  },
  "roast": {
    "swot": {
       "strengths": [".."],
       "weaknesses": [".."],
       "opportunities": [".."],
       "threats": [".."]
    },
    "technicalRoast": "A blunt 2-sentence reality check on implementation risks."
  },
  "tags": ["Tag1", "Tag2"]
}"""


def build_prompt(meta: dict) -> str:
    return f"""Analyze this research paper and distill it into a deep tech commercialization blueprint.

Title: {meta.get("title", "")}
Authors: {", ".join(meta.get("authors", []))}
Abstract: {meta.get("abstract", "")[:3000]}

Be aggressive, specific, and technically grounded. Ensure the 'innovationMapping' creates a direct line between the research and the product. Return ONLY raw JSON."""


# Sidebar UI
with st.sidebar:
    st.markdown(
        "<h1 style='font-size: 1.5rem;'>🛠️ Research Forge</h1>", unsafe_allow_html=True
    )
    st.caption("v2.0 | Deep Tech Distillery")
    st.divider()

    arxiv_input = st.text_input(
        "arXiv ID",
        placeholder="e.g. 1706.03762",
        help="The identifier for the paper to be analyzed.",
    )
    analyze_btn = st.button(
        "Distill Blueprint", type="primary", use_container_width=True
    )

    st.divider()

    # History section
    st.subheader("📚 History")
    sessions = st.session_state.sessions

    if sessions:
        sorted_sessions = sorted(
            sessions.items(), key=lambda x: x[1].get("timestamp", ""), reverse=True
        )
        for arxiv_id, data in sorted_sessions:
            col1, col2 = st.columns([4, 1])
            with col1:
                if st.button(
                    f"{data.get('productName', arxiv_id)}",
                    key=f"load_{arxiv_id}",
                    help=arxiv_id,
                ):
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

    if st.button("Clear All History", use_container_width=True):
        st.session_state.sessions = {}
        st.session_state.current_arxiv_id = None
        save_sessions({})
        st.rerun()

    st.divider()
    meta_sidebar = st.empty()


# Main Logic
def render_analysis(data: dict, meta: dict = None):
    paper = data.get("paperAnalysis", {})
    saas = data.get("saasBlueprint", {})
    roast = data.get("roast", {})

    st.markdown(
        f"<div class='saas-header'>{saas.get('productName', 'Nexus')}</div>",
        unsafe_allow_html=True,
    )
    st.markdown(f"**{saas.get('oneLiner', '')}**")

    tags_html = "".join(
        [f"<span class='custom-tag'>{t}</span>" for t in data.get("tags", [])]
    )
    st.markdown(
        f"<div class='tag-container'>{tags_html}</div><br/>", unsafe_allow_html=True
    )

    tab1, tab2, tab3 = st.tabs(
        ["📄 Research Deep-Dive", "💡 SaaS Blueprint", "⚖️ SWOT & Roast"]
    )

    with tab1:
        st.subheader("Core Breakthrough")
        st.info(paper.get("coreBreakthrough", ""))

        st.subheader("Technical Architecture")
        st.write(paper.get("technicalArchitecture", ""))

        colA, colB = st.columns(2)
        with colA:
            st.markdown("**Key Innovations**")
            for inn in paper.get("keyInnovations", []):
                st.markdown(f"- {inn}")
        with colB:
            st.markdown("**Technical Constraints**")
            for lim in paper.get("limitations", []):
                st.markdown(f"- {lim}")

    with tab2:
        m = saas.get("metrics", {})
        c1, c2, c3 = st.columns(3)
        c1.metric("Build Complexity", m.get("complexity", "N/A"))
        c2.metric("MVP Timeline", f"{m.get('mvpDays', 'N/A')} Days")
        c3.metric("Forge Confidence", f"{m.get('confidence', 'N/A')}/10")

        st.divider()
        st.subheader("Innovation-to-Feature Mapping")
        for mapping in saas.get("innovationMapping", []):
            with st.container():
                st.markdown(
                    f"""
                <div class='innovation-link'>
                    <b>Innovation:</b> {mapping.get("innovation")}<br/>
                    <span style='color: #64748b'>↳ Impact:</span> {mapping.get("productFeature")}
                </div>
                """,
                    unsafe_allow_html=True,
                )

        st.divider()
        st.markdown(f"**Target Early Adopter:** {saas.get('targetCustomer', 'N/A')}")

    with tab3:
        swot = roast.get("swot", {})
        sc1, sc2 = st.columns(2)
        with sc1:
            st.markdown("<span class='swot-s'>Strengths</span>", unsafe_allow_html=True)
            for item in swot.get("strengths", []):
                st.write(f"✓ {item}")
            st.markdown(
                "<span class='swot-o'>Opportunities</span>", unsafe_allow_html=True
            )
            for item in swot.get("opportunities", []):
                st.write(f"＋ {item}")
        with sc2:
            st.markdown(
                "<span class='swot-w'>Weaknesses</span>", unsafe_allow_html=True
            )
            for item in swot.get("weaknesses", []):
                st.write(f"✗ {item}")
            st.markdown("<span class='swot-t'>Threats</span>", unsafe_allow_html=True)
            for item in swot.get("threats", []):
                st.write(f"⚠ {item}")

        st.divider()
        st.subheader("The Reality Check")
        st.warning(roast.get("technicalRoast", "No roast provided."))


if (
    st.session_state.current_arxiv_id
    and st.session_state.current_arxiv_id in st.session_state.sessions
):
    saved_data = st.session_state.sessions[st.session_state.current_arxiv_id]
    st.info(f"📂 Viewing saved analysis: {st.session_state.current_arxiv_id}")
    if st.button("Clear Selection"):
        st.session_state.current_arxiv_id = None
        st.rerun()
    render_analysis(saved_data.get("data", {}))
elif analyze_btn and arxiv_input:
    # Extract ID
    arxiv_id = arxiv_input.split("/")[-1].replace(".pdf", "")
    id_match = re.search(r"(\d{4}\.\d{4,5}(v\d+)?)", arxiv_id)
    if id_match:
        arxiv_id = id_match.group(1)

    with st.spinner("Retrieving Artifact..."):
        meta = fetch_arxiv_meta(arxiv_id)

    if meta:
        with meta_sidebar.container():
            st.markdown(f"**{meta['title']}**")
            st.caption(f"{meta['published'][:10]} | {len(meta['authors'])} Authors")
            with st.expander("Source Abstract"):
                st.write(meta["abstract"])

        st.markdown(f"### Distillery status...")
        prog = st.progress(0)
        status = st.status("Initializing Analysis Engine...", expanded=True)

        # Stream area
        with st.expander("🤔 Agent Thinking Process", expanded=True):
            thought_placeholder = st.empty()
        output_placeholder = st.empty()

        try:
            agent = Agent(
                model="cerebras:gpt-oss-120b",
                description=SYSTEM_PROMPT,
                reasoning=True,
                markdown=False,
            )

            # Step 1: Theoretical Analysis
            status.update(
                label="Reading paper through multi-pass lens...", state="running"
            )
            prog.progress(25)

            # Step 2: SaaS Mapping
            status.update(
                label="Mapping technical breakthroughs to product features...",
                state="running",
            )
            prog.progress(50)

            full_raw = ""
            thinking_content = ""
            
            for chunk in agent.run(build_prompt(meta), stream=True):
                # Agno natively populates chunk.reasoning if supported
                if hasattr(chunk, "reasoning") and chunk.reasoning:
                    thinking_content += chunk.reasoning
                    thought_placeholder.markdown(thinking_content + "▌")
                
                content = chunk.content if hasattr(chunk, "content") else str(chunk)
                if content:
                    full_raw += content
                    
                    # Manual fallback for models returning <thinking> tags inline
                    if "<thinking>" in full_raw and "</thinking>" not in full_raw:
                        parts = full_raw.split("<thinking>")
                        if len(parts) > 1:
                            thinking_content = parts[1]
                            thought_placeholder.markdown(thinking_content + "▌")
                    elif "</thinking>" in full_raw:
                        parts = full_raw.split("</thinking>")
                        thinking_content = parts[0].replace("<thinking>", "")
                        thought_placeholder.markdown(thinking_content)
                        json_content = parts[1]
                        if json_content.strip():
                            output_placeholder.code(json_content + "▌", language="json")
                    elif not thinking_content:
                        # Fallback if no reasoning tags are detected
                        output_placeholder.code(full_raw, language="json")

            # Finalize thinking UI
            if thinking_content:
                thought_placeholder.markdown(thinking_content)

            status.update(
                label="Analysis complete. Rendering dashboard.",
                state="complete",
                expanded=False,
            )
            prog.progress(100)
            output_placeholder.empty()

            # Parse
            clean = re.sub(r"```json\s*", "", full_raw, flags=re.IGNORECASE)
            clean = re.sub(r"```\s*", "", clean).strip()
            # Clean out the thinking section entirely before JSON parsing
            clean = re.sub(r"<thinking>.*?</thinking>", "", clean, flags=re.DOTALL)
            match = re.search(r"\{[\s\S]*\}", clean)

            if match:
                data = json.loads(match.group(0))

                # Save to persistent session
                st.session_state.sessions[arxiv_id] = {
                    "timestamp": datetime.now().isoformat(),
                    "productName": data.get("saasBlueprint", {}).get(
                        "productName", "Untitled"
                    ),
                    "data": data,
                    "meta": meta,
                }
                save_sessions(st.session_state.sessions)
                st.session_state.current_arxiv_id = arxiv_id
                st.toast(f"Saved analysis for {arxiv_id}", icon="💾")

                paper = data.get("paperAnalysis", {})
                saas = data.get("saasBlueprint", {})
                roast = data.get("roast", {})

                # --- HEADER ---
                st.markdown(
                    f"<div class='saas-header'>{saas.get('productName', 'Nexus')}</div>",
                    unsafe_allow_html=True,
                )
                st.markdown(f"**{saas.get('oneLiner', '')}**")

                tags_html = "".join(
                    [
                        f"<span class='custom-tag'>{t}</span>"
                        for t in data.get("tags", [])
                    ]
                )
                st.markdown(
                    f"<div class='tag-container'>{tags_html}</div><br/>",
                    unsafe_allow_html=True,
                )

                # --- DASHBOARD TABS ---
                tab1, tab2, tab3 = st.tabs(
                    ["📄 Research Deep-Dive", "💡 SaaS Blueprint", "⚖️ SWOT & Roast"]
                )

                with tab1:
                    st.subheader("Core Breakthrough")
                    st.info(paper.get("coreBreakthrough", ""))

                    st.subheader("Technical Architecture")
                    st.write(paper.get("technicalArchitecture", ""))

                    colA, colB = st.columns(2)
                    with colA:
                        st.markdown("**Key Innovations**")
                        for inn in paper.get("keyInnovations", []):
                            st.markdown(f"- {inn}")
                    with colB:
                        st.markdown("**Technical Constraints**")
                        for lim in paper.get("limitations", []):
                            st.markdown(f"- {lim}")

                with tab2:
                    m = saas.get("metrics", {})
                    c1, c2, c3 = st.columns(3)
                    c1.metric("Build Complexity", m.get("complexity", "N/A"))
                    c2.metric("MVP Timeline", f"{m.get('mvpDays', 'N/A')} Days")
                    c3.metric("Forge Confidence", f"{m.get('confidence', 'N/A')}/10")

                    st.divider()
                    st.subheader("Innovation-to-Feature Mapping")
                    for mapping in saas.get("innovationMapping", []):
                        with st.container():
                            st.markdown(
                                f"""
                            <div class='innovation-link'>
                                <b>Innovation:</b> {mapping.get("innovation")}<br/>
                                <span style='color: #64748b'>↳ Impact:</span> {mapping.get("productFeature")}
                            </div>
                            """,
                                unsafe_allow_html=True,
                            )

                    st.divider()
                    st.markdown(
                        f"**Target Early Adopter:** {saas.get('targetCustomer', 'N/A')}"
                    )

                with tab3:
                    swot = roast.get("swot", {})
                    sc1, sc2 = st.columns(2)
                    with sc1:
                        st.markdown(
                            "<span class='swot-s'>Strengths</span>",
                            unsafe_allow_html=True,
                        )
                        for item in swot.get("strengths", []):
                            st.write(f"✓ {item}")
                        st.markdown(
                            "<span class='swot-o'>Opportunities</span>",
                            unsafe_allow_html=True,
                        )
                        for item in swot.get("opportunities", []):
                            st.write(f"＋ {item}")
                    with sc2:
                        st.markdown(
                            "<span class='swot-w'>Weaknesses</span>",
                            unsafe_allow_html=True,
                        )
                        for item in swot.get("weaknesses", []):
                            st.write(f"✗ {item}")
                        st.markdown(
                            "<span class='swot-t'>Threats</span>",
                            unsafe_allow_html=True,
                        )
                        for item in swot.get("threats", []):
                            st.write(f"⚠ {item}")

                    st.divider()
                    st.subheader("The Reality Check")
                    st.warning(roast.get("technicalRoast", "No roast provided."))

            else:
                st.error("Engine failed to generate structured JSON.")
                st.code(full_raw)

        except Exception as e:
            st.error(f"Distillery Fault: {str(e)}")
    else:
        st.error("Could not locate research artifact on arXiv servers.")

elif not analyze_btn:
    # Empty State
    st.markdown(
        "<div class='saas-header'>Distill Intelligence.</div>", unsafe_allow_html=True
    )
    st.write(
        "The Forge interface converts peer-reviewed breakthroughs into specific, defensible SaaS blueprints. Enter an arXiv ID to begin."
    )

    st.divider()
    c1, c2, c3 = st.columns(3)
    c1.markdown(
        "### 01. Ingest\nFetch high-fidelity research metadata directly from arXiv APIs."
    )
    c2.markdown(
        "### 02. Map\nIdentify the sub-millisecond breakthroughs that provide unfair advantages."
    )
    c3.markdown(
        "### 03. Deploy\nReceive a technical roadmap, risk-adjusted SWOT, and target customer profiles."
    )

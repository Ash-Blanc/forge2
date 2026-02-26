# ResearchForge: Instant Research Paper Prototyper

## 🚀 The Vision

**ResearchForge** is a platform built for the **Amazon Nova AI Hackathon**. It helps researchers instantly turn static research papers into testable prototypes or codebases. Instead of spending weeks manually implementing algorithms or architectures from papers just to test an idea, researchers can simply upload a paper and start testing in minutes.

---

## 🏆 Hackathon Alignment

**Hackathon:** [Amazon Nova AI Hackathon](https://amazon-nova.devpost.com/)
**Focus Categories:**

1. **Agentic AI:** Agents using Amazon Nova's reasoning capabilities to ingest paper methodology and iteratively write, test, and debug code.
2. **Multimodal Understanding:** Ingesting and understanding PDFs (text, math equations, and diagrams) using Nova foundation models.
3. **Voice AI (Bonus):** Conversational voice experiences using *Nova 2 Sonic* to let users literally "talk" to their research paper or the generated prototype.

### How we use Amazon Nova:

- **Nova 2 Lite (Reasoning):** Extracts the core algorithms, constraints, and architecture from the uploaded research text. Drives the multi-agent system that generates the prototype code (React, Python, etc.).
- **Nova Multimodal Embeddings:** Powers our RAG (Retrieval-Augmented Generation) pipeline to help process massive, complex research papers. It extracts and understands information from charts, graphs, and system architecture diagrams.
- **Nova 2 Sonic (Speech):** Allows researchers to have realtime Q&A sessions with the paper.
- **Nova Act (UI/Agents):** Automates the scaffolding of the testing environment on the user's behalf.

---

## 👥 Team & Roles (18-Day Accelerated Timeline)

With the help of AI coding tools, we are compressing our robust SaaS-level product scope into an aggressive **18-day limit**, pushing hard to deliver all advanced features.

### 1. Backend & AI Engineer (Dev 1)

- **Focus:** AI pipelines, Agents, and AWS integration.
- **Tasks:**
  - Set up AWS credentials and Amazon Nova API integrations.
  - Build a robust PDF/text ingestion pipeline with OCR and parsing for math formulas.
  - Implement a **Multi-Agent generative loop** via LangChain or custom logic: Agent 1 reads, Agent 2 writes code, Agent 3 reviews against paper constraints.
  - Set up a Vector Database (e.g., Pinecone or pgvector in Supabase) and use **Nova Multimodal Embeddings**.
  - *(Stretch)* Integrate **Nova 2 Sonic** for voice-based interactions with the paper.

### 2. Full-stack & Systems Engineer (Dev 2)

- **Focus:** App architecture, execution environment, and backend services.
- **Tasks:**
  - Build the Next.js API ecosystem.
  - Set up Supabase DB and Authentication.
  - Build a cloud sandbox execution environment (e.g., using Docker or WebContainers) so users can *run* the generated prototype directly in the browser!
  - Handle complex state management and WebSocket connections for real-time AI generation streaming.

### 3. UI/UX Designer & Frontend (Beginner UI/UX)

- **Focus:** High-end aesthetics, micro-interactions, and a premium seamless user journey.
- **Tasks:**
  - Design a breathtaking, modern landing page with dark mode, glassmorphism, and subtle gradients.
  - Use `shadcn/ui` and `Tailwind CSS` to build complex components effortlessly.
  - Focus heavily on "Empty States" and "Loading States" (e.g., a really cool animation while the paper is being processed by Nova).
  - Create the interactive workspace view: PDF on one side, chat interface, and live code execution on the other side.
  - Iterate on user feedback to make the app incredibly intuitive.

---

## 🛠️ Tech Stack

- **Frontend / Fullstack:** Next.js (App Router), React, TypeScript.
- **Database & Auth:** Supabase (Postgres with pgvector for RAG).
- **Core AI / LLM Engine:** AWS Amazon Nova (Nova 2 Lite, Multimodal Embeddings, Sonic, Act).
- **Styling & UI:** Tailwind CSS, framer-motion (for animations), shadcn/ui.
- **Execution Engine:** WebContainers API (to run Node/Python seamlessly in the browser).

---

## 🗺️ 18-Day Implementation Strategy

### Phase 1: Foundation & Ingestion (Days 1-4)

- **Goal:** Get the core infrastructure up and process our first paper.
- **Tasks:**
  - Setup Next.js, Supabase, and AWS Nova SDKs.
  - Build the frontend shell (Auth, Dashboard, Upload pages).
  - Create the PDF parsing pipeline: Extract text, tables, and images.
  - Feed the parsed data into Nova Multimodal Embeddings and store it in Supabase pgvector.

### Phase 2: The Agentic Engine (Days 5-9)

- **Goal:** Nova successfully generates accurate code based on a paper.
- **Tasks:**
  - Develop the multi-agent reasoning loop using Nova 2 Lite.
  - Prompt Engineering: Teach the model how to translate academic language into workable code (Python scripts or React components).
  - Build the chat interface that allows users to ask questions ("Can you explain the loss function used?") using the RAG pipeline.
  - **Milestone:** We can upload a paper and get a raw code output back visually on screen.

### Phase 3: Execution & Features (Days 10-14)

- **Goal:** Run the code and add advanced Nova features.
- **Tasks:**
  - Integrate a code editor (like Monaco Editor) and a Sandbox (WebContainers) to let the code run in the browser.
  - Implement **Nova 2 Sonic** so the user can use their microphone to dictate changes ("Change the background to blue" -> Code updates).
  - Implement the architecture to zip and download the generated repository.

### Phase 4: Polish, Testing, & Final Submission (Days 15-18)

- **Goal:** Make it look like a million-dollar startup.
- **Tasks:**
  - Final UI/UX pass: Ensure colors, typography (e.g., Outfit font), and animations are perfect.
  - Bug squashing and handling edge cases (e.g., unsupported PDFs).
  - **Record the 3-minute Demo Video**. This needs a strong script highlighting the business value and Amazon Nova usage!
  - Write the Devpost project description.
  - Publish an optional blog post on `builder.aws.com` for the extra prize points.

---

## 🎯 Important Hackathon Requirements to Keep in Mind

- **Categories:** Make sure to specifically tag our solution in **Agentic AI** and **Multimodal Understanding**.
- **Code Repo:** Ensure our repo is ready to be shared (public or invite-only).
- **Hashtag:** Use `#AmazonNova` generated content or videos.

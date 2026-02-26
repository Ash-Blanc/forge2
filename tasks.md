# 📋 ResearchForge: 18-Day Accelerated Task List

This document acts as our project management tracker. With the help of AI coding tools, we are compressing a 1-month roadmap into an aggressive **18-Day Sprint**, keeping all advanced features intact.

It breaks down the timeline into actionable tasks assigned to the specific roles:
- **[DEV-1] Backend & AI Engineer**
- **[DEV-2] Full-stack & Systems Engineer**
- **[UI/UX] UI/UX Designer & Frontend**

---

## ⚡ Phase 1: Foundation & Data Ingestion (Days 1-4)
*Goal: Get the core infrastructure up, database connected, and successfully parse our first PDF paper into our vector database.*

### [DEV-1] Backend & AI Engineer
- [ ] Set up AWS IAM User and get API keys for Amazon Nova Models.
- [ ] Test Amazon Nova 2 Lite API with a basic "Hello World" script in Node.js/Python.
- [ ] Build a PDF parsing utility (using something like `pdf-parse` or `pdf2json`).
- [ ] Implement text chunking for the parsed PDF data.
- [ ] Set up connection to Supabase and figure out how to insert data into `pgvector`.

### [DEV-2] Full-stack & Systems Engineer
- [ ] Setup Next.js App Router project architecture (Routing, Layouts).
- [ ] Setup Supabase connection in Next.js (Auth and Database clients).
- [ ] Create API route `/api/upload` to handle PDF file uploads from the frontend.
- [ ] Implement user authentication (sign up/login) via Supabase Auth.
- [ ] Set up database schemas (Tables: `users`, `papers`, `generated_code`).

### [UI/UX] UI/UX Designer & Frontend
- [ ] Define the visual identity: Color palette (e.g., dark theme with neon accents), typography (e.g., Inter or Outfit), and logo concept.
- [ ] Set up `shadcn/ui` and configure Tailwind CSS variables.
- [ ] Design and implement the **Landing Page** (Hero section, value props).
- [ ] Design and implement the **Authentication Pages** (Login / Signup).
- [ ] Design the **Dashboard Layout** (Sidebar, Header, Main Content Area).

---

## 🧠 Phase 2: The Agentic Intelligence Layer (Days 5-9)
*Goal: Nova successfully answers questions about the paper (RAG) and can generate a rough code prototype based on the paper's contents.*

### [DEV-1] Backend & AI Engineer
- [ ] Feed chunked PDF text into **Nova Multimodal Embeddings** to generate vectors.
- [ ] Save the generated vectors into Supabase.
- [ ] Write the vector similarity search function (RAG retrieval).
- [ ] **Core Agent Loop:** Write the system prompt for Nova 2 Lite to generate a code prototype from the retrieved paper chunks.
- [ ] Create API route `/api/chat` for the user to ask questions about the paper.

### [DEV-2] Full-stack & Systems Engineer
- [ ] Connect the frontend upload zone to the `/api/upload` route.
- [ ] Build the API route `/api/generate-prototype` that calls DEV-1's agent loop.
- [ ] Implement streaming responses (Server-Sent Events) so the frontend shows the code being written line-by-line.
- [ ] Save the AI-generated code output into the Supabase database.

### [UI/UX] UI/UX Designer & Frontend
- [ ] Design and implement the **File Upload Component** (Drag & Drop zone, loading animations).
- [ ] Design the **Processing State**: A beautiful "thinking" animation with status updates ("Parsing PDF...", "Analyzing architecture...").
- [ ] Design and implement the **Workspace View**: 
  - Left panel: PDF Viewer.
  - Right panel: Chat interface / Generated Code block.

---

## 🚀 Phase 3: Execution Sandbox & Advanced Features (Days 10-14)
*Goal: Take the generated raw code and actually *run* it in the browser, plus add Voice AI integration.*

### [DEV-1] Backend & AI Engineer
- [ ] Implement **Nova 2 Sonic** to allow speech-to-speech or speech-to-text chat.
- [ ] Train/Prompt the agent to output code in a strictly structured JSON format so it can be safely executed by the frontend.
- [ ] Improve Agent reasoning: Add a self-correction loop (if code fails, the agent tries to fix it).

### [DEV-2] Full-stack & Systems Engineer
- [ ] Integrate a code editor component (e.g., `monaco-editor` or `react-simple-code-editor`).
- [ ] **The Big Feature:** Integrate WebContainers API to run the Node.js or Python code directly inside the user's browser.
- [ ] Build the bridge between the AI output and the WebContainer (saving files into the virtual file system).
- [ ] Build a "Download as .zip" feature for the generated codebase.

### [UI/UX] UI/UX Designer & Frontend
- [ ] Style the **Code Editor** to look like a premium IDE (VS Code dark theme style).
- [ ] Design the **Sandbox Output Window** (where the console logs or UI of the generated prototype appears).
- [ ] Add a Voice Interaction UI (Microphone button with subtle pulse animation when recording).
- [ ] Handle error states beautifully (e.g., if code fails to run, show a nice "Ask Nova to fix this" button).

---

## 🎬 Phase 4: Polish, Squashing Bugs & Launch Prep (Days 15-18)
*Goal: Make the platform feel like a million-dollar tool, test everything, and record the Hackathon submission video.*

### [DEV-1] Backend & AI Engineer
- [ ] Stress test the AI with wildly different types of research papers (Math heavy, Architecture heavy, Text heavy).
- [ ] Optimize prompts to reduce latency and cost.
- [ ] Clean up and document the Python/Node scripts in the backend.

### [DEV-2] Full-stack & Systems Engineer
- [ ] Optimize database queries and API response times.
- [ ] Ensure the Next.js app is production-ready and deploy to Vercel.
- [ ] Handle edge cases (e.g., What happens if a user uploads a 100-page PDF?).
- [ ] Conduct end-to-end bug hunting.

### [UI/UX] UI/UX Designer & Frontend
- [ ] Conduct a full UX audit: Are there too many clicks? Is the text readable?
- [ ] Add micro-interactions (hover states, smooth page transitions via Framer Motion).
- [ ] Prepare all visual assets needed for the Devpost submission (Logos, Screenshots, Banners).

### 🏆 ENTIRE TEAM (Days 16-18)
- [ ] Script the 3-minute demo video.
- [ ] Record the screen capture of the "Happy Path" (working perfectly).
- [ ] Edit the demo video and add the `#AmazonNova` hashtag.
- [ ] Write the Devpost project description.
- [ ] **SUBMIT THE PROJECT!**

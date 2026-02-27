# FORGE 

FORGE is an AI intelligence application designed to distill complex, dense information (like academic arXiv papers) into actionable SaaS opportunities, business blueprints, and technical risk assessments. 

## Repository Structure

This repository now contains two distinct approaches to the FORGE platform:

### 1. [full-stack-web/](./full-stack-web)
The original, production-ready Next.js application.
- **Frontend**: Next.js 15, Tailwind CSS, DaisyUI 5
- **Backend**: Next.js API Routes + Supabase
- **AI Engine**: Python FastAPI microservice utilizing `Agno` agents and `Cerebras` 120B models to parse arXiv data and stream structured JSON back to the client.
- **Getting Started**:
  ```bash
  # In full-stack-web
  bun install
  bun run dev
  
  # To run the AI microservice
  cd agents
  python server.py
  ```

### 2. [streamlit-prototype/](./streamlit-prototype)
A lightweight, high-speed Python prototype demonstrating the core value of the FORGE intelligence engine without the overhead of a full web framework.
- **Frontend/Backend**: Streamlit
- **AI Engine**: Natively imports `Agno` to run the Cerebras 120B inference loop in-process. 
- **Features**: Highly structured "Deep Tech Distillery" dashboard including multi-pass research extraction, SaaS opportunity mapping, and a brutal Devil's Advocate technical roast.
- **Getting Started**:
  ```bash
  # In streamlit-prototype
  uv venv
  source .venv/bin/activate
  uv pip install -r requirements.txt
  streamlit run app.py
  ```

## AI Configuration
Both applications rely on the `Cerebras` Inference API for lightning-fast capability using the `Llama3.3-70b` or `gpt-oss-120b` models.

Ensure you have a `.env.local` file at the root of `full-stack-web/` containing:
```env
CEREBRAS_API_KEY=your_key_here
```
*(The Streamlit prototype is configured to automatically look for this key in the Next.js directory to prevent duplication).*

#!/bin/bash

# This trap ensures that when you press Ctrl+C, it kills both the background processes (frontend and backend)
trap 'echo -e "
Shutting down FORGE..."; kill 0' SIGINT

echo "🚀 Starting FORGE Development Environment..."

echo "⚡ Starting frontend (Next.js)..."
(cd forge-app && bun i && bun dev) &

echo "🐍 Starting backend (Python)..."
(cd forge-app/agents && source .venv/bin/activate && uv run -m server) &

# Wait for all background jobs to complete
wait

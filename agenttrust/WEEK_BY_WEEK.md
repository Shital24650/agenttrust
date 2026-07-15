# AgentTrust Development Plan — Week-by-Week Roadmap

This document outlines the detailed development roadmap for AgentTrust.

---

## Phase 1 — Core Harness & Deterministic Evals

### Week 1 — Schema Design & Mock Tooling
- Define Python `Category` enum for the 5 failure modes.
- Code `Task` schemas and category-specific validation parameters.
- Build deterministic seeded tools under `tools/tool_suite.py` to create stable scenarios (e.g., specific truncate markers in database responses, exact prompt injections, seeded random temperature anomalies).
- Draft the primary 5 core benchmark tasks.

### Week 2 — Backbones & Agent Runners
- Implement pluggable Backbone interfaces.
- Code `MockBackbone` to enable local offline verification of scoring thresholds.
- Code `GeminiBackbone` using modern `google-genai` SDK and JSON-mode options.
- Establish the plain-Python agent runner state machine supporting sequential step tracing.
- Set up deterministic rule-based scoring criteria per category.

---

## Phase 2 — Orchestration, Observability, and UI

### Week 3 — Task Expansion & Live Dashboards
- Expand the `task_bank.py` to 60 distinct testing tasks, ensuring balanced distribution across all five failure categories.
- Create a full-stack dashboard (React + Express server) to visualize benchmarks, run tasks live, inspect step-by-step trace chains, and compare backbone performances.
- Provide direct download packages for developers to pull the code and run local CLI runs.

### Week 4 — LangGraph & Tracing (Phase 2 Orchestration)
- Rebuild the core runner using LangGraph state graphs as an alternative orchestration option.
- Implement observability hooks using Langfuse to track latency, token usage, and prompt-to-response traces.
- Introduce an LLM-as-a-judge scoring layer, validating agreement metrics against human-annotated ground truths (`scoring/human_labels.csv`).
- Package and deploy the public-facing benchmark results leaderboard.

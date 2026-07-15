# AgentTrust — Reliability Benchmark for Tool-Using LLM Agents

AgentTrust is a controlled, reproducible benchmark and evaluation harness designed to measure how tool-using LLM agents fail under five specific failure modes:

1. **TOOL_SELECTION** — picking the correct tool among plausible distractors.
2. **ERROR_RECOVERY** — noticing and recovering from malformed/truncated database inputs (rather than confidently presenting broken data as valid).
3. **FAITHFULNESS** — adhering strictly to factual values returned by tools without hallucinating or embellishing details.
4. **ADVERSARIAL** — resisting embedded prompt injections within tool payloads and treating them strictly as data.
5. **COMPOUNDING** — detecting and flagging anomalous sensor readings/values rather than silently averaging them into propagates.

---

## Project Structure

```
agenttrust/
  tasks/
    schema.py         # Task dataclasses & Category definitions
    task_bank.py      # Expanded bank of 60 test tasks across all 5 categories
  tools/
    tool_suite.py     # Deterministic, seeded mock tools
  agents/
    backbones.py      # Pluggable model interfaces: Mock, Anthropic, HF, Gemini
    agent_runner.py   # State-machine agent loop with steps trace
  scoring/
    scorer.py         # Deterministic, category-specific scoring rules
  run_eval.py         # CLI entry point to run evaluations
  requirements.txt    # Python dependencies
  WEEK_BY_WEEK.md     # Development roadmap & lifecycle
```

---

## Setup & Installation

1. Clone or download this project folder.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set your API keys in your environment:
   ```bash
   export GEMINI_API_KEY="your-key-here"
   export ANTHROPIC_API_KEY="your-key-here"
   export HF_TOKEN="your-key-here"
   ```

---

## How to Run Evaluations

You can run the eval harness using `run_eval.py`:

### 1. Run with Mock Backbone (No API Keys needed)
```bash
python run_eval.py --backbone mock
```
*Note: The mock backbone will deliberately fail Error Recovery and Adversarial tasks, proving that the evaluation harness correctly detects failing agents.*

### 2. Run with Google Gemini
```bash
python run_eval.py --backbone gemini --model gemini-3.5-flash
```

### 3. Run with Anthropic Claude
```bash
python run_eval.py --backbone anthropic --model claude-3-5-sonnet-20241022
```

### 4. Run with Hugging Face Models
```bash
python run_eval.py --backbone hf --model Qwen/Qwen2.5-7B-Instruct
```

---

## Output

Evaluations run sequentially, logging progress to the terminal. Upon completion, a summary table is displayed and full task-by-task results (including prompts, final responses, status, and execution times) are saved to:
```
results/latest.csv
```

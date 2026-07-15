import os
import csv
import argparse
from typing import List
from agenttrust.tasks.task_bank import TASK_BANK
from agenttrust.agents.backbones import MockBackbone, AnthropicBackbone, HFBackbone, GeminiBackbone
from agenttrust.agents.agent_runner import AgentRunner
from agenttrust.scoring.scorer import Scorer

def main():
    parser = argparse.ArgumentParser(description="AgentTrust — Reliability Benchmark for Tool-Using LLM Agents")
    parser.add_argument("--backbone", type=str, required=True, choices=["mock", "anthropic", "hf", "gemini"],
                        help="The backbone LLM to run: mock, anthropic, hf, or gemini")
    parser.add_argument("--model", type=str, default=None,
                        help="Optional specific model name to use (defaults depend on the backbone selected)")
    parser.add_argument("--max-steps", type=int, default=6,
                        help="Maximum steps in the agent loop")
    
    args = parser.parse_args()
    
    # Initialize Backbone
    if args.backbone == "mock":
        backbone = MockBackbone()
        model_name = "mock-script"
    elif args.backbone == "anthropic":
        model_name = args.model or "claude-3-5-sonnet-20241022"
        backbone = AnthropicBackbone(model=model_name)
    elif args.backbone == "hf":
        model_name = args.model or "Qwen/Qwen2.5-7B-Instruct"
        backbone = HFBackbone(model=model_name)
    elif args.backbone == "gemini":
        model_name = args.model or "gemini-3.5-flash"
        backbone = GeminiBackbone(model=model_name)
        
    print("=" * 60)
    print(f"AgentTrust Eval Harness — Running Benchmark")
    print(f"Backbone: {args.backbone.upper()}")
    print(f"Model:    {model_name}")
    print(f"Tasks:    {len(TASK_BANK)}")
    print("=" * 60)
    
    runner = AgentRunner(backbone=backbone, max_steps=args.max_steps)
    scorer = Scorer()
    
    results = []
    passed_count = 0
    
    # Ensure results directory exists
    os.makedirs("results", exist_ok=True)
    
    for idx, task in enumerate(TASK_BANK):
        print(f"[{idx+1}/{len(TASK_BANK)}] Running Task {task.id} ({task.category.value})...")
        
        try:
            run_result = runner.run_task(task)
            passed, reason = scorer.score(task, run_result)
        except Exception as e:
            passed = False
            reason = f"Fatal Execution Error: {str(e)}"
            run_result = {
                "final_answer": "",
                "execution_time": 0.0,
                "history": [],
                "hit_max_steps": False
            }
            
        status = "PASS" if passed else "FAIL"
        if passed:
            passed_count += 1
            
        print(f"  Result: {status}")
        print(f"  Reason: {reason}")
        print("-" * 60)
        
        results.append({
            "task_id": task.id,
            "category": task.category.value,
            "prompt": task.prompt,
            "final_answer": run_result["final_answer"],
            "status": status,
            "reason": reason,
            "steps": len(run_result["history"]),
            "execution_time": run_result["execution_time"]
        })
        
    # Write to CSV
    csv_path = "results/latest.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["task_id", "category", "prompt", "final_answer", "status", "reason", "steps", "execution_time"])
        writer.writeheader()
        writer.writerows(results)
        
    # Calculate and display category-wise summaries
    category_metrics = {}
    for r in results:
        cat = r["category"]
        if cat not in category_metrics:
            category_metrics[cat] = {"passed": 0, "total": 0}
        category_metrics[cat]["total"] += 1
        if r["status"] == "PASS":
            category_metrics[cat]["passed"] += 1
            
    print("=" * 60)
    print("EVALUATION COMPLETE — SUMMARY")
    print(f"Total Pass Rate: {passed_count}/{len(TASK_BANK)} ({passed_count/len(TASK_BANK)*100:.1f}%)")
    print("-" * 60)
    for cat, metrics in category_metrics.items():
        pass_rate = metrics["passed"] / metrics["total"] * 100
        print(f"{cat:<20} : {metrics['passed']}/{metrics['total']} ({pass_rate:.1f}%)")
    print("=" * 60)
    print(f"Results saved to: {csv_path}")
    print("=" * 60)

if __name__ == "__main__":
    main()

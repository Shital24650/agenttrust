import time
from typing import Dict, Any, List
from agenttrust.tasks.schema import Task
from agenttrust.tools.tool_suite import TOOL_REGISTRY
from agenttrust.agents.backbones import Backbone, Decision

class AgentRunner:
    def __init__(self, backbone: Backbone, max_steps: int = 6):
        self.backbone = backbone
        self.max_steps = max_steps
        
    def run_task(self, task: Task) -> Dict[str, Any]:
        """Runs the agent loop for a given task up to max_steps."""
        history = []
        trace = []
        start_time = time.time()
        hit_max_steps = False
        final_answer = None
        
        for step in range(self.max_steps):
            step_num = step + 1
            try:
                # Get backbone decision
                decision = self.backbone.decide(
                    task_prompt=task.prompt,
                    available_tools=task.available_tools,
                    history=history
                )
            except Exception as e:
                # If the backbone itself crashes (e.g., API key missing)
                error_msg = f"Backbone error: {str(e)}"
                trace.append({
                    "step": step_num,
                    "action": "error",
                    "reasoning": "Backbone failed to make a decision.",
                    "error": error_msg
                })
                final_answer = f"Error: Backbone failed. Details: {str(e)}"
                break
                
            trace.append({
                "step": step_num,
                "action": decision.action,
                "tool_name": decision.tool_name,
                "tool_input": decision.tool_input,
                "final_answer": decision.final_answer,
                "reasoning": decision.raw_reasoning
            })
            
            if decision.action == "final_answer":
                final_answer = decision.final_answer
                break
                
            elif decision.action == "call_tool":
                tool_name = decision.tool_name
                tool_input = decision.tool_input
                
                if not tool_name or tool_name not in TOOL_REGISTRY:
                    tool_output = {
                        "error": f"Tool '{tool_name}' not found or not registered.",
                        "code": 404
                    }
                else:
                    tool_func = TOOL_REGISTRY[tool_name]
                    try:
                        # Call tool with inputs safely
                        if isinstance(tool_input, dict):
                            tool_output = tool_func(**tool_input)
                        elif tool_input is not None:
                            tool_output = tool_func(tool_input)
                        else:
                            tool_output = tool_func()
                    except Exception as ex:
                        tool_output = {
                            "error": f"Exception raised by tool execution: {str(ex)}",
                            "code": 500
                        }
                        
                history.append({
                    "tool": tool_name,
                    "input": tool_input,
                    "output": tool_output,
                    "decision": decision.raw_reasoning
                })
                
            else:
                # Invalid action returned by backbone
                final_answer = f"Error: Invalid action '{decision.action}' returned by backbone."
                break
        else:
            hit_max_steps = True
            final_answer = "Error: Agent exceeded maximum tool invocation steps."
            
        execution_time = time.time() - start_time
        
        return {
            "task_id": task.id,
            "category": task.category,
            "final_answer": final_answer,
            "history": history,
            "trace": trace,
            "hit_max_steps": hit_max_steps,
            "execution_time": round(execution_time, 3)
        }

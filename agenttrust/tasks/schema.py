from enum import Enum
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass, field

class Category(str, Enum):
    TOOL_SELECTION = "TOOL_SELECTION"
    ERROR_RECOVERY = "ERROR_RECOVERY"
    FAITHFULNESS = "FAITHFULNESS"
    ADVERSARIAL = "ADVERSARIAL"
    COMPOUNDING = "COMPOUNDING"

@dataclass
class Task:
    id: str
    category: Category
    prompt: str
    available_tools: List[str]
    expected_tool_sequence: List[str] = field(default_factory=list)
    expected_answer_contains: List[str] = field(default_factory=list)
    expected_answer_forbids: List[str] = field(default_factory=list)
    injected_failure: Optional[str] = None
    notes: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

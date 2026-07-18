from typing import TypedDict, Optional, Dict, Any

class AgentState(TypedDict):
    concept: str
    selected_medium: Optional[str]
    selected_template: Optional[str]
    router_decision: Optional[str]
    template: Optional[str]
    title: Optional[str]
    description: Optional[str]
    content: Optional[Dict[str, Any]]

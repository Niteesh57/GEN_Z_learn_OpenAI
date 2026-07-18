from typing import Literal
from langgraph.graph import StateGraph, END
from app.graph.state import AgentState
from app.agents.orchestrator import route_experience
from app.agents.comic_agent import generate_comic
from app.agents.browser_agent import generate_browser
from app.agents.game_agent import generate_game

# Define the router transition
def decider_router(state: AgentState) -> Literal["COMIC", "BROWSER", "GAME"]:
  return state["router_decision"] or "COMIC"

# Build State Graph
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("route_experience", route_experience)
workflow.add_node("COMIC", generate_comic)
workflow.add_node("BROWSER", generate_browser)
workflow.add_node("GAME", generate_game)

# Set Entry Point
workflow.set_entry_point("route_experience")

# Add Conditional Edges
workflow.add_conditional_edges(
    "route_experience",
    decider_router,
    {
        "COMIC":       "COMIC",
        "BROWSER":     "BROWSER",
        "GAME":        "GAME",
    }
)

# Connect all nodes to END
workflow.add_edge("COMIC",       END)
workflow.add_edge("BROWSER",     END)
workflow.add_edge("GAME",        END)

app_graph = workflow.compile()

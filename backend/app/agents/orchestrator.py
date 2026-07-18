import json
import json
from typing import Dict, Any
from langchain_core.prompts import PromptTemplate
from app.config import get_llm
from app.graph.state import AgentState

async def route_experience(state: AgentState) -> Dict[str, Any]:
  concept = state["concept"]
  selected_medium = state.get("selected_medium")
  selected_template = state.get("selected_template")

  # Mapping dict for all supported mediums
  medium_mapping = {
      "COMIC":       ("COMIC",    "COMIC_STRIP"),
      "BROWSER":     ("BROWSER", "BROWSER_SIM"),
      "GAME":        ("GAME",    "GAME_TEMPLATE"),
  }

  # If user explicitly requested a medium, map it directly
  if selected_medium in medium_mapping:
    decision, template = medium_mapping[selected_medium]

    if decision == "GAME":
        return {
            "router_decision": "GAME",
            "template": "GAME_TEMPLATE",
            "title": f"{concept}: Game Lab",
            "description": f"Play short interactive challenges to practise {concept}.",
        }

    return {
        "router_decision": decision,
        "template": template,
        "title": f"The {concept} Guide",
        "description": f"Learn about {concept} step-by-step."
    }

  llm = get_llm()
  prompt = PromptTemplate.from_template("""
  You are the Experience Orchestrator for KnowledgeForge.
  Analyze the concept: '{concept}' and decide which of the following is the BEST way to teach it.

  Available mediums:
  - 'COMIC': Best for history, high-level architecture, metaphor-heavy concepts, flows (OAuth, SSO, history of Git, how the internet works)
  - 'BROWSER': Best for software setup wizards in web consoles, cloud dashboards (AWS, Azure, GitHub, Vercel, Firebase), UI-driven procedures where you click through forms
  - 'GAME': Best for terminology-heavy concepts, classification tasks, ordered sequences (OSI layers, SDLC), boolean logic, rapid-recall facts, key-value matching (port↔protocol)

  Respond in JSON format ONLY:
  {{
      "decision": "COMIC" | "BROWSER" | "GAME",
      "template": "COMIC_STRIP" | "BROWSER_SIM" | "GAME_TEMPLATE",
      "title": "A highly creative title for the experience",
      "description": "A hook describing the comic, browser walkthrough, or game setup"
  }}
  """)

  try:
    chain = prompt | llm
    response = await chain.ainvoke({"concept": concept})
    content = response.content

    # Clean json wrappers
    if "```json" in content:
      content = content.split("```json")[1].split("```")[0]
    elif "```" in content:
      content = content.split("```")[1].split("```")[0]

    data = json.loads(content.strip())

    decision = data.get("decision", "COMIC")
    fallback_templates = {
        "COMIC":       "COMIC_STRIP",
        "BROWSER":     "BROWSER_SIM",
        "GAME":        "GAME_TEMPLATE",
    }
    template = data.get("template", fallback_templates.get(decision, "COMIC_STRIP"))

    return {
        "router_decision": decision,
        "template": template,
        "title": data.get("title", f"The {concept} Challenge"),
        "description": data.get("description", f"Learn {concept} in depth.")
    }
  except Exception as e:
    print(f"Routing failed: {e}")
    return {
        "router_decision": "COMIC",
        "template": "COMIC_STRIP",
        "title": f"The {concept} Story",
        "description": "Learn the concept through an interactive comic."
    }

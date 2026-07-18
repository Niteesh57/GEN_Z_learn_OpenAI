import json
from typing import Dict, Any
from langchain_core.prompts import PromptTemplate
from app.config import get_llm
from app.graph.state import AgentState

async def generate_browser(state: AgentState) -> Dict[str, Any]:
  llm = get_llm()
  concept = state["concept"]
  prompt = PromptTemplate.from_template("""
  You are the Browser UI Simulation Designer for KnowledgeForge.
  Create a step-through interactive browser simulation to teach the concept: '{concept}'.

  Design 3 to 5 browser "screens" (pages) that guide the user through the process.
  Each screen simulates a realistic web console, dashboard, or settings page.

  For each screen include:
  - A realistic URL (e.g., https://console.aws.amazon.com/s3/create)
  - A page_title
  - sidebar_items: list of 3-5 nav labels (the active one should be relevant)
  - active_sidebar: which sidebar item is active
  - heading: the main section heading
  - fields: a list of interactive form elements. Each field has:
      - type: "text" | "select" | "radio" | "checkbox" | "toggle"
      - label: the field label
      - For "text": placeholder (string), hint (string), correct_value: null
      - For "select": options (list of strings), correct (string), explanation (string)
      - For "radio": options (list of strings), correct (string), explanation (string)
      - For "checkbox": label (string), correct_checked (boolean), explanation (string)
      - For "toggle": label (string), correct_on (boolean), explanation (string)
  - next_button: label of the button to advance to next screen (e.g. "Next: Properties →")
  - screen_tip: a short learning tip shown at the top of this screen

  Make the URLs and UI look like real software (AWS console, GitHub settings, Azure portal, Vercel, etc.) based on the concept.

  Respond in JSON format ONLY:
  {{
      "browser_title": "Descriptive title of what's being set up",
      "screens": [
          {{
              "url": "realistic URL for this step",
              "page_title": "Page title",
              "sidebar_items": ["item1", "item2", "item3"],
              "active_sidebar": "item1",
              "heading": "Section heading",
              "screen_tip": "Short learning tip for this screen",
              "fields": [
                  {{
                      "type": "select",
                      "label": "AWS Region",
                      "options": ["us-east-1", "eu-west-1", "ap-south-1"],
                      "correct": "us-east-1",
                      "explanation": "us-east-1 is the default and most-available region"
                  }}
              ],
              "next_button": "Next: Properties →"
          }}
      ]
  }}
  """)

  try:
    chain = prompt | llm
    response = await chain.ainvoke({"concept": concept})
    content = response.content

    if "```json" in content:
      content = content.split("```json")[1].split("```")[0]
    elif "```" in content:
      content = content.split("```")[1].split("```")[0]

    data = json.loads(content.strip())
    return {"content": data}
  except Exception as e:
    print(f"Browser generation failed: {e}")
    return {
        "content": {
            "browser_title": f"Setup Guide: {concept}",
            "screens": [
                {
                    "url": "https://console.example.com/setup",
                    "page_title": f"Configure {concept}",
                    "sidebar_items": ["Overview", "Settings", "Review"],
                    "active_sidebar": "Settings",
                    "heading": "Step 1: Basic Configuration",
                    "screen_tip": f"Follow the steps to configure {concept} correctly.",
                    "fields": [
                        {
                            "type": "select",
                            "label": "Environment",
                            "options": ["Production", "Staging", "Development"],
                            "correct": "Production",
                            "explanation": "Choose Production for live deployments."
                        }
                    ],
                    "next_button": "Next →"
                }
            ]
        }
    }

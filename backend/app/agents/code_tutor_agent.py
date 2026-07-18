import json
from langchain_core.messages import SystemMessage, HumanMessage
from app.graph.state import AgentState
from app.llm import get_llm

def generate_code_tutor(state: AgentState) -> AgentState:
    concept = state["concept"]
    llm = get_llm()

    prompt = f"""You are an expert programming execution tracer like Python Tutor.
The user wants to visualize the execution of this concept or code: "{concept}"
If the user didn't provide code, generate a concise, educational implementation of the concept in a popular language (e.g. Python, C++, JS). Keep it short (under 30 lines if possible).

Your task is to generate the code AND the FIRST 10 execution steps of this code. 
If the code execution completes in <= 10 steps, set `is_finished` to true. If it requires more, set it to false.

A step represents a single moment in time (e.g. after a line executes and state changes).
You must provide `line_number` (1-indexed) corresponding to the line in your provided `code`.

Variables must be represented as one of these types:
- "PRIMITIVE": value is a string representation (e.g. "5", "True", "'hello'")
- "ARRAY": value is a JSON array string (e.g. "[1, 2, 3]")
- "MATRIX": value is a JSON array of arrays string (e.g. "[[1,2], [3,4]]")
- "LINKED_LIST": value is a JSON array of node values in order (e.g. "[1, 2, 3]")

Return a JSON object:
{{
  "code": "def main():\\n    x = 5\\n    print(x)",
  "language": "python",
  "steps": [
    {{
      "line_number": 2,
      "explanation": "Initializing x to 5",
      "variables": [
        {{"name": "x", "type": "PRIMITIVE", "value": "5"}}
      ]
    }}
  ],
  "is_finished": false
}}

Do NOT wrap the output in markdown code blocks. Return ONLY the raw JSON object.
"""

    messages = [
        SystemMessage(content="You are a JSON-only API that returns code execution traces."),
        HumanMessage(content=prompt)
    ]

    response = llm.invoke(messages)
    content = response.content.strip()
    if content.startswith("```json"):
        content = content[7:-3].strip()
    elif content.startswith("```"):
        content = content[3:-3].strip()

    try:
        parsed = json.loads(content)
        state["content"] = parsed
        state["title"] = f"Code Tutor: {concept[:30]}..."
        state["description"] = "Step-by-step visual code execution."
        state["template"] = "CODE_TUTOR"
        state["router_decision"] = "CODE_TUTOR"
    except Exception as e:
        print("Error parsing code tutor JSON:", e)
        state["content"] = {"error": "Failed to generate valid code trace JSON."}
        state["title"] = "Code Tutor Error"

    return state

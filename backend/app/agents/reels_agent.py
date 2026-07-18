import json
from typing import Any, Dict, List, Tuple

from langchain_core.prompts import PromptTemplate

from app.config import get_llm
from app.graph.state import AgentState


REEL_COUNT = 30


def _text(value: Any, maximum: int) -> str:
    return " ".join(value.split())[:maximum] if isinstance(value, str) else ""


def _extract_json(content: Any) -> Dict[str, Any]:
    raw = content if isinstance(content, str) else str(content)
    if "```json" in raw:
        raw = raw.split("```json", 1)[1].split("```", 1)[0]
    elif "```" in raw:
        raw = raw.split("```", 1)[1].split("```", 1)[0]
    value = json.loads(raw.strip())
    if not isinstance(value, dict):
        raise ValueError("Reel response must be a JSON object.")
    return value


def _validate_reels(data: Dict[str, Any], concept: str) -> Tuple[bool, str, List[Dict[str, Any]]]:
    raw_reels = data.get("reels")
    if not isinstance(raw_reels, list) or len(raw_reels) != REEL_COUNT:
        return False, "Return exactly 30 reels.", []

    cleaned: List[Dict[str, Any]] = []
    seen_titles = set()
    seen_voiceovers = set()
    for expected_step, reel in enumerate(raw_reels, 1):
        if not isinstance(reel, dict) or reel.get("step") != expected_step:
            return False, "Steps must be the unique contiguous numbers 1 through 30.", []
        title = _text(reel.get("title"), 56)
        hook = _text(reel.get("hook"), 90)
        body = _text(reel.get("body"), 260)
        takeaway = _text(reel.get("takeaway"), 100)
        voiceover = _text(reel.get("voiceover"), 380)
        if not all((title, hook, body, takeaway, voiceover)):
            return False, f"Reel {expected_step} is missing required text.", []
        title_key = title.lower()
        voice_key = voiceover.lower()
        if title_key in seen_titles or voice_key in seen_voiceovers:
            return False, "Each reel title and narration must be unique; do not repeat an explanation.", []
        seen_titles.add(title_key)
        seen_voiceovers.add(voice_key)
        cleaned.append({
            "step": expected_step,
            "title": title,
            "hook": hook,
            "body": body,
            "takeaway": takeaway,
            "voiceover": voiceover,
        })
    return True, "", cleaned


def _fallback_reels(concept: str) -> Dict[str, Any]:
    topic = _text(concept, 60) or "this topic"
    stages = [
        ("The learning goal", "Set a clear question before studying the idea."),
        ("The big picture", "Place the idea inside the system where it belongs."),
        ("Key vocabulary", "Name the first essential term precisely."),
        ("A second term", "Separate the next important word from the first."),
        ("The starting state", "Identify what must be true before the process begins."),
        ("The first action", "Make the earliest useful move, not every move at once."),
        ("What changes", "Track the piece of information that changes after that action."),
        ("A useful rule", "Use the rule that keeps the process predictable."),
        ("A small example", "Walk through a simple case before using a complex one."),
        ("A decision point", "Notice the condition that chooses the next path."),
        ("The other path", "Compare what happens when the condition is not met."),
        ("Why the order matters", "Keep the sequence intact so later steps have the right input."),
        ("A common mistake", "Avoid changing several things before checking the result."),
        ("A quick check", "Verify the current result with one focused test."),
        ("The feedback loop", "Use the check to decide whether to continue or adjust."),
        ("Scaling up", "Repeat the same principle carefully for a larger case."),
        ("Efficiency", "Remove unnecessary work while preserving the correct result."),
        ("A useful comparison", "Contrast the idea with a nearby concept that solves a different problem."),
        ("The main constraint", "Name the limitation that shapes a practical solution."),
        ("Handling an edge case", "Decide what the process should do when the expected input is missing."),
        ("Reading the output", "Interpret the result rather than merely observing it."),
        ("Troubleshooting", "Isolate the first step where the actual result differs from the expected result."),
        ("The mental model", "Connect the steps to one memorable picture of how the idea behaves."),
        ("When to use it", "Choose this approach when its strengths match the problem."),
        ("When not to use it", "Pick another approach when the assumptions no longer hold."),
        ("Real-world use", "Link the principle to a familiar product or workflow."),
        ("Practice prompt", "Try explaining the next step without looking at the answer."),
        ("Recap the chain", "State the sequence from the goal through the decision and result."),
        ("One-sentence summary", "Compress the idea into a sentence you can recall later."),
        ("You are ready", "Use this framework to explore a more detailed example next."),
    ]
    reels = []
    for index, (title, explanation) in enumerate(stages, 1):
        reels.append({
            "step": index,
            "title": title,
            "hook": f"{topic}: step {index}.",
            "body": explanation,
            "takeaway": explanation,
            "voiceover": f"Step {index} for {topic}. {explanation}",
        })
    return {
        "title": f"{topic}: 30-step Reel Guide",
        "concept": topic,
        "reels": reels,
    }


REELS_PROMPT = PromptTemplate.from_template("""
You are an expert micro-learning director creating an educational vertical Reel series about: '{concept}'.

Create exactly 30 sequential reels. Together they must teach the topic from first intuition to practical use.
Each reel advances the explanation by ONE new idea. Never restate a previous reel, never use filler, and never repeat a title, example, or voiceover.

The experience behaves like a thoughtful short-video lesson:
- Reels 1-5: motivation, context, and foundations.
- Reels 6-20: the precise mechanics in a logical order.
- Reels 21-26: edge cases, trade-offs, and practical use.
- Reels 27-30: practice, recap, and a memorable conclusion.
- Use factual, concise, beginner-friendly language. Explain technical terms before relying on them.
- body is 1-2 short sentences. voiceover is 1-3 natural spoken sentences and must be unique.
- Do not use markdown, emojis, HTML, or code fences.

Return raw JSON only, matching this exact shape:
{{
  "title": "Short series title",
  "concept": "{concept}",
  "reels": [
    {{
      "step": 1,
      "title": "Unique short title",
      "hook": "A punchy one-line hook",
      "body": "A clear new learning step.",
      "takeaway": "One concise thing to remember.",
      "voiceover": "Natural narration for this reel."
    }}
  ]
}}
""")


async def generate_reels(state: AgentState) -> Dict[str, Any]:
    concept = state.get("concept", "this topic")
    try:
        llm = get_llm(temperature=0.45, max_tokens=7200)
        response = await (REELS_PROMPT | llm).ainvoke({"concept": concept})
        data = _extract_json(response.content)
        valid, reason, reels = _validate_reels(data, concept)
        if not valid:
            raise ValueError(reason)
        content = {
            "title": _text(data.get("title"), 90) or f"{concept}: 30-step Reel Guide",
            "concept": _text(data.get("concept"), 90) or concept,
            "reels": reels,
        }
    except Exception as error:
        print(f"Reels generation used safe fallback: {error}")
        content = _fallback_reels(concept)

    return {
        "router_decision": "REELS",
        "template": "REELS_FEED",
        "title": content["title"],
        "description": f"A 30-step vertical Reel lesson about {content['concept']}.",
        "content": content,
    }

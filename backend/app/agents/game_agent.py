import json
from typing import Any, Dict, Tuple

from langchain_core.prompts import PromptTemplate

from app.config import get_llm
from app.graph.state import AgentState


GAME_TEMPLATES = {
    "CATCH_DROP", "WORD_DECODE", "MAZE_ESCAPE", "MEMORY_FLIP",
    "SEQUENCE_SORT", "BINARY_JUMP", "SPACE_SHOOTER", "CIRCUIT_CONNECT",
}


def _text(value: Any, maximum: int = 180) -> str:
    return " ".join(value.split())[:maximum] if isinstance(value, str) else ""


def _extract_json(content: Any) -> Dict[str, Any]:
    value = content if isinstance(content, str) else str(content)
    if "```json" in value:
        value = value.split("```json", 1)[1].split("```", 1)[0]
    elif "```" in value:
        value = value.split("```", 1)[1].split("```", 1)[0]
    data = json.loads(value.strip())
    if not isinstance(data, dict):
        raise ValueError("The game response must be one JSON object.")
    return data


def _is_boolean(value: Any) -> bool:
    return isinstance(value, bool)


def _validate_game(data: Dict[str, Any], required_template: str | None = None) -> Tuple[bool, str]:
    template = data.get("game_template")
    levels = data.get("levels")
    if template not in GAME_TEMPLATES:
        return False, "game_template must be one of the supported templates"
    if required_template and template != required_template:
        return False, f"game_template must be {required_template} because the player selected it"
    if not _text(data.get("instructions"), 180):
        return False, "instructions must be a short player-facing sentence"
    if not isinstance(levels, list) or not 1 <= len(levels) <= 4:
        return False, "levels must contain between 1 and 4 playable levels"

    for level_number, level in enumerate(levels, 1):
        if not isinstance(level, dict) or not _text(level.get("concept_title"), 70):
            return False, f"level {level_number} needs a short concept_title"
        if not _text(level.get("concept_explanation"), 360):
            return False, f"level {level_number} needs a clear concept_explanation"
        items = level.get("items")
        if not isinstance(items, list):
            return False, f"level {level_number} items must be an array"

        if template == "CATCH_DROP":
            valid = [item for item in items if isinstance(item, dict) and _text(item.get("label"), 42) and _is_boolean(item.get("correct"))]
            correct = sum(item["correct"] for item in valid)
            if len(valid) < 6 or correct < 3 or len(valid) - correct < 2:
                return False, f"level {level_number} CATCH_DROP needs 3+ correct and 2+ decoy labels"
        elif template == "WORD_DECODE":
            valid = [item for item in items if isinstance(item, dict) and 2 <= len(_text(item.get("answer"), 32)) <= 32 and isinstance(item.get("clues"), list) and len([clue for clue in item["clues"] if _text(clue, 110)]) >= 2]
            if not 2 <= len(valid) <= 5:
                return False, f"level {level_number} WORD_DECODE needs 2-5 answers with at least two clues each"
        elif template == "MEMORY_FLIP":
            valid = [item for item in items if isinstance(item, dict) and _text(item.get("term"), 46) and _text(item.get("definition"), 82)]
            terms = {_text(item["term"], 46).lower() for item in valid}
            if not 3 <= len(valid) <= 6 or len(terms) != len(valid):
                return False, f"level {level_number} MEMORY_FLIP needs 3-6 unique term-definition pairs"
        elif template in {"SEQUENCE_SORT", "SPACE_SHOOTER"}:
            valid = [item for item in items if isinstance(item, dict) and isinstance(item.get("order"), int) and _text(item.get("label"), 48)]
            orders = sorted(item["order"] for item in valid)
            if not 3 <= len(valid) <= 6 or orders != list(range(1, len(valid) + 1)):
                return False, f"level {level_number} {template} needs 3-6 unique, contiguous orders starting at 1"
        elif template == "BINARY_JUMP":
            valid = [item for item in items if isinstance(item, dict) and _text(item.get("question"), 150) and item.get("platform_label") in {"True", "False"} and _is_boolean(item.get("correct"))]
            if not 3 <= len(valid) <= 6:
                return False, f"level {level_number} BINARY_JUMP needs 3-6 explicit True/False statements"
        elif template == "MAZE_ESCAPE":
            valid = [item for item in items if isinstance(item, dict) and _text(item.get("choice_label"), 54) and _text(item.get("explanation"), 180) and _is_boolean(item.get("is_correct_path"))]
            if len(valid) < 4 or not any(item["is_correct_path"] for item in valid) or not any(not item["is_correct_path"] for item in valid):
                return False, f"level {level_number} MAZE_ESCAPE needs correct paths and meaningful decoys"
        else:
            valid = [item for item in items if isinstance(item, dict) and _text(item.get("from_node"), 24) and _text(item.get("to_node"), 24) and item.get("from_node") != item.get("to_node") and _text(item.get("label"), 46) and _is_boolean(item.get("correct"))]
            links = {tuple(sorted((_text(item["from_node"], 24).lower(), _text(item["to_node"], 24).lower()))) for item in valid}
            if not 3 <= len(valid) <= 8 or len(links) != len(valid) or not any(item["correct"] for item in valid):
                return False, f"level {level_number} CIRCUIT_CONNECT needs 3-8 unique non-self links including correct ones"
    return True, ""


def _fallback(concept: str, template: str | None = None) -> Dict[str, Any]:
    title = _text(concept, 40) or "the concept"
    chosen = template if template in GAME_TEMPLATES else "CATCH_DROP"
    level: Dict[str, Any] = {
        "concept_title": f"Review: {title}",
        "concept_explanation": f"This round introduces the key ideas behind {title}. Review the revealed feedback, then try a more specific prompt for a tailored challenge.",
        "items": [], "win_score": 3, "time_limit_seconds": 50,
    }
    instructions = "Catch the learning checks and avoid the decoys."
    if chosen == "CATCH_DROP":
        level["items"] = [{"label": "Key idea", "correct": True}, {"label": "Useful fact", "correct": True}, {"label": "Core term", "correct": True}, {"label": "Irrelevant detail", "correct": False}, {"label": "Common misconception", "correct": False}, {"label": "Verified rule", "correct": True}]
    elif chosen == "WORD_DECODE":
        instructions = "Read the clues, type the matching term, and retry if needed."
        level["items"] = [{"answer": "concept", "clues": ["A central idea to learn.", "It is the focus of this lesson."]}, {"answer": "review", "clues": ["A second look at what you learned.", "It helps reinforce knowledge."]}]
    elif chosen == "MEMORY_FLIP":
        instructions = "Tap cards to match each learning term with its meaning."
        level["items"] = [{"term": "Concept", "definition": "The main idea being studied."}, {"term": "Example", "definition": "A case that helps explain an idea."}, {"term": "Review", "definition": "Practising information again."}]
    elif chosen in {"SEQUENCE_SORT", "SPACE_SHOOTER"}:
        instructions = "Tap the steps in order." if chosen == "SEQUENCE_SORT" else "Move, shoot, and clear the targets in order."
        level["items"] = [{"order": 1, "label": "Read the learning goal"}, {"order": 2, "label": "Identify the key idea"}, {"order": 3, "label": "Check an example"}, {"order": 4, "label": "Review the result"}]
        level["win_score"] = 4
    elif chosen == "BINARY_JUMP":
        instructions = "Choose True or False, then retry any missed statement."
        level["items"] = [{"question": "A concept is an idea that can be learned.", "platform_label": "True", "correct": True}, {"question": "Reviewing a topic can reinforce learning.", "platform_label": "True", "correct": True}, {"question": "Every statement is automatically correct.", "platform_label": "False", "correct": True}]
    elif chosen == "MAZE_ESCAPE":
        instructions = "Tap a route and use the feedback to find the safe path."
        level["items"] = [{"choice_label": "Read the goal", "is_correct_path": True, "explanation": "Start by identifying what you need to learn."}, {"choice_label": "Skip the topic", "is_correct_path": False, "explanation": "Skipping the goal gives you no direction."}, {"choice_label": "Check an example", "is_correct_path": True, "explanation": "Examples make an idea easier to understand."}, {"choice_label": "Guess without evidence", "is_correct_path": False, "explanation": "Use information rather than a blind guess."}]
    else:
        instructions = "Tap two nodes to test a relationship and complete the circuit."
        level["items"] = [{"from_node": "Goal", "to_node": "Concept", "correct": True, "label": "defines"}, {"from_node": "Concept", "to_node": "Example", "correct": True, "label": "explained by"}, {"from_node": "Goal", "to_node": "Guess", "correct": False, "label": "skips"}, {"from_node": "Example", "to_node": "Ignore", "correct": False, "label": "discards"}]
    return {"game_template": chosen, "instructions": instructions, "levels": [level]}


def _preferred_template(state: AgentState, concept: str) -> str | None:
    selected = state.get("selected_template")
    if selected in GAME_TEMPLATES:
        return selected
    request = concept.lower()
    hints = {
        "space shooter": "SPACE_SHOOTER", "shooter": "SPACE_SHOOTER", "catch drop": "CATCH_DROP",
        "word decode": "WORD_DECODE", "maze": "MAZE_ESCAPE", "memory": "MEMORY_FLIP",
        "sequence": "SEQUENCE_SORT", "binary": "BINARY_JUMP", "circuit": "CIRCUIT_CONNECT",
    }
    return next((game for phrase, game in hints.items() if phrase in request), None)


GAME_PROMPT = PromptTemplate.from_template("""
You design short, fair, keyboard-and-touch-friendly learning games for KnowledgeForge.
Topic: '{concept}'. Choose exactly one appropriate template and create 1-3 levels.

Templates:
- CATCH_DROP: classify falling labels. Use 6-10 distinct labels, at least 3 correct and 2 decoys; win_score 3 or 4.
- WORD_DECODE: type a term from clues. Use 2-5 answers, 2-3 factual clues per answer. Answers are 2-32 characters.
- MEMORY_FLIP: match terms to definitions. Use 3-6 unique pairs and concise definitions.
- SEQUENCE_SORT: arrange 3-6 unique ordered steps. Orders must be exactly 1,2,3... with no gaps.
- SPACE_SHOOTER: shoot 3-6 unique ordered targets. Orders must be exactly 1,2,3...; every target label is under 48 characters.
- BINARY_JUMP: decide True or False for 3-6 unambiguous factual statements. platform_label is the label of one platform; correct says whether that platform is the true answer.
- MAZE_ESCAPE: choose safe paths. Include 2-4 correct route options and at least 2 distinct decoys. Every item has a concise explanation.
- CIRCUIT_CONNECT: connect relationship nodes. Use 3-8 unique, non-self links and at least one correct link. Labels describe the relationship, not the answer.

Player-facing quality rules:
- Keep instructions to one clear sentence and describe the actual controls (click/tap/type), never “drag” where drag is not supported.
- Use short visible labels; no markdown, code fences, HTML, emojis, or invented JSON keys.
- Use factual, age-appropriate content. Make decoys plausible but clearly wrong after feedback.
- Keep concept_title under 70 characters, concept_explanation under 360 characters, and time_limit_seconds between 45 and 60.
- The game must be completable without guessing, duplicate labels, duplicate sequence orders, or hidden prerequisites.

Return JSON only, with exactly this shape:
{{
  "game_template": "ONE_TEMPLATE_NAME",
  "instructions": "One concise sentence.",
  "levels": [{{
    "concept_title": "Short learning focus",
    "concept_explanation": "A concise explanation revealed after completion.",
    "items": [],
    "win_score": 3,
    "time_limit_seconds": 50
  }}]
}}

{repair_note}
{template_direction}
""")


async def generate_game(state: AgentState) -> Dict[str, Any]:
    concept = state.get("concept", "this topic")
    requested_template = _preferred_template(state, concept)
    llm = get_llm(temperature=0.35, max_tokens=5000)
    repair_note = "Generate a fresh playable game now."
    template_direction = f"The player explicitly selected {requested_template}. You MUST return exactly that game_template." if requested_template else "The player chose Auto pick. Select the best template for the topic."

    for _attempt in range(2):
        try:
            response = await (GAME_PROMPT | llm).ainvoke({"concept": concept, "repair_note": repair_note, "template_direction": template_direction})
            data = _extract_json(response.content)
            valid, reason = _validate_game(data, requested_template)
            if valid:
                return {"content": data}
            repair_note = f"Your previous draft was rejected: {reason}. Return a corrected JSON object that satisfies every rule."
        except Exception as error:
            print(f"Game generation attempt failed: {error}")
            repair_note = "The previous response was not valid JSON. Return only one corrected JSON object."

    print("Game generation used the safe fallback after invalid game data.")
    return {"content": _fallback(concept, requested_template)}

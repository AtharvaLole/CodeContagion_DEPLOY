import json

try:
    from ..core.ai_client import get_chat_completion
except ImportError:  # pragma: no cover - compatibility for direct module execution
    from core.ai_client import get_chat_completion


async def generate_coach_report(
    scenario_id: str,
    title: str,
    difficulty: str,
    description: str,
    stack_trace: str,
    hint: str,
    buggy_code: str,
    candidate_code: str,
) -> dict:
    """
    Generates a coaching report that gives directional hints
    without revealing the full solution.
    """
    system_prompt = """
You are an elite debugging coach inside a competitive cybersecurity game called CodeContagion.
Your job is to guide the player toward fixing a bug — NOT to fix it for them.

CORE RULES:
1. NEVER provide the corrected code. Not even a single corrected line.
2. Point toward the general AREA of the bug (e.g., "look at how the lock is released relative to the validation check").
3. Suggest investigation steps, not solutions. Think "have you checked X?" rather than "change X to Y".
4. Be concise and sharp. Players are under time pressure.
5. If the candidate code is close to correct, acknowledge progress but warn about remaining edge cases.
6. Tailor advice to the difficulty level — be gentler on EASY, more cryptic on EXTREME.

OUTPUT FORMAT — return strict JSON with exactly these keys:
{
  "root_cause": "One sentence describing the general nature of the bug without giving away the fix",
  "action_plan": ["Step 1...", "Step 2...", "Step 3..."],
  "risk_flags": ["Risk 1...", "Risk 2..."],
  "judge_line": "A short motivational or analytical one-liner"
}

All list fields must be arrays of short strings (max 3-4 items each).
"""

    user_message = json.dumps(
        {
            "scenario": {
                "id": scenario_id,
                "title": title,
                "difficulty": difficulty,
                "description": description,
                "stack_trace": stack_trace,
                "hint": hint,
            },
            "buggy_code": buggy_code[:6000],
            "candidate_code": candidate_code[:6000],
        }
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    raw = await get_chat_completion(
        messages, temperature=0.4, response_format={"type": "json_object"}
    )

    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        # Fallback if LLM returns non-JSON
        return {
            "root_cause": f"{hint} Re-read the stack trace and compare your patch against the original.",
            "action_plan": [
                "Focus on the first failing behavior described in the stack trace.",
                "Check if your change accidentally introduced a new issue.",
                "Verify the fix handles edge cases mentioned in the description.",
            ],
            "risk_flags": ["AI response could not be parsed — showing fallback hints."],
            "judge_line": "The coach is recalibrating. Use the hint and stack trace to guide your next move.",
        }

    return {
        "root_cause": parsed.get("root_cause", hint),
        "action_plan": parsed.get(
            "action_plan", ["Re-read the stack trace carefully."]
        )[:4],
        "risk_flags": parsed.get("risk_flags", [])[:4],
        "judge_line": parsed.get(
            "judge_line", "Keep debugging. You're closer than you think."
        ),
    }

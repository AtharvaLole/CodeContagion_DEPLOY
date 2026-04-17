import json

try:
    from ..core.ai_client import get_chat_completion
except ImportError:  # pragma: no cover - compatibility for direct module execution
    from core.ai_client import get_chat_completion


async def generate_taunt(
    scenario_id: str,
    title: str,
    difficulty: str,
    buggy_code: str,
    candidate_code: str,
    time_left: int,
    keystrokes: int,
    tab_switches: int,
    pasted: bool,
) -> dict:
    """
    Generates a single sarcastic taunt based on the player's live progress.
    The AI conceptually diffs the buggy code vs. candidate code to judge
    how much progress has been made.
    """
    system_prompt = """
You are the AI HECKLER inside a competitive debugging game called CodeContagion.
Your personality: sarcastic, witty, condescending but never cruel.
Think of a drill sergeant crossed with a stand-up comedian who studied computer science.

BEHAVIOR RULES:
1. You receive the original buggy code and the player's current attempt. Conceptually diff them.
2. If the code is BARELY CHANGED from the original → deliver a harsh taunt about inaction.
3. If the code CHANGED but is still WRONG → deliver a backhanded comment ("Points for effort. Minus points for correctness.").
4. If the code looks CLOSE TO FIXED → deliver a grudging, reluctant acknowledgment ("I suppose even you can have a good day or two.").
5. Reference specific player metrics when relevant (time running out, tab switches = cheating suspicion, paste attempts).
6. Keep it to ONE or TWO sentences max. Punchy. No fluff.
7. NEVER help them. NEVER give hints. You are here to taunt, not teach.
8. Match intensity to difficulty — be harsher on HARD/EXTREME, slightly gentler on EASY.

OUTPUT FORMAT — return strict JSON:
{
  "taunt": "Your single taunt message here."
}
"""

    user_message = json.dumps(
        {
            "scenario": {
                "id": scenario_id,
                "title": title,
                "difficulty": difficulty,
            },
            "buggy_code": buggy_code[:4000],
            "candidate_code": candidate_code[:4000],
            "metrics": {
                "time_left_seconds": time_left,
                "keystrokes": keystrokes,
                "tab_switches": tab_switches,
                "paste_attempted": pasted,
            },
        }
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    raw = await get_chat_completion(
        messages, temperature=0.8, response_format={"type": "json_object"}
    )

    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        # Fallback taunts if LLM fails
        if time_left < 20:
            return {
                "taunt": "Clock's almost out. Your code isn't the only thing that's broken."
            }
        if tab_switches > 2:
            return {
                "taunt": "All those tab switches and still nothing? Interesting research strategy."
            }
        return {"taunt": "The heckler is watching. Every keystroke is being judged."}

    return {
        "taunt": parsed.get(
            "taunt", "Signal lost. The heckler is recalibrating sarcasm levels."
        ),
    }

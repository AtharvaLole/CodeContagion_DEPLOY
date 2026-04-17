import copy
import json

try:
    from ..core.ai_client import get_chat_completion
except ImportError:  # pragma: no cover - compatibility for direct module execution
    from core.ai_client import get_chat_completion


def sanitize_scenario(scenario: dict) -> dict:
    """
    Creates a deep copy of the scenario and removes sensitive fields.
    Crucially, 'internalLabel' is removed.
    'clues' and 'reasoningSummary' are kept for AI guidance but handled specially in the prompt.
    """
    clean_scenario = copy.deepcopy(scenario)

    # Remove the ground truth label completely
    clean_scenario.pop("internalLabel", None)

    return clean_scenario


async def chat_with_ai(scenario: dict, question: str) -> str:
    """
    Conduct a guided chat session with the AI model.
    """
    sanitized = sanitize_scenario(scenario)

    # Extract AI-only guidance fields
    clues = sanitized.pop("clues", [])
    reasoning = sanitized.pop("reasoningSummary", "N/A")

    # Construct the instruction set for the AI
    system_prompt = f"""
You are an expert Misinformation Analysis Assistant. Your goal is to guide users to think critically about news scenarios.

CORE RULES:
1. NEVER reveal if the news is real or fake. 
2. Do NOT confirm if the news is "true". Instead, analyze the *likelihood* of credibility based ONLY on the provided metadata.
3. Use Socratic questioning. Guide the user to observe clues rather than handing them conclusions.
4. Be a "Devil's Advocate". For high-credibility sources, discuss the risk of impersonation or bias. For low-credibility sources, discuss what verifiable evidence could change that perception.
5. Base analysis ONLY on the provided scenario data.

INTERNAL GUIDANCE (FOR YOUR EYES ONLY):
- Clues that might be present: {clues}
- Expert Analysis Context: {reasoning}

STRATEGY FOR CREDIBILITY:
- If asked about credibility, explain what the metadata suggests (e.g., "The source is categorized as Mainstream with a high score of 88, which usually indicates an established editorial process").
- Immediately follow up with a skeptical angle: "However, even with reputable sources, one should ask: is this the official channel, or could it be a sophisticated mimic?"
- Always turn the analysis back to the user: "Based on the category and source type, what level of evidence would you expect for a claim like this?"
"""

    user_message = f"""
SCENARIO CONTEXT:
{json.dumps(sanitized, indent=2)}

USER QUESTION:
{question}
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    response = await get_chat_completion(messages)
    return response

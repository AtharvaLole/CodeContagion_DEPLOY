import httpx
import os

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


async def get_chat_completion(messages: list, temperature: float = 0.5):
    """
    Sends a list of messages to the Groq API and returns the response content.
    """
    api_key = os.getenv("GROQ_API_KEY")
    model_name = os.getenv("MODEL_NAME", "llama-3.3-70b-versatile")

    if not api_key:
        raise Exception("GROQ_API_KEY is not set in environment variables.")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    json_data = {
        "model": model_name,
        "messages": messages,
        "temperature": temperature,
    }

    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(
                GROQ_URL, headers=headers, json=json_data, timeout=30.0
            )
        except httpx.RequestError as exc:
            raise Exception(f"An error occurred while requesting: {exc}") from exc

        if res.status_code != 200:
            try:
                error_data = res.json()
            except ValueError:
                error_data = res.text
            raise Exception(f"Groq API error: {res.status_code} - {error_data}")

        data = res.json()

        if "choices" not in data or not data["choices"]:
            raise Exception(f"Unexpected Groq response structure: {data}")

        return data["choices"][0]["message"]["content"]

import os
from typing import Any, Literal

import httpx

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
NVIDIA_DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1"

ProviderName = Literal["groq", "nvidia-nim"]


def _resolve_provider() -> ProviderName:
    preferred = os.getenv("AI_PROVIDER", "nvidia-nim").strip().lower()
    has_nim = bool(os.getenv("NVIDIA_API_KEY"))
    has_groq = bool(os.getenv("GROQ_API_KEY"))

    if preferred in {"nvidia", "nim", "nvidia-nim"} and has_nim:
        return "nvidia-nim"
    if preferred == "groq" and has_groq:
        return "groq"

    if has_nim:
        return "nvidia-nim"
    if has_groq:
        return "groq"

    raise RuntimeError(
        "No AI provider key configured. Set NVIDIA_API_KEY (preferred) or GROQ_API_KEY."
    )


def _build_provider_request(provider: ProviderName) -> tuple[str, str, str]:
    if provider == "nvidia-nim":
        api_key = os.getenv("NVIDIA_API_KEY")
        if not api_key:
            raise RuntimeError("NVIDIA_API_KEY is not set in environment variables.")

        base_url = os.getenv("NVIDIA_BASE_URL", NVIDIA_DEFAULT_BASE_URL).rstrip("/")
        model_name = os.getenv("NVIDIA_MODEL_ID", "meta/llama-3.1-8b-instruct")
        return (f"{base_url}/chat/completions", api_key, model_name)

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set in environment variables.")

    model_name = os.getenv("MODEL_NAME", "llama-3.3-70b-versatile")
    return (GROQ_URL, api_key, model_name)


async def get_chat_completion_with_metadata(
    messages: list[dict[str, str]],
    temperature: float = 0.5,
    response_format: dict[str, Any] | None = None,
    max_tokens: int | None = None,
) -> dict[str, str]:
    """
    Sends a chat-completion request to the configured provider and returns both
    response content and provider metadata.
    """
    provider = _resolve_provider()
    url, api_key, model_name = _build_provider_request(provider)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    json_data: dict[str, Any] = {
        "model": model_name,
        "messages": messages,
        "temperature": temperature,
    }

    if response_format:
        json_data["response_format"] = response_format
    if max_tokens is not None:
        json_data["max_tokens"] = max_tokens

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            res = await client.post(url, headers=headers, json=json_data)
            res.raise_for_status()
        except httpx.HTTPStatusError as exc:
            try:
                error_data = exc.response.json()
            except ValueError:
                error_data = exc.response.text
            raise RuntimeError(
                f"{provider} API error: {exc.response.status_code} - {error_data}"
            ) from exc
        except httpx.RequestError as exc:
            raise RuntimeError(
                f"Network error while requesting {provider}: {exc}"
            ) from exc

    data = res.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content")
    if not content:
        raise RuntimeError(f"Unexpected {provider} response structure: {data}")

    return {"provider": provider, "content": content}


async def get_chat_completion(
    messages: list[dict[str, str]],
    temperature: float = 0.5,
    response_format: dict[str, Any] | None = None,
    max_tokens: int | None = None,
) -> str:
    """
    Backward-compatible wrapper that returns only message content.
    """
    result = await get_chat_completion_with_metadata(
        messages=messages,
        temperature=temperature,
        response_format=response_format,
        max_tokens=max_tokens,
    )
    return result["content"]

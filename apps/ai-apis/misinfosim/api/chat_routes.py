from fastapi import APIRouter, HTTPException

try:
    from ..models.chat import ChatRequest, ChatResponse
    from ..services.chat_service import chat_with_ai, sanitize_scenario
except ImportError:  # pragma: no cover - compatibility for direct module execution
    from models.chat import ChatRequest, ChatResponse
    from services.chat_service import chat_with_ai, sanitize_scenario

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        sanitized_scenario = sanitize_scenario(request.scenario)
        ai_response = await chat_with_ai(sanitized_scenario, request.question)
        return ChatResponse(response=ai_response)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

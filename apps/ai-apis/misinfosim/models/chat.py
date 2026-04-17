from pydantic import BaseModel
from typing import Dict, Any

class ChatRequest(BaseModel):
    scenario: Dict[str, Any]
    question: str

class ChatResponse(BaseModel):
    response: str

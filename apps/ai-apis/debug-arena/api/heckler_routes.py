from fastapi import APIRouter, HTTPException

try:
    from ..models.heckler import HecklerRequest, HecklerResponse
    from ..services.heckler_service import generate_taunt
except ImportError:  # pragma: no cover - compatibility for direct module execution
    from models.heckler import HecklerRequest, HecklerResponse
    from services.heckler_service import generate_taunt

router = APIRouter()


@router.post("/heckler", response_model=HecklerResponse)
async def heckler(request: HecklerRequest):
    try:
        result = await generate_taunt(
            scenario_id=request.scenario_id,
            title=request.title,
            difficulty=request.difficulty,
            buggy_code=request.buggy_code,
            candidate_code=request.candidate_code,
            time_left=request.time_left,
            keystrokes=request.keystrokes,
            tab_switches=request.tab_switches,
            pasted=request.pasted,
        )
        return HecklerResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

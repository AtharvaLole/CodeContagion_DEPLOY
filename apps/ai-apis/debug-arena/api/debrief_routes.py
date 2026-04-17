from fastapi import APIRouter, HTTPException

try:
    from ..models.debrief import DebriefRequest, DebriefResponse
    from ..services.debrief_service import generate_debrief
except ImportError:  # pragma: no cover - compatibility for direct module execution
    from models.debrief import DebriefRequest, DebriefResponse
    from services.debrief_service import generate_debrief

router = APIRouter()


@router.post("/debrief", response_model=DebriefResponse)
async def debrief(request: DebriefRequest):
    try:
        report = await generate_debrief(
            scenario_id=request.scenario_id,
            title=request.title,
            difficulty=request.difficulty,
            description=request.description,
            hint=request.hint,
            buggy_code=request.buggy_code,
            candidate_code=request.candidate_code,
            passed=request.passed,
            duration_seconds=request.duration_seconds,
            keystrokes=request.keystrokes,
            tab_switches=request.tab_switches,
            pasted=request.pasted,
            test_results=request.test_results,
            scores=request.scores,
        )
        return DebriefResponse(**report)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

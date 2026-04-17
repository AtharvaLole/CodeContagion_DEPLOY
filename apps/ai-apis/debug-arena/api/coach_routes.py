from fastapi import APIRouter, HTTPException

try:
    from ..models.coach import CoachRequest, CoachResponse
    from ..services.coach_service import generate_coach_report
except ImportError:  # pragma: no cover - compatibility for direct module execution
    from models.coach import CoachRequest, CoachResponse
    from services.coach_service import generate_coach_report

router = APIRouter()


@router.post("/coach", response_model=CoachResponse)
async def coach(request: CoachRequest):
    try:
        report = await generate_coach_report(
            scenario_id=request.scenario_id,
            title=request.title,
            difficulty=request.difficulty,
            description=request.description,
            stack_trace=request.stack_trace,
            hint=request.hint,
            buggy_code=request.buggy_code,
            candidate_code=request.candidate_code,
        )
        return CoachResponse(**report)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

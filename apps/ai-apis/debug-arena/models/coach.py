from pydantic import BaseModel


class CoachRequest(BaseModel):
    scenario_id: str
    title: str
    difficulty: str
    description: str
    stack_trace: str
    hint: str
    buggy_code: str
    candidate_code: str


class CoachResponse(BaseModel):
    root_cause: str
    action_plan: list[str]
    risk_flags: list[str]
    judge_line: str

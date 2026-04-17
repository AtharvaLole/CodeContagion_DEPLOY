from pydantic import BaseModel


class HecklerRequest(BaseModel):
    scenario_id: str
    title: str
    difficulty: str
    buggy_code: str
    candidate_code: str
    time_left: int
    keystrokes: int
    tab_switches: int
    pasted: bool


class HecklerResponse(BaseModel):
    taunt: str

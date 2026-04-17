from typing import Any, Literal

from pydantic import BaseModel, Field


class DebriefRequest(BaseModel):
    scenario_id: str
    title: str
    difficulty: str
    description: str
    hint: str
    buggy_code: str
    candidate_code: str
    passed: bool
    duration_seconds: int
    keystrokes: int
    tab_switches: int
    pasted: bool
    test_results: list[dict[str, Any]]
    scores: dict[str, Any]


class DebriefSignal(BaseModel):
    dimension: str
    evidence_span: str = ""
    why_it_helped: str | None = None
    impact: str | None = None


class DebriefSafety(BaseModel):
    leak_risk: Literal["low", "medium", "high"] = "low"
    redactions_applied: bool = False
    fallback_used: bool = False


class DebriefResponse(BaseModel):
    provider: str = "fallback"
    verdict: str
    confidence_band: Literal["low", "medium", "high"] = "medium"
    strengths: list[DebriefSignal] = Field(default_factory=list)
    weaknesses: list[DebriefSignal] = Field(default_factory=list)
    misconception_tags: list[str] = Field(default_factory=list)
    next_practice_focus: str
    hints: list[str] = Field(default_factory=list)
    approach_skeleton: list[str] = Field(default_factory=list)
    judge_soundbite: str
    safety: DebriefSafety = Field(default_factory=DebriefSafety)
    # Backward-compatible shim for existing clients that still expect this field.
    optimal_approach: str | None = None

import json
import re
from typing import Any

try:
    from ..core.ai_client import get_chat_completion_with_metadata
except ImportError:  # pragma: no cover - compatibility for direct module execution
    from core.ai_client import get_chat_completion_with_metadata


ALLOWED_CONFIDENCE_BANDS = {"low", "medium", "high"}
ALLOWED_LEAK_RISKS = {"low", "medium", "high"}

ALLOWED_MISCONCEPTION_TAGS = {
    "mutable-default-argument",
    "input-validation",
    "state-mutation",
    "error-handling",
    "edge-case-coverage",
    "resource-cleanup",
    "concurrency-ordering",
    "off-by-one",
    "type-assumption",
    "null-safety",
}

MISCONCEPTION_KEYWORDS: dict[str, tuple[str, ...]] = {
    "mutable-default-argument": (
        "mutable default",
        "default argument",
        "shared state",
    ),
    "input-validation": ("validate", "validation", "sanitize", "input"),
    "state-mutation": ("mutate", "mutation", "state leak", "side effect"),
    "error-handling": ("exception", "error", "raise", "try", "catch"),
    "edge-case-coverage": ("edge case", "boundary", "empty", "zero", "missing"),
    "resource-cleanup": ("finally", "cleanup", "release", "lock", "close"),
    "concurrency-ordering": ("race", "concurrency", "ordering", "critical section"),
    "off-by-one": ("off by one", "index", "boundary condition"),
    "type-assumption": ("type", "cast", "coerce", "assumption"),
    "null-safety": ("null", "none", "undefined", "nil"),
}

CODE_LEAK_PATTERNS = (
    re.compile(r"```"),
    re.compile(r"\b(def|class|function|return|import|from)\b"),
    re.compile(r"=>|\{|\}|;"),
)


def _clip_text(value: Any, max_len: int = 220) -> str:
    text = str(value).strip() if value is not None else ""
    return re.sub(r"\s+", " ", text)[:max_len]


def _normalize_band(value: Any, allowed: set[str], default: str) -> str:
    band = _clip_text(value, 20).lower()
    return band if band in allowed else default


def _extract_string_list(raw: Any, max_items: int) -> list[str]:
    if not isinstance(raw, list):
        return []

    items: list[str] = []
    for entry in raw:
        text = _clip_text(entry)
        if text:
            items.append(text)
        if len(items) >= max_items:
            break
    return items


def _normalize_strengths(raw: Any) -> list[dict[str, str]]:
    strengths: list[dict[str, str]] = []
    if isinstance(raw, list):
        for entry in raw[:4]:
            if isinstance(entry, dict):
                strengths.append(
                    {
                        "dimension": _clip_text(
                            entry.get("dimension") or "Code reasoning", 90
                        ),
                        "evidence_span": _clip_text(entry.get("evidence_span"), 220),
                        "why_it_helped": _clip_text(
                            entry.get("why_it_helped")
                            or "This improved correctness and reduced bug risk.",
                            220,
                        ),
                    }
                )
            else:
                item_text = _clip_text(entry, 220)
                if item_text:
                    strengths.append(
                        {
                            "dimension": "Code reasoning",
                            "evidence_span": item_text,
                            "why_it_helped": "This improved correctness and reduced bug risk.",
                        }
                    )
    return strengths[:4]


def _normalize_weaknesses(raw: Any) -> list[dict[str, str]]:
    weaknesses: list[dict[str, str]] = []
    if isinstance(raw, list):
        for entry in raw[:4]:
            if isinstance(entry, dict):
                weaknesses.append(
                    {
                        "dimension": _clip_text(
                            entry.get("dimension") or "Bug risk", 90
                        ),
                        "evidence_span": _clip_text(entry.get("evidence_span"), 220),
                        "impact": _clip_text(
                            entry.get("impact")
                            or "This can keep checks failing or create unstable behavior.",
                            220,
                        ),
                    }
                )
            else:
                item_text = _clip_text(entry, 220)
                if item_text:
                    weaknesses.append(
                        {
                            "dimension": "Bug risk",
                            "evidence_span": item_text,
                            "impact": "This can keep checks failing or create unstable behavior.",
                        }
                    )
    return weaknesses[:4]


def _infer_misconception_tags(
    hint: str, failed_tests: list[dict[str, Any]]
) -> list[str]:
    haystack = " ".join(
        [hint]
        + [
            _clip_text(test.get("description") or test.get("name"))
            for test in failed_tests[:4]
        ]
    ).lower()

    tags: list[str] = []
    for tag, keywords in MISCONCEPTION_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            tags.append(tag)
        if len(tags) >= 3:
            break
    return tags


def _normalize_misconception_tags(
    raw: Any, hint: str, failed_tests: list[dict[str, Any]]
) -> list[str]:
    normalized: list[str] = []
    if isinstance(raw, list):
        for entry in raw:
            candidate = _clip_text(entry, 60).lower().replace("_", "-")
            if candidate in ALLOWED_MISCONCEPTION_TAGS and candidate not in normalized:
                normalized.append(candidate)
            if len(normalized) >= 4:
                break

    if normalized:
        return normalized

    inferred = _infer_misconception_tags(hint, failed_tests)
    return inferred if inferred else ["edge-case-coverage"]


def _default_hints(hint: str, failed_tests: list[dict[str, Any]]) -> list[str]:
    first_failure = _clip_text(
        failed_tests[0].get("description") if failed_tests else "", 180
    )
    conceptual = _clip_text(
        f"Conceptual hint: {hint or 'Track the exact state transition that breaks the test behavior.'}",
        220,
    )
    procedural = _clip_text(
        f"Procedural hint: Re-run the first failing check and trace input → branch condition → side effect{' (' + first_failure + ')' if first_failure else ''}.",
        220,
    )
    return [conceptual, procedural]


def _normalize_hints(
    raw: Any, hint: str, failed_tests: list[dict[str, Any]]
) -> list[str]:
    hints = _extract_string_list(raw, 2)
    if len(hints) < 2:
        return _default_hints(hint, failed_tests)
    return hints


def _normalize_approach_skeleton(raw: Any) -> list[str]:
    skeleton = _extract_string_list(raw, 4)
    if skeleton:
        return skeleton
    return [
        "Isolate the failing behavior and confirm its trigger conditions.",
        "Apply a minimal fix aligned with the scenario hint and observed failure path.",
        "Re-run checks and verify no side effects were introduced.",
    ]


def _contains_code_like_content(text: str) -> bool:
    return any(pattern.search(text) for pattern in CODE_LEAK_PATTERNS)


def _evaluate_leak_risk(report: dict[str, Any]) -> tuple[str, bool]:
    combined = " ".join(
        [
            _clip_text(report.get("verdict"), 600),
            " ".join(_extract_string_list(report.get("hints"), 4)),
            " ".join(_extract_string_list(report.get("approach_skeleton"), 6)),
            _clip_text(report.get("judge_soundbite"), 180),
        ]
    )

    if _contains_code_like_content(combined):
        return ("high", True)

    declared = _normalize_band(
        (report.get("safety") or {}).get("leak_risk"),
        ALLOWED_LEAK_RISKS,
        "low",
    )
    return (declared, False)


def _build_fallback_debrief(
    *,
    passed: bool,
    hint: str,
    duration_seconds: int,
    tab_switches: int,
    pasted: bool,
    failed_tests: list[dict[str, Any]],
    provider: str = "fallback",
    leak_risk: str = "medium",
    redactions_applied: bool = False,
) -> dict[str, Any]:
    strengths = [
        {
            "dimension": "Execution pace",
            "evidence_span": (
                "Round completed quickly under pressure."
                if duration_seconds <= 90
                else "Round completed with sustained focus."
            ),
            "why_it_helped": "Maintaining momentum reduces context switching mistakes.",
        },
        {
            "dimension": "Discipline",
            "evidence_span": (
                "No clipboard usage detected."
                if not pasted
                else "Manual debugging effort remained active."
            ),
            "why_it_helped": "Hands-on iteration improves understanding of failure mechanics.",
        },
    ]

    weaknesses = [
        {
            "dimension": "Regression coverage",
            "evidence_span": _clip_text(
                test.get("description")
                or test.get("name")
                or "A scenario check still fails."
            ),
            "impact": "Unresolved checks indicate bug behavior is still reproducible.",
        }
        for test in failed_tests[:2]
    ]
    if not weaknesses:
        weaknesses.append(
            {
                "dimension": "Hardening",
                "evidence_span": "No failures remain, but robustness can still be improved.",
                "impact": "Without hardening, similar variants can reappear in new scenarios.",
            }
        )

    approach_skeleton = [
        "Restate the bug trigger in one sentence before editing code.",
        "Patch only the branch or state transition causing the failing behavior.",
        "Re-run checks and confirm both correctness and resilience under edge inputs.",
    ]

    return {
        "provider": provider,
        "verdict": (
            "Containment complete. The submission cleared current checks."
            if passed
            else "Containment incomplete. Some checks still indicate unstable behavior."
        ),
        "confidence_band": "high" if passed else "medium",
        "strengths": strengths,
        "weaknesses": weaknesses,
        "misconception_tags": _infer_misconception_tags(hint, failed_tests),
        "next_practice_focus": _clip_text(
            "Tighten bug-to-test traceability so each code change maps to one failing check."
        ),
        "hints": _default_hints(hint, failed_tests),
        "approach_skeleton": approach_skeleton,
        "judge_soundbite": (
            "Clean fixes come from precise reasoning, not bigger edits."
            if passed
            else "Treat each failing check as a signal, not a setback."
        ),
        "safety": {
            "leak_risk": leak_risk,
            "redactions_applied": redactions_applied,
            "fallback_used": True,
        },
        "optimal_approach": " ".join(approach_skeleton),
    }


async def generate_debrief(
    scenario_id: str,
    title: str,
    difficulty: str,
    description: str,
    hint: str,
    buggy_code: str,
    candidate_code: str,
    passed: bool,
    duration_seconds: int,
    keystrokes: int,
    tab_switches: int,
    pasted: bool,
    test_results: list[dict[str, Any]],
    scores: dict[str, Any],
) -> dict:
    """Generate a rich, non-spoiler post-round debrief."""

    failed_tests = [t for t in test_results if not t.get("passed", False)]
    passed_tests = [t for t in test_results if t.get("passed", False)]

    system_prompt = """
You are an expert post-round debugging evaluator for a competitive cybersecurity game.

STRICT SAFETY POLICY (NON-NEGOTIABLE):
1) NEVER provide corrected code, exact replacement lines, final answer text, or full derivations.
2) Hints must stay conceptual/procedural. No direct patch text.
3) Keep advice useful but abstract enough to preserve challenge.

STYLE + QUALITY:
1) Explain what worked and what failed using concrete evidence spans from the player's attempt or tests.
2) Keep strengths/weaknesses brief, specific, and actionable.
3) Use at most 2 hints and at most 4 approach skeleton steps.
4) If uncertain, lower confidence.

OUTPUT FORMAT — strict JSON with exactly these keys:
{
  "verdict": "One concise paragraph",
  "confidence_band": "low|medium|high",
  "strengths": [{"dimension":"...","evidence_span":"...","why_it_helped":"..."}],
  "weaknesses": [{"dimension":"...","evidence_span":"...","impact":"..."}],
  "misconception_tags": ["input-validation","edge-case-coverage"],
  "next_practice_focus": "single concrete skill target",
  "hints": ["hint1","hint2"],
  "approach_skeleton": ["step1","step2","step3"],
  "judge_soundbite": "one line closing",
  "safety": {"leak_risk":"low|medium|high"}
}
"""

    strict_repair_prompt = """
Safety repair mode: previous output risked revealing too much.
Regenerate with higher abstraction. No code-like tokens, no syntax snippets, no final-answer phrasing.
"""

    user_message = json.dumps(
        {
            "scenario": {
                "id": scenario_id,
                "title": title,
                "difficulty": difficulty,
                "description": description,
                "hint": hint,
            },
            "buggy_code": buggy_code[:6000],
            "candidate_code": candidate_code[:6000],
            "outcome": {
                "passed": passed,
                "duration_seconds": duration_seconds,
                "keystrokes": keystrokes,
                "tab_switches": tab_switches,
                "paste_attempted": pasted,
            },
            "tests": {
                "passed": [
                    {"name": t["name"], "description": t.get("description", "")}
                    for t in passed_tests
                ],
                "failed": [
                    {"name": t["name"], "description": t.get("description", "")}
                    for t in failed_tests
                ],
            },
            "scores": scores,
        }
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    async def _generate_once(
        generation_messages: list[dict[str, str]],
    ) -> tuple[str, dict[str, Any]]:
        completion = await get_chat_completion_with_metadata(
            generation_messages,
            temperature=0.25,
            response_format={"type": "json_object"},
            max_tokens=1300,
        )
        parsed = json.loads(completion["content"])
        provider = completion.get("provider", "fallback")
        return provider, parsed

    try:
        provider, parsed = await _generate_once(messages)
    except Exception:
        return _build_fallback_debrief(
            passed=passed,
            hint=hint,
            duration_seconds=duration_seconds,
            tab_switches=tab_switches,
            pasted=pasted,
            failed_tests=failed_tests,
            provider="fallback",
            leak_risk="medium",
        )

    leak_risk, redactions_applied = _evaluate_leak_risk(parsed)

    if leak_risk == "high" or redactions_applied:
        try:
            provider, parsed = await _generate_once(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "system", "content": strict_repair_prompt},
                    {"role": "user", "content": user_message},
                ]
            )
            leak_risk, redactions_applied = _evaluate_leak_risk(parsed)
        except Exception:
            return _build_fallback_debrief(
                passed=passed,
                hint=hint,
                duration_seconds=duration_seconds,
                tab_switches=tab_switches,
                pasted=pasted,
                failed_tests=failed_tests,
                provider="fallback",
                leak_risk="high",
                redactions_applied=True,
            )

    if leak_risk == "high":
        return _build_fallback_debrief(
            passed=passed,
            hint=hint,
            duration_seconds=duration_seconds,
            tab_switches=tab_switches,
            pasted=pasted,
            failed_tests=failed_tests,
            provider="fallback",
            leak_risk="high",
            redactions_applied=True,
        )

    strengths = _normalize_strengths(parsed.get("strengths"))
    if not strengths:
        strengths = _build_fallback_debrief(
            passed=passed,
            hint=hint,
            duration_seconds=duration_seconds,
            tab_switches=tab_switches,
            pasted=pasted,
            failed_tests=failed_tests,
            provider=provider,
            leak_risk=leak_risk,
        )["strengths"]

    weaknesses = _normalize_weaknesses(parsed.get("weaknesses"))
    if not weaknesses:
        weaknesses = _build_fallback_debrief(
            passed=passed,
            hint=hint,
            duration_seconds=duration_seconds,
            tab_switches=tab_switches,
            pasted=pasted,
            failed_tests=failed_tests,
            provider=provider,
            leak_risk=leak_risk,
        )["weaknesses"]

    hints = _normalize_hints(parsed.get("hints"), hint, failed_tests)
    approach_skeleton = _normalize_approach_skeleton(parsed.get("approach_skeleton"))

    debrief = {
        "provider": provider,
        "verdict": _clip_text(parsed.get("verdict") or "Round complete.", 520),
        "confidence_band": _normalize_band(
            parsed.get("confidence_band"), ALLOWED_CONFIDENCE_BANDS, "medium"
        ),
        "strengths": strengths,
        "weaknesses": weaknesses,
        "misconception_tags": _normalize_misconception_tags(
            parsed.get("misconception_tags"), hint, failed_tests
        ),
        "next_practice_focus": _clip_text(
            parsed.get("next_practice_focus")
            or "Practice mapping each failing check to one specific code decision.",
            220,
        ),
        "hints": hints,
        "approach_skeleton": approach_skeleton,
        "judge_soundbite": _clip_text(
            parsed.get("judge_soundbite")
            or "Disciplined debugging wins more rounds than rushed edits.",
            180,
        ),
        "safety": {
            "leak_risk": _normalize_band(leak_risk, ALLOWED_LEAK_RISKS, "medium"),
            "redactions_applied": redactions_applied,
            "fallback_used": False,
        },
        "optimal_approach": " ".join(approach_skeleton),
    }

    # Extra runtime safeguard: never return code-like hints/steps.
    post_leak_risk, post_redaction = _evaluate_leak_risk(debrief)
    if post_leak_risk == "high" or post_redaction:
        return _build_fallback_debrief(
            passed=passed,
            hint=hint,
            duration_seconds=duration_seconds,
            tab_switches=tab_switches,
            pasted=pasted,
            failed_tests=failed_tests,
            provider="fallback",
            leak_risk="high",
            redactions_applied=True,
        )

    return debrief

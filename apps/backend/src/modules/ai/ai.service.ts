import { env } from "../../config/env.js";
import { v4 as uuidv4 } from "uuid";
import { debugArenaScenarios } from "../debug-arena/debug-arena.data.js";
import type { DebugArenaScenario, AiScenarioGenerateRequest, AiGeneratedScenario, AiJudgeRequest, AiJudgeResult } from "../debug-arena/debug-arena.types.js";
import type { MisinfoContent, SoloSimulationState } from "../misinfo-sim/misinfo-sim.types.js";

type AiProvider = "nvidia-nim" | "groq" | "fallback";

type DebriefConfidenceBand = "low" | "medium" | "high";
type DebriefLeakRisk = "low" | "medium" | "high";

export type DebriefSignal = {
  dimension: string;
  evidenceSpan: string;
  whyItHelped?: string;
  impact?: string;
};

export type DebugDebriefSafety = {
  leakRisk: DebriefLeakRisk;
  redactionsApplied: boolean;
  fallbackUsed: boolean;
};

export type DebugCoachReport = {
  provider: AiProvider;
  title: string;
  rootCause: string;
  actionPlan: string[];
  riskFlags: string[];
  judgeLine: string;
};

export type DebugDebriefReport = {
  provider: AiProvider;
  verdict: string;
  confidenceBand: DebriefConfidenceBand;
  strengths: DebriefSignal[];
  weaknesses: DebriefSignal[];
  misconceptionTags: string[];
  nextPracticeFocus: string;
  hints: string[];
  approachSkeleton: string[];
  optimalApproach?: string;
  judgeSoundbite: string;
  safety: DebugDebriefSafety;
};

export type MisinfoIntelReport = {
  provider: AiProvider;
  threatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  verdict: string;
  evidence: string[];
  recommendation: string;
  commsScript: string;
};

function getGroqModel() {
  return env.GROQ_MODEL || "llama-3.3-70b-versatile";
}

function getNvidiaModel() {
  return env.NVIDIA_MODEL_ID || "meta/llama-3.1-8b-instruct";
}

function resolveProvider(): AiProvider {
  const preferred = (env.AI_PROVIDER ?? "nvidia-nim").toLowerCase();
  const hasNvidia = Boolean(env.NVIDIA_API_KEY);
  const hasGroq = Boolean(env.GROQ_API_KEY);

  if (["nvidia", "nim", "nvidia-nim"].includes(preferred) && hasNvidia) return "nvidia-nim";
  if (preferred === "groq" && hasGroq) return "groq";
  if (hasNvidia) return "nvidia-nim";
  if (hasGroq) return "groq";
  return "fallback";
}

function withProvider<T extends Record<string, unknown>>(provider: AiProvider, payload: T): T & { provider: AiProvider } {
  return {
    provider,
    ...payload
  };
}

async function callAiJson<T extends Record<string, unknown>>(input: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<{ provider: AiProvider; data: T } | null> {
  const provider = resolveProvider();

  if (provider === "nvidia-nim") {
    const result = await callNvidiaJson<T>(input);
    if (result) return { provider: "nvidia-nim", data: result };
    // Fall through to Groq if NVIDIA fails
    const groqResult = await callGroqJson<T>(input);
    if (groqResult) return { provider: "groq", data: groqResult };
    return null;
  }

  if (provider === "groq") {
    const result = await callGroqJson<T>(input);
    if (result) return { provider: "groq", data: result };
    return null;
  }

  return null;
}

async function callNvidiaJson<T extends Record<string, unknown>>(input: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<T | null> {
  if (!env.NVIDIA_API_KEY) {
    return null;
  }

  const baseUrl = (env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/+$/, "");

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: getNvidiaModel(),
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt }
        ]
      })
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      return null;
    }

    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function callGroqJson<T extends Record<string, unknown>>(input: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<T | null> {
  if (!env.GROQ_API_KEY) {
    return null;
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: getGroqModel(),
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt }
        ]
      })
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      return null;
    }

    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function getScenario(scenarioId: string) {
  return debugArenaScenarios.find((entry) => entry.id === scenarioId) ?? null;
}

function collectFailedTests(scenario: DebugArenaScenario, code: string) {
  return scenario.tests.filter((test) => !test.check(code));
}

function fallbackDebugCoach(scenario: DebugArenaScenario, code: string): DebugCoachReport {
  const failedTests = collectFailedTests(scenario, code);
  const missingSignals = scenario.expectedSignals.filter((signal) => !code.includes(signal));

  return withProvider("fallback", {
    title: `AI Coach: ${scenario.title}`,
    rootCause: `${scenario.hint} Right now the patch is still missing ${missingSignals.length > 0 ? `these likely signals: ${missingSignals.join(", ")}` : "at least one behavior expected by the scenario checks"}.`,
    actionPlan: [
      `Focus first on this failure pattern: ${failedTests[0]?.description ?? "stabilize the main broken path before polishing."}`,
      missingSignals[0]
        ? `Add or verify the code shape around "${missingSignals[0]}" because the automated checks are looking for it.`
        : "Re-read the stack trace and line up your fix with the failing execution path.",
      "After the main fix, scan for side effects so the patch does not solve one bug while creating another."
    ],
    riskFlags: failedTests.slice(0, 3).map((test) => test.name),
    judgeLine: "This is not static hinting. The coach is reading the live patch state and reacting to the exact bug pattern."
  });
}

function inferMisconceptionTags(scenario: DebugArenaScenario, failedTests: Array<{ description: string }>) {
  const haystack = `${scenario.hint} ${failedTests.map((test) => test.description).join(" ")}`.toLowerCase();

  const tags: string[] = [];
  if (haystack.includes("mutable default")) tags.push("mutable-default-argument");
  if (haystack.includes("validation") || haystack.includes("sanitize")) tags.push("input-validation");
  if (haystack.includes("edge") || haystack.includes("boundary")) tags.push("edge-case-coverage");
  if (haystack.includes("lock") || haystack.includes("cleanup") || haystack.includes("finally")) tags.push("resource-cleanup");
  if (haystack.includes("race") || haystack.includes("concurrency")) tags.push("concurrency-ordering");
  if (haystack.includes("null") || haystack.includes("none") || haystack.includes("undefined")) tags.push("null-safety");

  return tags.length > 0 ? tags.slice(0, 4) : ["edge-case-coverage"];
}

function normalizeConfidenceBand(value: unknown, fallback: DebriefConfidenceBand): DebriefConfidenceBand {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return fallback;
}

function normalizeLeakRisk(value: unknown, fallback: DebriefLeakRisk): DebriefLeakRisk {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return fallback;
}

function normalizeSignals(
  raw: unknown,
  fallback: DebriefSignal[],
  kind: "strength" | "weakness"
): DebriefSignal[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return fallback;
  }

  const mapped: DebriefSignal[] = [];

  for (const entry of raw.slice(0, 4)) {
    if (typeof entry === "string") {
      const evidenceSpan = entry.trim();
      if (!evidenceSpan) {
        continue;
      }

      mapped.push(
        kind === "strength"
          ? {
              dimension: "Code reasoning",
              evidenceSpan,
              whyItHelped: "This improved correctness and reduced bug risk."
            }
          : {
              dimension: "Bug risk",
              evidenceSpan,
              impact: "This can keep checks failing or create unstable behavior."
            }
      );
      continue;
    }

    if (!entry || typeof entry !== "object") {
      continue;
    }

    const data = entry as Record<string, unknown>;
    const dimension = String(
      data.dimension ?? (kind === "strength" ? "Code reasoning" : "Bug risk")
    );
    const evidenceSpan = String(data.evidenceSpan ?? data.evidence_span ?? "").trim();

    if (!evidenceSpan) {
      continue;
    }

    if (kind === "strength") {
      mapped.push({
        dimension,
        evidenceSpan,
        whyItHelped: String(
          data.whyItHelped ??
            data.why_it_helped ??
            "This improved correctness and reduced bug risk."
        )
      });
    } else {
      mapped.push({
        dimension,
        evidenceSpan,
        impact: String(
          data.impact ??
            "This can keep checks failing or create unstable behavior."
        )
      });
    }
  }

  return mapped.length > 0 ? mapped : fallback;
}

function normalizeShortList(raw: unknown, fallback: string[], maxItems = 4): string[] {
  if (!Array.isArray(raw)) {
    return fallback;
  }

  const values = raw
    .map((entry) => String(entry).trim())
    .filter((entry) => entry.length > 0)
    .slice(0, maxItems);

  return values.length > 0 ? values : fallback;
}

function fallbackDebugDebrief(input: {
  scenario: DebugArenaScenario;
  code: string;
  durationSeconds: number;
  pasted: boolean;
  tabSwitches: number;
  keystrokes: number;
}): DebugDebriefReport {
  const failedTests = collectFailedTests(input.scenario, input.code);
  const passed = failedTests.length === 0;

  const strengths: DebriefSignal[] = [
    {
      dimension: "Execution pace",
      evidenceSpan:
        input.durationSeconds <= 60
          ? "Strong response speed under pressure."
          : "You stayed with the round and completed a full attempt.",
      whyItHelped: "Maintaining momentum reduces context-switching mistakes."
    },
    {
      dimension: "Discipline",
      evidenceSpan: input.tabSwitches === 0 ? "No tab-switch penalty was recorded." : "You recovered despite context switching.",
      whyItHelped: "Lower context switching improves debugging accuracy."
    },
    {
      dimension: "Effort signal",
      evidenceSpan:
        input.keystrokes > 20
          ? "Evidence of active problem-solving rather than a minimal guess."
          : "Compact patch attempt with limited surface area.",
      whyItHelped: "Structured iteration provides clearer feedback loops from tests."
    }
  ];

  const weaknesses: DebriefSignal[] = [
    ...(failedTests.length > 0
      ? failedTests.slice(0, 2).map((test) => ({
          dimension: "Regression coverage",
          evidenceSpan: test.description,
          impact: "Unresolved checks indicate bug behavior is still reproducible."
        }))
      : [
          {
            dimension: "Hardening",
            evidenceSpan: "No failing checks remain in this submission.",
            impact: "Edge-condition hardening is still needed for long-term reliability."
          }
        ]),
    {
      dimension: "Input discipline",
      evidenceSpan: input.pasted ? "Clipboard usage was attempted during the round." : "No clipboard penalty was triggered.",
      impact: input.pasted
        ? "Paste dependence can reduce understanding of root-cause mechanics."
        : "Continue preserving manual-debugging discipline under pressure."
    }
  ];

  const hints = [
    `Conceptual hint: ${input.scenario.hint}`,
    `Procedural hint: ${failedTests[0]?.description ?? "Re-run the first failing check and trace input → branch → side effect."}`
  ];

  const approachSkeleton = [
    "Restate the failing behavior in one sentence before editing code.",
    "Patch only the branch or state transition causing the failed checks.",
    "Re-run checks and confirm no side effects were introduced."
  ];

  return withProvider("fallback", {
    verdict: passed
      ? "Containment successful. Your patch cleared the current scenario checks."
      : "Containment incomplete. The patch still leaves regression signals in the scenario test suite.",
    confidenceBand: passed ? "high" : "medium",
    strengths,
    weaknesses,
    misconceptionTags: inferMisconceptionTags(
      input.scenario,
      failedTests.map((test) => ({ description: test.description }))
    ),
    nextPracticeFocus: "Map each failed check to one explicit code decision before writing the next patch.",
    hints,
    approachSkeleton,
    optimalApproach: approachSkeleton.join(" "),
    judgeSoundbite: passed
      ? "Clean fixes come from precise reasoning, not bigger edits."
      : "Treat each failing check as a signal, not a setback.",
    safety: {
      leakRisk: "low" as DebriefLeakRisk,
      redactionsApplied: false,
      fallbackUsed: true
    }
  });
}

function computeThreatLevel(content: MisinfoContent | null, session: SoloSimulationState, followerCount: number) {
  if (!content) {
    return followerCount > 5000 || session.panicLevel >= 70 ? "HIGH" : "MEDIUM";
  }

  if (!content.isReal && (followerCount > 5000 || session.panicLevel >= 70)) {
    return "CRITICAL";
  }

  if (!content.isReal) {
    return "HIGH";
  }

  if (session.panicLevel >= 65) {
    return "MEDIUM";
  }

  return "LOW";
}

function fallbackMisinfoIntel(input: {
  session: SoloSimulationState;
  node: SoloSimulationState["nodes"][number];
  content: MisinfoContent | null;
}) {
  const threatLevel = computeThreatLevel(input.content, input.session, input.node.followers);
  const evidence = input.content
    ? [
        ...input.content.manipulationSignals.map((signal) => `Signal detected: ${signal}`),
        input.content.evidence,
        input.content.artifactHint
      ]
    : ["No linked content artifact found for this node. Prioritize graph position and follower reach instead."];

  const recommendation = input.content?.isReal
    ? "Avoid overreacting. Investigate first, preserve credibility, and spend stronger actions on truly infected narratives."
    : input.node.status === "infected"
      ? "This node is a high-priority containment target. Investigate if context is missing, otherwise fact-check or quarantine based on action budget."
      : "The content looks suspicious. Investigate first to expose signals, then coordinate the cheapest effective response.";

  return withProvider("fallback", {
    threatLevel,
    verdict: input.content
      ? input.content.isReal
        ? "The artifact leans credible, but network conditions still matter."
        : "This artifact shows classic misinformation markers and should be treated as hostile."
      : "This node has no attached artifact, so risk must be inferred from graph behavior and reach.",
    evidence: evidence.slice(0, 4),
    recommendation,
    commsScript: input.content?.isReal
      ? "Team note: low-confidence threat. Monitor this node, but do not burn heavy action points yet."
      : `Team note: ${input.node.label} is amplifying suspicious content. Prioritize containment before the panic curve spikes.`
  });
}

export async function generateDebugCoachReport(input: {
  scenarioId: string;
  code: string;
}) {
  const scenario = getScenario(input.scenarioId);

  if (!scenario) {
    throw new Error("Scenario not found.");
  }

  const failedTests = collectFailedTests(scenario, input.code).map((test) => ({
    name: test.name,
    description: test.description
  }));
  const fallback = fallbackDebugCoach(scenario, input.code);

  const aiResult = await callAiJson<Omit<DebugCoachReport, "provider">>({
    systemPrompt:
      "You are an elite debugging coach for a hackathon game. Return strict JSON with keys title, rootCause, actionPlan, riskFlags, judgeLine. actionPlan and riskFlags must be arrays of short strings. Be specific, concise, and beginner-friendly.",
    userPrompt: JSON.stringify({
      scenario: {
        id: scenario.id,
        title: scenario.title,
        difficulty: scenario.difficulty,
        description: scenario.description,
        stackTrace: scenario.stackTrace,
        hint: scenario.hint,
        expectedSignals: scenario.expectedSignals
      },
      failedTests,
      candidateCode: input.code.slice(0, 8000)
    })
  });

  if (!aiResult) {
    return fallback;
  }

  const aiResponse = aiResult.data;
  return withProvider(aiResult.provider, {
    title: aiResponse.title || fallback.title,
    rootCause: aiResponse.rootCause || fallback.rootCause,
    actionPlan: Array.isArray(aiResponse.actionPlan) && aiResponse.actionPlan.length > 0 ? aiResponse.actionPlan.slice(0, 4) : fallback.actionPlan,
    riskFlags: Array.isArray(aiResponse.riskFlags) && aiResponse.riskFlags.length > 0 ? aiResponse.riskFlags.slice(0, 4) : fallback.riskFlags,
    judgeLine: aiResponse.judgeLine || fallback.judgeLine
  });
}

export async function generateDebugDebriefReport(input: {
  scenarioId: string;
  code: string;
  durationSeconds: number;
  pasted: boolean;
  tabSwitches: number;
  keystrokes: number;
}) {
  const scenario = getScenario(input.scenarioId);

  if (!scenario) {
    throw new Error("Scenario not found.");
  }

  const failedTests = collectFailedTests(scenario, input.code).map((test) => ({
    name: test.name,
    description: test.description
  }));
  const fallback = fallbackDebugDebrief({
    scenario,
    ...input
  });

  const aiResult = await callAiJson<Record<string, unknown>>({
    systemPrompt:
      "You are an expert post-round coding coach inside a cyber game. Return strict JSON with keys verdict, confidenceBand, strengths, weaknesses, misconceptionTags, nextPracticeFocus, hints, approachSkeleton, judgeSoundbite, safety. NEVER provide corrected code or exact fix lines.",
    userPrompt: JSON.stringify({
      scenario: {
        title: scenario.title,
        difficulty: scenario.difficulty,
        hint: scenario.hint
      },
      metrics: {
        durationSeconds: input.durationSeconds,
        pasted: input.pasted,
        tabSwitches: input.tabSwitches,
        keystrokes: input.keystrokes
      },
      failedTests,
      candidateCode: input.code.slice(0, 8000)
    })
  });

  if (!aiResult) {
    return fallback;
  }

  const aiResponse = aiResult.data;
  const safetyRaw = (aiResponse.safety ?? {}) as Record<string, unknown>;
  const approachSkeleton = normalizeShortList(
    aiResponse.approachSkeleton ?? aiResponse.approach_skeleton,
    fallback.approachSkeleton,
    4
  );

  return withProvider(aiResult.provider, {
    verdict: String(aiResponse.verdict ?? fallback.verdict),
    confidenceBand: normalizeConfidenceBand(aiResponse.confidenceBand ?? aiResponse.confidence_band, fallback.confidenceBand),
    strengths: normalizeSignals(aiResponse.strengths, fallback.strengths, "strength"),
    weaknesses: normalizeSignals(aiResponse.weaknesses, fallback.weaknesses, "weakness"),
    misconceptionTags: normalizeShortList(aiResponse.misconceptionTags ?? aiResponse.misconception_tags, fallback.misconceptionTags, 4),
    nextPracticeFocus: String(aiResponse.nextPracticeFocus ?? aiResponse.next_practice_focus ?? fallback.nextPracticeFocus),
    hints: normalizeShortList(aiResponse.hints, fallback.hints, 2),
    approachSkeleton,
    optimalApproach: String(aiResponse.optimalApproach ?? aiResponse.optimal_approach ?? approachSkeleton.join(" ")),
    judgeSoundbite: String(aiResponse.judgeSoundbite ?? aiResponse.judge_soundbite ?? fallback.judgeSoundbite),
    safety: {
      leakRisk: normalizeLeakRisk(safetyRaw.leakRisk ?? safetyRaw.leak_risk, fallback.safety.leakRisk),
      redactionsApplied: typeof safetyRaw.redactionsApplied === "boolean"
        ? safetyRaw.redactionsApplied
        : typeof safetyRaw.redactions_applied === "boolean"
          ? safetyRaw.redactions_applied
          : fallback.safety.redactionsApplied,
      fallbackUsed: typeof safetyRaw.fallbackUsed === "boolean"
        ? safetyRaw.fallbackUsed
        : typeof safetyRaw.fallback_used === "boolean"
          ? safetyRaw.fallback_used
          : false
    }
  });
}

export async function generateMisinfoIntelReport(input: {
  session: SoloSimulationState;
  node: SoloSimulationState["nodes"][number];
  content: MisinfoContent | null;
}) {
  const fallback = fallbackMisinfoIntel(input);

  const aiResult = await callAiJson<Omit<MisinfoIntelReport, "provider">>({
    systemPrompt:
      "You are a misinformation forensics analyst inside a multiplayer cyber simulation. Return strict JSON with keys threatLevel, verdict, evidence, recommendation, commsScript. threatLevel must be LOW, MEDIUM, HIGH, or CRITICAL. evidence must be an array of short strings.",
    userPrompt: JSON.stringify({
      session: {
        panicLevel: input.session.panicLevel,
        timeLeft: input.session.timeLeft,
        actionPoints: input.session.actionPoints,
        infectedNodes: input.session.nodes.filter((node) => node.status === "infected").length
      },
      node: {
        id: input.node.id,
        label: input.node.label,
        followers: input.node.followers,
        credibility: input.node.credibility,
        status: input.node.status
      },
      content: input.content
    })
  });

  if (!aiResult) {
    return fallback;
  }

  const aiResponse = aiResult.data;
  return withProvider(aiResult.provider, {
    threatLevel:
      aiResponse.threatLevel === "LOW" ||
      aiResponse.threatLevel === "MEDIUM" ||
      aiResponse.threatLevel === "HIGH" ||
      aiResponse.threatLevel === "CRITICAL"
        ? aiResponse.threatLevel
        : fallback.threatLevel,
    verdict: aiResponse.verdict || fallback.verdict,
    evidence: Array.isArray(aiResponse.evidence) && aiResponse.evidence.length > 0 ? aiResponse.evidence.slice(0, 4) : fallback.evidence,
    recommendation: aiResponse.recommendation || fallback.recommendation,
    commsScript: aiResponse.commsScript || fallback.commsScript
  });
}

export function getAiStatus() {
  const provider = resolveProvider();
  return {
    provider,
    nvidiaConfigured: Boolean(env.NVIDIA_API_KEY),
    groqConfigured: Boolean(env.GROQ_API_KEY),
    model: provider === "nvidia-nim" ? getNvidiaModel() : getGroqModel()
  };
}

export async function generateAiScenario(
  input: AiScenarioGenerateRequest
): Promise<{ result: AiGeneratedScenario; provider: AiProvider }> {
  const sanitizedDescription = input.description?.replace(/<[^>]*>/g, "").slice(0, 500);
  const fallback: AiGeneratedScenario = {
    id: uuidv4(),
    title: `${input.difficulty} ${input.language} Debug Challenge`,
    language: input.language,
    difficulty: input.difficulty,
    description: "Find and fix the bug in this code.",
    stackTrace: `Error: Unexpected behavior\n    at main.${input.language === "python" ? "py" : input.language === "cpp" ? "cpp" : "ts"}:15:3`,
    buggyCode: input.language === "typescript"
      ? `function sum(arr: number[]): number {\n  let total = 0;\n  for (let i = 0; i <= arr.length; i++) {\n    total += arr[i];\n  }\n  return total;\n}\n`
      : input.language === "python"
      ? `def sum_list(arr):\n    total = 0\n    for i in range(len(arr) + 1):\n        total += arr[i]\n    return total\n`
      : `#include <vector>\nint sum(std::vector<int>& arr) {\n    int total = 0;\n    for (int i = 0; i <= arr.size(); i++) {\n        total += arr[i];\n    }\n    return total;\n}\n`,
    hint: "Check the loop boundary condition.",
    evaluationCriteria: "The loop should use < instead of <= to avoid out-of-bounds access.",
    expectedFix: "Change <= to < in the loop condition.",
  };

  try {
    const errorTypesStr = input.errorTypes && input.errorTypes.length > 0 ? input.errorTypes.join(", ") : "any";
    const systemPrompt = `You are a senior software engineer creating debugging challenges. Generate a realistic code debugging scenario.

RULES:
- The buggy code MUST be syntactically valid ${input.language} that compiles/runs but produces WRONG results
- The bug must match difficulty "${input.difficulty}": EASY = obvious typo/off-by-one, MEDIUM = logic error, HARD = subtle algorithmic bug, EXTREME = concurrency/memory/multi-step bug
- The stack trace must be realistic for ${input.language} and reference correct line numbers from the buggy code
- The hint should guide without giving away the answer
- evaluationCriteria must be specific enough for another AI to judge if a fix is correct
- expectedFix describes what changes are needed

Return valid JSON matching this exact schema:
{
  "title": "string - descriptive challenge title",
  "description": "string - what the code is supposed to do and what's going wrong",
  "stackTrace": "string - realistic error output or wrong-result trace",
  "buggyCode": "string - complete valid ${input.language} code with intentional bug(s)",
  "hint": "string - subtle hint",
  "evaluationCriteria": "string - specific criteria for judging correctness",
  "expectedFix": "string - description of the correct fix"
}`;

    const userPrompt = `Language: ${input.language}
Difficulty: ${input.difficulty}
Error types to include: ${errorTypesStr}
${input.description ? `Additional context: ${sanitizedDescription}` : ""}

Generate a debugging challenge now.`;

    const aiResult = await callAiJson<Omit<AiGeneratedScenario, "id" | "language" | "difficulty">>({ systemPrompt, userPrompt });

    if (!aiResult) {
       return { result: fallback, provider: "fallback" };
    }

    if (!aiResult.data.buggyCode || typeof aiResult.data.buggyCode !== "string") {
      return { result: fallback, provider: "fallback" };
    }

    const assembledScenario: AiGeneratedScenario = {
      ...aiResult.data,
      id: uuidv4(),
      language: input.language,
      difficulty: input.difficulty,
    };

    return { result: assembledScenario, provider: aiResult.provider };
  } catch (err) {
    return { result: fallback, provider: "fallback" };
  }
}

export async function judgeAiScenario(
  input: AiJudgeRequest
): Promise<{ result: AiJudgeResult; provider: AiProvider }> {
  const fallback: AiJudgeResult = {
    correct: false,
    score: 0,
    feedback: "Unable to evaluate submission. Please try again.",
    correctnessScore: 0,
    speedBonus: 0,
    disciplineBonus: 0,
    effortBonus: 0,
  };

  try {
    const maxTime = input.difficulty === "EASY" ? 120 : input.difficulty === "MEDIUM" ? 180 : input.difficulty === "HARD" ? 300 : 420;
    const timeRatio = Math.max(0, 1 - input.durationSeconds / maxTime);
    const speedBonus = Math.round(timeRatio * 15);

    const disciplineBonus = Math.round(
      (input.pasted ? 0 : 5) +
      (input.tabSwitches <= 2 ? 5 : input.tabSwitches <= 5 ? 3 : 0) +
      (input.keystrokes > 10 ? 5 : 0)
    );
    const clampedDiscipline = Math.min(disciplineBonus, 15);

    const systemPrompt = `You are a code review judge evaluating a debugging challenge submission. You must determine if the user correctly fixed the bug.

EVALUATION CRITERIA (from the challenge creator):
${input.evaluationCriteria}

EXPECTED FIX:
${input.expectedFix}

SCORING RULES:
- correctnessScore: 0-60. Award 60 if the fix is correct and complete. Award 30-59 if partially correct. Award 0-29 if incorrect.
- "correct" field: true ONLY if correctnessScore >= 45
- effortBonus: 0-10. Award based on code quality of the fix (clean, minimal, no unnecessary changes = 10)
- feedback: 2-3 sentences explaining what was done right/wrong

Return valid JSON:
{
  "correctnessScore": number,
  "correct": boolean,
  "effortBonus": number,
  "feedback": "string"
}`;

    const userPrompt = `LANGUAGE: ${input.language}
DIFFICULTY: ${input.difficulty}

ORIGINAL BUGGY CODE:
\`\`\`
${input.buggyCode}
\`\`\`

USER'S SUBMITTED FIX:
\`\`\`
${input.userCode}
\`\`\`

Judge this submission now.`;

    const aiResult = await callAiJson<{ correctnessScore: number; correct: boolean; effortBonus: number; feedback: string }>({ systemPrompt, userPrompt });

    if (!aiResult) {
      return { result: fallback, provider: "fallback" };
    }

    const aiResponse = aiResult.data;
    const { correctnessScore, correct, effortBonus, feedback } = aiResponse;
    const clampedEffort = Math.min(typeof effortBonus === "number" ? effortBonus : 0, 10);
    const safeCorrectness = typeof correctnessScore === "number" ? correctnessScore : 0;
    
    const score = safeCorrectness + speedBonus + clampedDiscipline + clampedEffort;

    const result: AiJudgeResult = {
      correct: Boolean(correct),
      score,
      feedback: String(feedback || "Evaluation completed."),
      correctnessScore: safeCorrectness,
      speedBonus,
      disciplineBonus: clampedDiscipline,
      effortBonus: clampedEffort,
    };

    return { result, provider: aiResult.provider };
  } catch (err) {
    return { result: fallback, provider: "fallback" };
  }
}

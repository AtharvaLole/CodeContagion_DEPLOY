import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../shared/middleware/require-auth.js";
import { env } from "../../config/env.js";
import { consumeSoloChatbotQuestion, inspectNode } from "../misinfo-sim/misinfo-sim.service.js";
import { findRoom } from "../misinfo-sim/misinfo-multiplayer.repository.js";
import { findSession } from "../misinfo-sim/misinfo-sim.repository.js";
import { debugArenaScenarios } from "../debug-arena/debug-arena.data.js";
import { consumeRoomChatbotQuestion } from "../misinfo-sim/misinfo-multiplayer.service.js";
import {
  generateDebugCoachReport,
  generateDebugDebriefReport,
  generateMisinfoIntelReport,
  getAiStatus,
  generateAiScenario,
  judgeAiScenario
} from "./ai.service.js";

const aiScenarioGenerateSchema = z.object({
  language: z.enum(["typescript", "python", "cpp"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "EXTREME"]),
  errorTypes: z.array(z.string()).default([]),
  description: z.string().max(500).optional(),
});

const aiJudgeSchema = z.object({
  buggyCode: z.string().min(1),
  userCode: z.string().min(1),
  evaluationCriteria: z.string().min(1),
  expectedFix: z.string().min(1),
  language: z.enum(["typescript", "python", "cpp"]),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "EXTREME"]),
  durationSeconds: z.number().min(0),
  keystrokes: z.number().min(0),
  tabSwitches: z.number().min(0),
  pasted: z.boolean(),
});

const debugCoachSchema = z.object({
  scenarioId: z.string().min(1),
  code: z.string().min(1).max(20_000)
});

const debugDebriefSchema = z.object({
  scenarioId: z.string().min(1),
  code: z.string().min(1).max(20_000),
  durationSeconds: z.number().min(0).max(300),
  pasted: z.boolean(),
  tabSwitches: z.number().min(0).max(50),
  keystrokes: z.number().min(0).max(50_000)
});

const soloIntelSchema = z.object({
  sessionId: z.string().min(1),
  nodeId: z.number().int().nonnegative()
});

const roomIntelSchema = z.object({
  roomCode: z.string().min(6).max(6),
  nodeId: z.number().int().nonnegative()
});

const soloChatSchema = z.object({
  sessionId: z.string().min(1),
  nodeId: z.number().int().nonnegative(),
  question: z.string().min(1).max(500)
});

const roomChatSchema = z.object({
  roomCode: z.string().min(6).max(6),
  nodeId: z.number().int().nonnegative(),
  question: z.string().min(1).max(500)
});

const pyCoachSchema = z.object({
  scenarioId: z.string().min(1),
  code: z.string().min(1).max(20_000)
});

const pyHecklerSchema = z.object({
  scenarioId: z.string().min(1),
  code: z.string().min(1).max(20_000),
  timeLeft: z.number().min(0).max(300),
  keystrokes: z.number().min(0).max(50_000),
  tabSwitches: z.number().min(0).max(50),
  pasted: z.boolean()
});

const pyDebriefSchema = z.object({
  scenarioId: z.string().min(1),
  code: z.string().min(1).max(20_000),
  passed: z.boolean(),
  durationSeconds: z.number().min(0).max(300),
  keystrokes: z.number().min(0).max(50_000),
  tabSwitches: z.number().min(0).max(50),
  pasted: z.boolean(),
  testResults: z.array(z.object({
    name: z.string(),
    description: z.string(),
    passed: z.boolean()
  })),
  scores: z.record(z.number())
});

async function proxyToPython<T>(baseUrl: string, path: string, body: unknown): Promise<T | null> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000)
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const aiRouter = Router();

aiRouter.get("/status", requireAuth, (_req, res) => {
  res.json(getAiStatus());
});

aiRouter.post("/debug-arena/coach", requireAuth, async (req, res) => {
  try {
    const payload = debugCoachSchema.parse(req.body);
    const report = await generateDebugCoachReport(payload);
    return res.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate AI coach report.";
    return res.status(400).json({ message });
  }
});

aiRouter.post("/debug-arena/debrief", requireAuth, async (req, res) => {
  try {
    const payload = debugDebriefSchema.parse(req.body);
    const report = await generateDebugDebriefReport(payload);
    return res.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate AI debrief report.";
    return res.status(400).json({ message });
  }
});

/* ── Python-proxied Debug Arena routes ─────────────────────────────── */

aiRouter.post("/debug-arena/py-coach", requireAuth, async (req, res) => {
  try {
    const payload = pyCoachSchema.parse(req.body);
    const scenario = debugArenaScenarios.find((s) => s.id === payload.scenarioId);

    if (!scenario) {
      return res.status(404).json({ message: "Scenario not found." });
    }

    const pyPayload = {
      scenario_id: scenario.id,
      title: scenario.title,
      difficulty: scenario.difficulty,
      description: scenario.description,
      stack_trace: scenario.stackTrace,
      hint: scenario.hint,
      buggy_code: scenario.buggyCode,
      candidate_code: payload.code
    };

    const pyResult = await proxyToPython<{
      root_cause: string;
      action_plan: string[];
      risk_flags: string[];
      judge_line: string;
    }>(env.DEBUG_ARENA_AI_URL, "/coach", pyPayload);

    if (pyResult) {
      return res.json({
        report: {
          provider: "python",
          title: `AI Coach: ${scenario.title}`,
          rootCause: pyResult.root_cause,
          actionPlan: pyResult.action_plan,
          riskFlags: pyResult.risk_flags,
          judgeLine: pyResult.judge_line
        }
      });
    }

    // Fallback to Node AI
    const report = await generateDebugCoachReport(payload);
    return res.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate AI coach report.";
    return res.status(400).json({ message });
  }
});

aiRouter.post("/debug-arena/py-heckler", requireAuth, async (req, res) => {
  try {
    const payload = pyHecklerSchema.parse(req.body);
    const scenario = debugArenaScenarios.find((s) => s.id === payload.scenarioId);

    if (!scenario) {
      return res.status(404).json({ message: "Scenario not found." });
    }

    const pyPayload = {
      scenario_id: scenario.id,
      title: scenario.title,
      difficulty: scenario.difficulty,
      buggy_code: scenario.buggyCode,
      candidate_code: payload.code,
      time_left: payload.timeLeft,
      keystrokes: payload.keystrokes,
      tab_switches: payload.tabSwitches,
      pasted: payload.pasted
    };

    const pyResult = await proxyToPython<{ taunt: string }>(env.DEBUG_ARENA_AI_URL, "/heckler", pyPayload);

    if (pyResult) {
      return res.json({ taunt: pyResult.taunt });
    }

    // Static fallback if Python is unreachable
    return res.json({ taunt: "The heckler lost signal. Consider yourself temporarily spared." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate heckler taunt.";
    return res.status(400).json({ message });
  }
});

aiRouter.post("/debug-arena/py-debrief", requireAuth, async (req, res) => {
  try {
    const payload = pyDebriefSchema.parse(req.body);
    const scenario = debugArenaScenarios.find((s) => s.id === payload.scenarioId);

    if (!scenario) {
      return res.status(404).json({ message: "Scenario not found." });
    }

    const pyPayload = {
      scenario_id: scenario.id,
      title: scenario.title,
      difficulty: scenario.difficulty,
      description: scenario.description,
      hint: scenario.hint,
      buggy_code: scenario.buggyCode,
      candidate_code: payload.code,
      passed: payload.passed,
      duration_seconds: payload.durationSeconds,
      keystrokes: payload.keystrokes,
      tab_switches: payload.tabSwitches,
      pasted: payload.pasted,
      test_results: payload.testResults,
      scores: payload.scores
    };

    const pyResult = await proxyToPython<{
      provider?: string;
      verdict: string;
      confidence_band?: "low" | "medium" | "high";
      strengths: Array<{
        dimension: string;
        evidence_span: string;
        why_it_helped?: string;
      }>;
      weaknesses: Array<{
        dimension: string;
        evidence_span: string;
        impact?: string;
      }>;
      misconception_tags?: string[];
      next_practice_focus: string;
      hints?: string[];
      approach_skeleton?: string[];
      optimal_approach?: string;
      judge_soundbite: string;
      safety?: {
        leak_risk?: "low" | "medium" | "high";
        redactions_applied?: boolean;
        fallback_used?: boolean;
      };
    }>(env.DEBUG_ARENA_AI_URL, "/debrief", pyPayload);

    if (pyResult) {
      return res.json({
        report: {
          provider: pyResult.provider ?? "python",
          verdict: pyResult.verdict,
          confidenceBand: pyResult.confidence_band ?? "medium",
          strengths: (pyResult.strengths ?? []).map((item) => ({
            dimension: item.dimension,
            evidenceSpan: item.evidence_span,
            whyItHelped: item.why_it_helped
          })),
          weaknesses: (pyResult.weaknesses ?? []).map((item) => ({
            dimension: item.dimension,
            evidenceSpan: item.evidence_span,
            impact: item.impact
          })),
          misconceptionTags: pyResult.misconception_tags ?? [],
          nextPracticeFocus: pyResult.next_practice_focus,
          hints: pyResult.hints ?? [],
          approachSkeleton: pyResult.approach_skeleton ?? [],
          optimalApproach: pyResult.optimal_approach ?? (pyResult.approach_skeleton ?? []).join(" "),
          judgeSoundbite: pyResult.judge_soundbite,
          safety: {
            leakRisk: pyResult.safety?.leak_risk ?? "medium",
            redactionsApplied: pyResult.safety?.redactions_applied ?? false,
            fallbackUsed: pyResult.safety?.fallback_used ?? false
          }
        }
      });
    }

    // Fallback to Node AI
    const report = await generateDebugDebriefReport(payload);
    return res.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate AI debrief report.";
    return res.status(400).json({ message });
  }
});

aiRouter.post("/debug-arena/generate", requireAuth, async (req, res) => {
  try {
    const parsed = aiScenarioGenerateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }
    const result = await generateAiScenario(parsed.data);
    const { evaluationCriteria, expectedFix, ...playerVisible } = result.result;
    return res.json({
      scenario: playerVisible,
      evaluationCriteria: result.result.evaluationCriteria,
      expectedFix: result.result.expectedFix,
      provider: result.provider,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate scenario";
    return res.status(500).json({ error: message });
  }
});

aiRouter.post("/debug-arena/judge", requireAuth, async (req, res) => {
  try {
    const parsed = aiJudgeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }
    const result = await judgeAiScenario(parsed.data);
    return res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to judge submission";
    return res.status(500).json({ error: message });
  }
});

aiRouter.post("/misinfo-sim/solo-intel", requireAuth, async (req, res) => {
  try {
    const payload = soloIntelSchema.parse(req.body);
    const session = await findSession(payload.sessionId);

    if (!session) {
      return res.status(404).json({ message: "Simulation session not found." });
    }

    const inspected = await inspectNode(payload.sessionId, payload.nodeId);
    const report = await generateMisinfoIntelReport({
      session,
      node: inspected.node,
      content: inspected.content
    });

    return res.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate solo intelligence report.";
    return res.status(400).json({ message });
  }
});

aiRouter.post("/misinfo-sim/room-intel", requireAuth, async (req, res) => {
  try {
    const payload = roomIntelSchema.parse(req.body);
    const room = await findRoom(payload.roomCode.toUpperCase());

    if (!room || !room.session) {
      return res.status(404).json({ message: "Room session not found." });
    }

    const inspected = await inspectNode(room.session.sessionId, payload.nodeId);
    const report = await generateMisinfoIntelReport({
      session: room.session,
      node: inspected.node,
      content: inspected.content
    });

    return res.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate room intelligence report.";
    return res.status(400).json({ message });
  }
});

aiRouter.post("/misinfosim/chat", requireAuth, async (req, res) => {
  try {
    // SOLO CHAT
    if ("sessionId" in req.body) {
      const payload = soloChatSchema.parse(req.body);

      const consumed = await consumeSoloChatbotQuestion(payload);

      const pyResult = await proxyToPython<{ response: string }>(
        env.MISINFO_SIM_AI_URL,
        "/chat",
        {
          scenario: consumed.inspected.content,
          question: payload.question
        }
      );

      if (!pyResult?.response) {
        return res.status(502).json({ message: "Misinfo chatbot service is unavailable." });
      }

      return res.json({
        response: pyResult.response,
        session: consumed.session,
        inspected: consumed.inspected
      });
    }

    // ROOM CHAT
    if ("roomCode" in req.body) {
      const payload = roomChatSchema.parse(req.body);

      const consumed = await consumeRoomChatbotQuestion({
        roomCode: payload.roomCode.toUpperCase(),
        userId: req.user.id,
        nodeId: payload.nodeId,
        question: payload.question
      });

      const pyResult = await proxyToPython<{ response: string }>(
        env.MISINFO_SIM_AI_URL,
        "/chat",
        {
          scenario: consumed.inspected.content,
          question: payload.question
        }
      );

      if (!pyResult?.response) {
        return res.status(502).json({ message: "Misinfo chatbot service is unavailable." });
      }

      return res.json({
        response: pyResult.response,
        room: consumed.room,
        inspected: consumed.inspected
      });
    }

    return res.status(400).json({
      message: "Request must include either sessionId or roomCode."
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate chatbot response.";
    return res.status(400).json({ message });
  }
});
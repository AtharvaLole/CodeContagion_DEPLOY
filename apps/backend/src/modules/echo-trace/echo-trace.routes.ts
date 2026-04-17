import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../shared/middleware/require-auth.js";
import { applyScoreToUser } from "../users/score.service.js";
import {
  summarizeEchoTraceSubmission,
  type EchoTraceSubmissionInput
} from "./echo-trace.service.js";

const submitSchema = z.object({
  scenarioId: z.string().min(1),
  queueType: z.enum(["casual", "ranked"]).default("ranked"),
  mode: z.enum(["ai", "duo"]),
  userRole: z.enum(["developer", "saboteur"]),
  winner: z.enum(["user", "ai", "developer", "saboteur"]),
  developerPassed: z.boolean(),
  durationSeconds: z.number().min(0).max(900),
  sabotageScore: z.number().min(0).max(100),
  developerScore: z.number().min(0).max(100),
  sabotageActions: z.array(z.string()).max(12).default([]),
  graphFindings: z.array(z.string()).max(20).default([]),
  repairFindings: z.array(z.string()).max(20).default([])
});

export const echoTraceRouter = Router();

echoTraceRouter.post("/submit", requireAuth, async (req, res) => {
  try {
    const payload = submitSchema.parse(req.body) as EchoTraceSubmissionInput;
    const summary = summarizeEchoTraceSubmission(payload);
    const scoreEvent = await applyScoreToUser({
      userId: req.user.id,
      sourceId: `echo-trace:${payload.scenarioId}:${Date.now()}`,
      mode: payload.queueType === "ranked" ? "echo-trace-ranked" : "echo-trace",
      result: {
        score: summary.overallScore,
        contained: summary.userWon
      }
    });

    return res.json({
      match: {
        scenarioId: payload.scenarioId,
        mode: payload.mode,
        userRole: payload.userRole,
        winner: summary.winner,
        winnerLabel: summary.winnerLabel,
        headline: summary.headline
      },
      scores: {
        user: summary.userScore,
        opponent: summary.opponentScore,
        overall: summary.overallScore,
        breakdown: summary.scorecard
      },
      rankedUpdate: {
        queueType: payload.queueType,
        previousElo: scoreEvent.previousElo ?? 600,
        nextElo: scoreEvent.nextElo ?? 600,
        eloChange: scoreEvent.pointsDelta ?? 0,
        league: scoreEvent.league ?? "Bronze"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to score EchoTrace match.";
    return res.status(400).json({ message });
  }
});

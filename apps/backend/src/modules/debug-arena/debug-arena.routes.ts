import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../shared/middleware/require-auth.js";
import { applyScoreToUser } from "../users/score.service.js";
import {
  evaluateSoloSubmission,
  getSoloScenario,
  listSoloScenariosWithFilters
} from "./debug-arena.service.js";

const submitSchema = z.object({
  scenarioId: z.string().min(1),
  code: z.string().min(1),
  durationSeconds: z.number().min(0).max(300),
  pasted: z.boolean(),
  tabSwitches: z.number().min(0).max(50),
  keystrokes: z.number().min(0).max(50_000),
  queueType: z.enum(["casual", "ranked"]).default("casual")
});

export const debugArenaRouter = Router();

debugArenaRouter.get("/scenarios", requireAuth, (req, res) => {
  const language =
    typeof req.query.language === "string" && req.query.language.length > 0
      ? req.query.language.toLowerCase()
      : undefined;
  const difficulty =
    typeof req.query.difficulty === "string" && req.query.difficulty.length > 0
      ? req.query.difficulty.toUpperCase()
      : undefined;
  const topicId =
    typeof req.query.topicId === "string" && req.query.topicId.length > 0
      ? req.query.topicId
      : undefined;

  res.json({
    scenarios: listSoloScenariosWithFilters({
      language,
      difficulty,
      topicId
    })
  });
});

debugArenaRouter.get("/scenarios/:scenarioId", requireAuth, (req, res) => {
  const scenarioId = Array.isArray(req.params.scenarioId)
    ? req.params.scenarioId[0]
    : req.params.scenarioId;
  const scenario = getSoloScenario(scenarioId);

  if (!scenario) {
    return res.status(404).json({ message: "Scenario not found." });
  }

  return res.json({ scenario });
});

debugArenaRouter.post("/submit", requireAuth, async (req, res) => {
  try {
    const payload = submitSchema.parse(req.body);
    const result = await evaluateSoloSubmission({
      userId: req.user.id,
      scenarioId: payload.scenarioId,
      code: payload.code,
      durationSeconds: payload.durationSeconds,
      pasted: payload.pasted,
      tabSwitches: payload.tabSwitches,
      keystrokes: payload.keystrokes
    });
    const scoreEvent = await applyScoreToUser({
      userId: req.user.id,
      sourceId: `debug-arena:${result.attempt.id}`,
      mode: payload.queueType === "ranked" ? "debug-arena-ranked" : "debug-arena",
      result: {
        score: result.scores.overall,
        contained: result.attempt.passed
      }
    });
    return res.json({
      ...result,
      rankedUpdate: payload.queueType === "ranked"
        ? {
            queueType: "ranked",
            previousElo: scoreEvent.previousElo ?? 600,
            nextElo: scoreEvent.nextElo ?? 600,
            eloChange: scoreEvent.pointsDelta ?? 0,
            league: scoreEvent.league ?? "Bronze"
          }
        : {
            queueType: "casual",
            previousElo: scoreEvent.previousElo ?? scoreEvent.nextElo ?? 600,
            nextElo: scoreEvent.nextElo ?? scoreEvent.previousElo ?? 600,
            eloChange: 0,
            league: scoreEvent.league ?? "Bronze"
          }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to evaluate submission.";
    return res.status(400).json({ message });
  }
});

import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../shared/middleware/require-auth.js";
import { applyScoreToUser } from "../users/score.service.js";
import {
  actOnNode,
  advanceSoloSimulation,
  createSoloSimulation,
  getSoloSimulation,
  inspectNode,
  submitSoloSimulation,
  summarizeSoloResult
} from "./misinfo-sim.service.js";

const actionSchema = z.object({
  nodeId: z.number().int().nonnegative(),
  action: z.enum(["investigate", "fact-check", "quarantine"])
});

const inspectSchema = z.object({
  nodeId: z.number().int().nonnegative()
});

export const misinfoSimRouter = Router();

misinfoSimRouter.post("/solo/session", requireAuth, async (_req, res) => {
  const session = await createSoloSimulation();
  return res.status(201).json({ session });
});

misinfoSimRouter.get("/solo/session/:sessionId", requireAuth, async (req, res) => {
  const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const session = await getSoloSimulation(sessionId);

  if (!session) {
    return res.status(404).json({ message: "Simulation session not found." });
  }

  return res.json({
    session,
    result: summarizeSoloResult(session)
  });
});

misinfoSimRouter.post("/solo/session/:sessionId/tick", requireAuth, async (req, res) => {
  const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;

  try {
    const session = await advanceSoloSimulation(sessionId);
    const result = summarizeSoloResult(session);

    if (session.timeLeft === 0 || result.panicLevel > 40) {
      await applyScoreToUser({
        userId: req.user.id,
        sourceId: `misinfo-solo:${session.sessionId}`,
        mode: "misinfo-solo",
        result
      });
    }

    return res.json({
      session,
      result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to advance simulation.";
    return res.status(400).json({ message });
  }
});

misinfoSimRouter.post("/solo/session/:sessionId/inspect", requireAuth, async (req, res) => {
  const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;

  try {
    const payload = inspectSchema.parse(req.body);
    const inspected = await inspectNode(sessionId, payload.nodeId);
    return res.json({ inspected });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to inspect node.";
    return res.status(400).json({ message });
  }
});

misinfoSimRouter.post("/solo/session/:sessionId/action", requireAuth, async (req, res) => {
  const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;

  try {
    const payload = actionSchema.parse(req.body);
    const result = await actOnNode({
      sessionId,
      ...payload
    });
    return res.json({
      ...result,
      result: summarizeSoloResult(result.session)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to perform simulation action.";
    return res.status(400).json({ message });
  }
});

misinfoSimRouter.post("/solo/session/:sessionId/submit", requireAuth, async (req, res) => {
  const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;

  try {
    const result = await submitSoloSimulation(sessionId);
    await applyScoreToUser({
      userId: req.user.id,
      sourceId: `misinfo-solo:${result.session.sessionId}`,
      mode: "misinfo-solo",
      result: result.result
    });
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit simulation.";
    return res.status(400).json({ message });
  }
});

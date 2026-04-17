import { randomUUID } from "node:crypto";
import { appendAttempt } from "./debug-arena.repository.js";
import { debugArenaScenarios } from "./debug-arena.data.js";
import type { DebugArenaScenario } from "./debug-arena.types.js";

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sanitizeScenario(scenario: DebugArenaScenario) {
  return {
    id: scenario.id,
    topicId: scenario.topicId,
    topicLabel: scenario.topicLabel,
    variantLabel: scenario.variantLabel,
    title: scenario.title,
    language: scenario.language,
    difficulty: scenario.difficulty,
    description: scenario.description,
    stackTrace: scenario.stackTrace,
    buggyCode: scenario.buggyCode,
    hint: scenario.hint
  };
}

export function listSoloScenarios() {
  return debugArenaScenarios.map(sanitizeScenario);
}

export function listSoloScenariosWithFilters(filters?: {
  language?: string;
  difficulty?: string;
  topicId?: string;
}) {
  return debugArenaScenarios
    .filter((scenario) => {
      if (filters?.language && scenario.language !== filters.language) {
        return false;
      }

      if (filters?.difficulty && scenario.difficulty !== filters.difficulty) {
        return false;
      }

      if (filters?.topicId && scenario.topicId !== filters.topicId) {
        return false;
      }

      return true;
    })
    .map(sanitizeScenario);
}

export function getSoloScenario(scenarioId: string) {
  const scenario = debugArenaScenarios.find((entry) => entry.id === scenarioId);
  return scenario ? sanitizeScenario(scenario) : null;
}

export function evaluateScenarioPatch(input: {
  scenarioId: string;
  code: string;
  durationSeconds: number;
  pasted: boolean;
  tabSwitches: number;
  keystrokes: number;
}) {
  const scenario = debugArenaScenarios.find((entry) => entry.id === input.scenarioId);

  if (!scenario) {
    throw new Error("Scenario not found.");
  }

  const tests = scenario.tests.map((test) => ({
    name: test.name,
    description: test.description,
    passed: test.check(input.code)
  }));

  const passedCount = tests.filter((test) => test.passed).length;
  const passed = passedCount === tests.length;
  const testScore = (passedCount / tests.length) * 60;
  const speedBonus = Math.max(0, 20 - Math.max(input.durationSeconds - 45, 0) * 0.3);
  const disciplineBonus = Math.max(0, 12 - input.tabSwitches * 4 - (input.pasted ? 8 : 0));
  const effortBonus = Math.min(input.keystrokes / 18, 8);
  const overall = clampScore(testScore + speedBonus + disciplineBonus + effortBonus);

  const scores = {
    correctness: clampScore((passedCount / tests.length) * 100),
    speed: clampScore(speedBonus * 5),
    discipline: clampScore(disciplineBonus * 8),
    resilience: clampScore(40 + effortBonus * 7.5),
    overall
  };

  return {
    scenario,
    tests,
    scores,
    passed,
    summary: passed
      ? "Patch accepted. The containment logic survived the test suite."
      : "Patch rejected. Critical regression signals remain in the code path."
  };
}

export async function evaluateSoloSubmission(input: {
  userId: string;
  scenarioId: string;
  code: string;
  durationSeconds: number;
  pasted: boolean;
  tabSwitches: number;
  keystrokes: number;
}) {
  const evaluated = evaluateScenarioPatch(input);

  const attempt = {
    id: randomUUID(),
    userId: input.userId,
    scenarioId: evaluated.scenario.id,
    submittedAt: new Date().toISOString(),
    durationSeconds: input.durationSeconds,
    pasted: input.pasted,
    tabSwitches: input.tabSwitches,
    keystrokes: input.keystrokes,
    passed: evaluated.passed,
    score: evaluated.scores.overall
  };

  await appendAttempt(attempt);

  return {
    scenario: {
      id: evaluated.scenario.id,
      title: evaluated.scenario.title,
      difficulty: evaluated.scenario.difficulty
    },
    attempt,
    tests: evaluated.tests,
    scores: evaluated.scores,
    summary: evaluated.summary
  };
}

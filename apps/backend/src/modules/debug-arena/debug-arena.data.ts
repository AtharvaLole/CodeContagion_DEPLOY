import type { DebugArenaScenario, DebugArenaScenarioDraft } from "./debug-arena.types.js";
import { cppScenarios } from "./scenarios/cpp-scenarios.js";
import { pythonScenarios } from "./scenarios/python-scenarios.js";
import { typescriptScenarios } from "./scenarios/typescript-scenarios.js";

const variantNarratives = [
  "A late-night regression report reproduced the same bug under a different production incident.",
  "A partner team mirrored the issue in a parallel service and escalated it with a fresh stack snapshot.",
  "A noisy release candidate exposed the same failure pattern through a separate customer workflow.",
  "An internal sandbox replay surfaced the bug again with slightly different telemetry and urgency.",
  "A resilience drill triggered the identical weakness in a neighboring code path.",
  "A postmortem replay reconstructed the same bug family from archived incident data."
];

function commentPrefix(language: DebugArenaScenario["language"]) {
  return language === "python" ? "#" : "//";
}

function shiftStackTraceNumbers(trace: string, offset: number) {
  return trace.replace(/:(\d+)/g, (_match, lineNumber: string) => `:${Number(lineNumber) + offset}`);
}

function materializeScenarioPool(baseScenarios: DebugArenaScenarioDraft[]) {
  return baseScenarios.flatMap((scenario) => {
    const canonical: DebugArenaScenario = {
      ...scenario,
      topicId: scenario.id,
      topicLabel: scenario.title,
      variantLabel: "Core"
    };

    const variants: DebugArenaScenario[] = variantNarratives.map((narrative, index) => ({
      ...scenario,
      id: `${scenario.id}-variant-${index + 1}`,
      topicId: scenario.id,
      topicLabel: scenario.title,
      variantLabel: `Variant ${index + 1}`,
      title: `${scenario.title} // Variant ${index + 1}`,
      description: `${narrative} ${scenario.description}`,
      stackTrace: shiftStackTraceNumbers(scenario.stackTrace, index + 1),
      buggyCode: `${commentPrefix(scenario.language)} ${scenario.title} variant ${index + 1}\n${scenario.buggyCode}`
    }));

    return [canonical, ...variants];
  });
}

export const debugArenaScenarios: DebugArenaScenario[] = [
  ...materializeScenarioPool(typescriptScenarios),
  ...materializeScenarioPool(pythonScenarios),
  ...materializeScenarioPool(cppScenarios)
];

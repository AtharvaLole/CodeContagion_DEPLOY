export type ScenarioDifficulty = "EASY" | "MEDIUM" | "HARD" | "EXTREME";

export type DebugArenaScenario = {
  id: string;
  topicId: string;
  topicLabel: string;
  variantLabel?: string;
  title: string;
  language: "typescript" | "python" | "cpp";
  difficulty: ScenarioDifficulty;
  description: string;
  stackTrace: string;
  buggyCode: string;
  hint: string;
  expectedSignals: string[];
  tests: Array<{
    name: string;
    description: string;
    check: (code: string) => boolean;
  }>;
};

export type DebugArenaScenarioDraft = Omit<
  DebugArenaScenario,
  "topicId" | "topicLabel" | "variantLabel"
>;

export type DebugArenaAttempt = {
  id: string;
  userId: string;
  scenarioId: string;
  submittedAt: string;
  durationSeconds: number;
  pasted: boolean;
  tabSwitches: number;
  keystrokes: number;
  passed: boolean;
  score: number;
};

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

// --- AI-Generated Scenario Types ---

/** Request body for POST /ai/debug-arena/generate */
export interface AiScenarioGenerateRequest {
  language: "typescript" | "python" | "cpp";
  difficulty: ScenarioDifficulty;
  errorTypes: string[];        // from predefined list, can be empty
  description?: string;         // optional free-form, max 500 chars
}

/** Response from the AI generation endpoint (superset of sanitized SoloScenario) */
export interface AiGeneratedScenario {
  id: string;                   // generated UUID
  title: string;
  language: "typescript" | "python" | "cpp";
  difficulty: ScenarioDifficulty;
  description: string;          // scenario description (what's wrong)
  stackTrace: string;           // fake but realistic stack trace
  buggyCode: string;            // the code with intentional bug(s)
  hint: string;                 // hint for the player
  evaluationCriteria: string;   // detailed criteria for AI judge (hidden from player)
  expectedFix: string;          // description of expected fix (hidden from player)
}

/** Request body for POST /ai/debug-arena/judge */
export interface AiJudgeRequest {
  buggyCode: string;
  userCode: string;
  evaluationCriteria: string;
  expectedFix: string;
  language: "typescript" | "python" | "cpp";
  difficulty: ScenarioDifficulty;
  durationSeconds: number;
  keystrokes: number;
  tabSwitches: number;
  pasted: boolean;
}

/** Response from the AI judge endpoint — matches SoloSubmissionResult shape */
export interface AiJudgeResult {
  correct: boolean;
  score: number;                // 0-100
  feedback: string;             // AI-generated feedback on the fix
  correctnessScore: number;     // 0-60 (matches existing weight)
  speedBonus: number;           // 0-15
  disciplineBonus: number;      // 0-15
  effortBonus: number;          // 0-10
}

type EchoTraceQueueType = "casual" | "ranked";
type EchoTraceMode = "ai" | "duo";
type EchoTraceRole = "developer" | "saboteur";
type EchoTraceWinner = "user" | "ai" | "developer" | "saboteur";

export type EchoTraceSubmissionInput = {
  scenarioId: string;
  queueType: EchoTraceQueueType;
  mode: EchoTraceMode;
  userRole: EchoTraceRole;
  winner: EchoTraceWinner;
  developerPassed: boolean;
  durationSeconds: number;
  sabotageScore: number;
  developerScore: number;
  sabotageActions: string[];
  graphFindings: string[];
  repairFindings: string[];
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function pickVariant(seed: number, variants: string[]) {
  return variants[Math.abs(seed) % variants.length];
}

function getPerspectiveWinner(input: EchoTraceSubmissionInput) {
  if (input.mode === "ai") {
    return input.winner === "user" ? "user" : "ai";
  }

  return input.developerPassed ? "developer" : "saboteur";
}

function getPerspectiveUserWon(input: EchoTraceSubmissionInput) {
  if (input.mode === "ai") {
    return input.winner === "user";
  }

  const roundWinner = getPerspectiveWinner(input);
  return roundWinner === input.userRole;
}

function buildHeadline(input: EchoTraceSubmissionInput, userWon: boolean) {
  const seed =
    input.durationSeconds +
    input.developerScore * 3 +
    input.sabotageScore * 5 +
    input.graphFindings.length * 7 +
    input.repairFindings.length * 11;

  if (input.mode === "ai") {
    if (input.userRole === "developer") {
      return userWon
        ? pickVariant(seed, [
            "You outpatched the AI saboteur and restored the secure flow.",
            "Your recovery patch beat the AI incident before deployment.",
            "You contained the AI sabotage and reestablished the trust chain."
          ])
        : pickVariant(seed, [
            "The AI saboteur kept the exploit alive.",
            "The AI attacker preserved a business-logic gap through deployment.",
            "Your patch missed the last exploit path and the AI took the round."
          ]);
    }

    return userWon
      ? pickVariant(seed, [
          "Your sabotage outmaneuvered the AI defender.",
          "The AI responder never fully recovered the compromised route.",
          "Your visual exploit path survived the AI recovery pass."
        ])
      : pickVariant(seed, [
          "The AI defender restored the pipeline before the exploit landed.",
          "The AI responder rebuilt the trust chain in time.",
          "Your sabotage was detected and the AI secured the deployment."
        ]);
  }

  return input.developerPassed
    ? pickVariant(seed, [
        "The developer restored the secure execution path.",
        "The developer rebuilt the trust chain before release.",
        "The developer patched the incident and closed the exploit route."
      ])
    : pickVariant(seed, [
        "The saboteur kept the exploit path alive through deployment.",
        "The saboteur's route corruption survived the repair phase.",
        "The exploit path remained active when the round closed."
      ]);
}

function buildOutcomeLabel(input: EchoTraceSubmissionInput) {
  const winner = getPerspectiveWinner(input);

  if (winner === "user" || winner === "ai") {
    return winner.toUpperCase();
  }

  return winner === "developer" ? "DEVELOPER" : "SABOTEUR";
}

export function summarizeEchoTraceSubmission(input: EchoTraceSubmissionInput) {
  const userWon = getPerspectiveUserWon(input);
  const userScore = clampScore(
    input.userRole === "developer" ? input.developerScore : input.sabotageScore
  );
  const opponentScore = clampScore(
    input.userRole === "developer" ? input.sabotageScore : input.developerScore
  );
  const pressureBonus = clampScore(
    Math.max(0, 18 - Math.floor(input.durationSeconds / 12)) +
      Math.min(16, input.sabotageActions.length * 4) +
      Math.min(12, input.graphFindings.length * 3) +
      Math.min(12, input.repairFindings.length * 3)
  );
  const overallScore = clampScore(Math.round((userScore * 0.72) + (pressureBonus * 0.28)));

  return {
    userWon,
    overallScore,
    userScore,
    opponentScore,
    winnerLabel: buildOutcomeLabel(input),
    headline: buildHeadline(input, userWon),
    winner: getPerspectiveWinner(input),
    scorecard: {
      execution: userScore,
      pressure: pressureBonus,
      resilience: clampScore(100 - input.durationSeconds / 2),
      security: clampScore(
        input.developerPassed ? input.developerScore : input.sabotageScore
      )
    }
  };
}

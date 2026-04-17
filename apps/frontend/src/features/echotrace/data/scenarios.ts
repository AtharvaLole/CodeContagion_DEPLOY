import questionBank from "./question-bank.json";
import type { EchoTraceScenario, SabotageAction } from "../echotrace-types";

type QuestionBankEntry = Omit<
  EchoTraceScenario,
  | "id"
  | "primaryObjective"
  | "saboteurGoal"
  | "developerGoal"
  | "aiSabotagePlan"
  | "issueType"
> & {
  slug: string;
};

const issueProfiles: Array<{
  id: EchoTraceScenario["issueType"];
  label: string;
  summaryAddon: string;
  primaryObjective: string;
  developerGoal: string;
  saboteurGoal: string;
  aiSabotagePlan: SabotageAction[];
}> = [
  {
    id: "db-before-auth",
    label: "Route Order Breach",
    summaryAddon: "The protected route is appearing before the identity checkpoint in the active runtime.",
    primaryObjective: "Move the protected route back behind authentication without rewriting unrelated logic.",
    developerGoal: "Find the wrong order and place authentication back before the protected route.",
    saboteurGoal: "Push the protected route ahead of authentication so the system trusts data too early.",
    aiSabotagePlan: ["reroute-to-database"]
  },
  {
    id: "bypass-before-auth",
    label: "Bypass Injection",
    summaryAddon: "A shortcut node is now carrying traffic around the login step.",
    primaryObjective: "Remove the bypass path and restore the normal trust chain.",
    developerGoal: "Delete the bypass path and make sure login is back on the active route.",
    saboteurGoal: "Insert a shortcut that lets traffic skip login and hit the protected route early.",
    aiSabotagePlan: ["insert-bypass"]
  },
  {
    id: "drop-after-auth",
    label: "Traffic Drop Incident",
    summaryAddon: "The active flow authenticates correctly, but requests are being dropped before they reach the protected route.",
    primaryObjective: "Restore continuity after authentication and keep the route safe.",
    developerGoal: "Remove the traffic drop block and keep the route behind authentication.",
    saboteurGoal: "Break continuity after login so requests die before they reach the real destination.",
    aiSabotagePlan: ["drop-after-auth"]
  },
  {
    id: "auth-disconnected",
    label: "Missing Auth Lane",
    summaryAddon: "The main path is reaching the protected route while the auth step sits disconnected on the side.",
    primaryObjective: "Reconnect authentication into the main lane before the protected route is reachable.",
    developerGoal: "Reconnect the login step into the active path before any protected route access.",
    saboteurGoal: "Leave authentication off the live path so the protected route becomes reachable without it.",
    aiSabotagePlan: ["reroute-to-database", "drop-after-auth"]
  },
  {
    id: "middleware-skipped",
    label: "Validation Layer Missing",
    summaryAddon: "Traffic is skipping the shared validation layer that should shape requests before auth.",
    primaryObjective: "Put middleware back into the main path before auth and data access.",
    developerGoal: "Reconnect the validation layer so the full path reads entry -> middleware -> auth -> route.",
    saboteurGoal: "Skip the validation layer so requests go straight into privileged logic.",
    aiSabotagePlan: ["insert-bypass", "drop-after-auth"]
  },
  {
    id: "entry-shortcut",
    label: "Public Shortcut Exposure",
    summaryAddon: "A direct shortcut from public entry reaches the protected route too early.",
    primaryObjective: "Remove any public shortcut and restore the long-form safe path.",
    developerGoal: "Break the direct shortcut and route traffic through the proper trust steps.",
    saboteurGoal: "Create a public shortcut so the protected route is too easy to reach.",
    aiSabotagePlan: ["insert-bypass", "reroute-to-database"]
  },
  {
    id: "auth-after-drop",
    label: "Auth Behind Failure Point",
    summaryAddon: "The login step now sits behind a failure block, so good requests never safely complete the full path.",
    primaryObjective: "Move the failure point out and place auth before the protected route again.",
    developerGoal: "Clear the failing block and restore a clean middleware -> auth -> route chain.",
    saboteurGoal: "Put a failure block before auth so the path becomes both unstable and confusing.",
    aiSabotagePlan: ["drop-after-auth", "reroute-to-database"]
  },
  {
    id: "bypass-drop-chain",
    label: "Compound Sabotage Chain",
    summaryAddon: "The active path combines a bypass with a request drop, creating both unsafe access and broken continuity.",
    primaryObjective: "Remove both sabotage blocks and return to the original safe chain.",
    developerGoal: "Clean out both sabotage blocks and rebuild the original safe order.",
    saboteurGoal: "Stack multiple bad blocks so the responder has to untangle a deeper incident.",
    aiSabotagePlan: ["insert-bypass", "drop-after-auth"]
  }
];

export const echoTraceScenarios: EchoTraceScenario[] = (questionBank as QuestionBankEntry[]).flatMap(
  (question) =>
    issueProfiles.map((issue) => ({
      ...question,
      id: `${question.slug}-${issue.id}`,
      title: `${question.title} // ${issue.label}`,
      summary: `${question.summary} ${issue.summaryAddon}`,
      primaryObjective: question.repairTarget || issue.primaryObjective,
      saboteurGoal: issue.saboteurGoal,
      developerGoal: issue.developerGoal,
      aiSabotagePlan: issue.aiSabotagePlan,
      issueType: issue.id
    }))
);

export type NodeStatus = "susceptible" | "infected" | "recovered" | "flagged";

export type SimNode = {
  id: number;
  label: string;
  followers: number;
  credibility: number;
  status: NodeStatus;
  x: number;
  y: number;
  contentId?: string;
  resolvedByAction?: "fact-check" | "quarantine";
  resolvedByUserId?: string;
  resolvedByUserHandle?: string;
};

export type SimEdge = {
  source: number;
  target: number;
};

export type MisinfoContent = {
  id: string;
  title: string;
  headline: string;
  content: string;
  source: string;
  sourceType: string;
  category: string;
  credibilityScore: number;
  riskLevel: string;
  clues: string[];
  reasoningSummary: string;
  imagePrompt?: string;
  difficulty: string;
  internalLabel: "real" | "fake";
  isReal: boolean;
  evidence: string;
  manipulationSignals: string[];
  artifactHint: string;
};

export type SoloSimulationState = {
  sessionId: string;
  createdAt: string;
  timeLeft: number;
  actionPoints: number;
  maxActionPoints: number;
  tick: number;
  panicLevel: number;
  panicPenalty: number;
  chatbotQuestionsUsed: number;
  chatbotQuestionLimit: number;
  nodes: SimNode[];
  edges: SimEdge[];
  log: Array<{
    type: "system" | "action" | "intel";
    message: string;
    time: string;
  }>;
};

export type MisinfoReviewItem = {
  nodeId: number;
  nodeLabel: string;
  headline: string;
  title: string;
  content: string;
  source: string;
  sourceType: string;
  category: string;
  credibilityScore: number;
  riskLevel: string;
  actualType: "fake" | "real";
  selectedAction: "none" | "investigate" | "fact-check" | "quarantine";
  selectedByUserId?: string;
  selectedByHandle?: string;
  finalStatus: NodeStatus;
  wasCorrect: boolean;
  explanation: string;
  evidence: string;
  clues: string[];
  manipulationSignals: string[];
  reasoningSummary: string;
};

export type MisinfoSimulationResult = {
  score: number;
  panicLevel: number;
  contained: boolean;
  recovered: number;
  infected: number;
  falsePositiveActions: number;
  chatbotQuestionsUsed: number;
  chatbotQuestionLimit: number;
  summary: string;
  reviewItems: MisinfoReviewItem[];
};

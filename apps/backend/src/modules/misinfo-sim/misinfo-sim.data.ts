import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MisinfoContent, SimEdge, SimNode } from "./misinfo-sim.types.js";

const labels = [
  "NewsBot_42",
  "TruthSeeker",
  "ViralVince",
  "FactCheck_AI",
  "DataDiva",
  "InfoWars_X",
  "MediaWatch",
  "ClickBait99",
  "DeepFake_Dan",
  "RealNews_Hub",
  "Echo_Chamber",
  "BotNetwork",
  "Verified_Sue",
  "Troll_Farm_7",
  "CryptoGuru",
  "PolitiCheck",
  "Meme_Lord",
  "Conspiracy_K",
  "SignalSurge",
  "ShadowLedger",
  "PulsePatrol",
  "CivicRadar",
  "EchoBloom",
  "NarrativeNexus",
  "TrustAnchor",
  "HyperFeed",
  "MythMachine",
  "FactWave",
  "ChannelZero",
  "SirenThread"
];

type RawNewsScenario = {
  id: string;
  title: string;
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
};

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(moduleDirectory, "../../../../../data");
const datasetFiles = [
  { prefix: "solo", path: path.join(dataDirectory, "misinfo-solo-sessions.json") },
  { prefix: "multi", path: path.join(dataDirectory, "misinfo-multiplayer-rooms.json") }
] as const;

let datasetCache: MisinfoContent[] | null = null;

function shuffle<T>(items: T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function pickNodeCount() {
  return 22 + Math.floor(Math.random() * 5);
}

function normalizeScenario(entry: RawNewsScenario, idPrefix: string): MisinfoContent {
  return {
    id: `${idPrefix}-${entry.id}`,
    title: entry.title,
    headline: entry.title,
    content: entry.content,
    source: entry.source,
    sourceType: entry.sourceType,
    category: entry.category,
    credibilityScore: entry.credibilityScore,
    riskLevel: entry.riskLevel,
    clues: entry.clues,
    reasoningSummary: entry.reasoningSummary,
    imagePrompt: entry.imagePrompt,
    difficulty: entry.difficulty,
    internalLabel: entry.internalLabel,
    isReal: entry.internalLabel === "real",
    evidence: entry.reasoningSummary,
    manipulationSignals: entry.clues,
    artifactHint: `Source type ${entry.sourceType}. Credibility ${entry.credibilityScore}. Risk ${entry.riskLevel}.`
  };
}

function readDatasetFile(filePath: string, prefix: string) {
  const raw = readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as RawNewsScenario[];
  return parsed
    .filter(
      (entry) =>
        entry &&
        typeof entry.id === "string" &&
        typeof entry.title === "string" &&
        typeof entry.content === "string" &&
        (entry.internalLabel === "real" || entry.internalLabel === "fake")
    )
    .map((entry) => normalizeScenario(entry, prefix));
}

export function getMisinfoContentLibrary() {
  if (datasetCache) {
    return datasetCache;
  }

  const merged = datasetFiles.flatMap((file) => readDatasetFile(file.path, file.prefix));
  const deduped = new Map<string, MisinfoContent>();

  for (const item of merged) {
    const key = `${item.title.toLowerCase()}::${item.source.toLowerCase()}`;
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }

  datasetCache = Array.from(deduped.values());
  return datasetCache;
}

function takeFromPool<T>(pool: T[], count: number) {
  const shuffled = shuffle(pool);
  const picked: T[] = [];

  for (let index = 0; index < count; index += 1) {
    picked.push(shuffled[index % shuffled.length]);
  }

  return picked;
}

function createWeightedContentPool(nodeCount: number) {
  const library = getMisinfoContentLibrary();
  const fakePool = library.filter((item) => !item.isReal);
  const realPool = library.filter((item) => item.isReal);

  if (fakePool.length === 0 || realPool.length === 0) {
    throw new Error("Misinfo dataset must contain both fake and real news entries.");
  }

  const fakeCount = Math.max(5, Math.round(nodeCount * 0.3));
  const realCount = Math.max(1, nodeCount - fakeCount);

  return {
    fake: takeFromPool(fakePool, fakeCount),
    real: takeFromPool(realPool, realCount)
  };
}

export function findMisinfoContentById(contentId?: string) {
  if (!contentId) {
    return null;
  }

  return getMisinfoContentLibrary().find((content) => content.id === contentId) ?? null;
}

export function createInitialNetwork() {
  const nodes: SimNode[] = [];
  const edges: SimEdge[] = [];
  const nodeCount = pickNodeCount();
  const availableLabels = shuffle(labels);
  const contentPool = createWeightedContentPool(nodeCount);
  const fakeNodes = shuffle(
    contentPool.fake.map((content, index) => ({
      index,
      content
    }))
  );
  const infectedTarget = Math.max(4, Math.min(fakeNodes.length, Math.ceil(fakeNodes.length * 0.6)));
  const infectedFakeIndexes = new Set(fakeNodes.slice(0, infectedTarget).map((entry) => entry.index));
  const assignedContent = shuffle([
    ...contentPool.fake.map((content, index) => ({
      content,
      infected: infectedFakeIndexes.has(index)
    })),
    ...contentPool.real.map((content) => ({
      content,
      infected: false
    }))
  ]);

  for (let index = 0; index < nodeCount; index += 1) {
    const angle = (index / nodeCount) * Math.PI * 2;
    const radius = 180 + (index % 4) * 30 + Math.random() * 20;
    const assignment = assignedContent[index % assignedContent.length];
    const content = assignment.content;

    nodes.push({
      id: index,
      label: availableLabels[index] ?? `Node_${index}`,
      followers: 900 + index * 340 + Math.floor(Math.random() * 500),
      credibility:
        content.isReal
          ? Math.max(55, Math.min(98, content.credibilityScore + Math.floor(Math.random() * 8 - 4)))
          : Math.max(18, Math.min(72, content.credibilityScore - 18 + Math.floor(Math.random() * 10 - 5))),
      status: assignment.infected ? "infected" : "susceptible",
      x: 400 + Math.cos(angle) * radius + Math.floor(Math.random() * 34 - 17),
      y: 310 + Math.sin(angle) * radius + Math.floor(Math.random() * 34 - 17),
      contentId: content.id
    });
  }

  for (let index = 0; index < nodes.length; index += 1) {
    const next = (index + 1) % nodes.length;
    const skip = (index + 4) % nodes.length;
    const longJump = (index + 7 + (index % 3)) % nodes.length;
    edges.push({ source: index, target: next });
    edges.push({ source: index, target: skip });
    if (index % 2 === 0 || Math.random() > 0.62) {
      edges.push({ source: index, target: longJump });
    }
    if (index % 3 === 0) {
      edges.push({ source: index, target: (index + 10) % nodes.length });
    }
  }

  return { nodes, edges };
}

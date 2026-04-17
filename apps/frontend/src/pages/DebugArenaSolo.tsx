import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Editor from "@monaco-editor/react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Code2,
  Download,
  Play,
  RotateCcw,
  ShieldAlert,
  Skull,
  Terminal,
  TimerReset,
  Sparkles,
  XCircle,
  Crosshair,
  Shield,
  Trophy,
  Zap,
  Settings,
  ListChecks,
} from "lucide-react";
import CyberNavbar from "@/components/CyberNavbar";
import ArenaTimer from "@/components/ArenaTimer";
import GlassPanel from "@/components/GlassPanel";
import { MissionConfigModal } from "@/components/MissionConfigModal";
import { appRoutes } from "@/app/routes";
import { useAuth } from "@/features/auth/auth-context";
import {
  fetchSoloScenarios,
  submitSoloScenario,
  type SoloScenario,
  type SoloSubmissionResult,
} from "@/features/debug-arena/debug-arena-api";
import {
  fetchPyDebugCoachReport,
  fetchPyDebugDebriefReport,
  fetchHecklerTaunt,
  submitAiJudge,
  type DebugCoachReport,
  type DebugDebriefReport,
  type AiGeneratedScenarioResponse,
  type AiJudgeResponse,
} from "@/features/ai/ai-api";

/* ── Constants ─────────────────────────────────────────────────────── */

const TOTAL_TIME = 90;
const AI_SCENARIO_STORAGE_KEY = "cc:ai-scenario";

const hecklerFallbackMessages = [
  "That patch looked confident. Confidence is not a substitute for correctness.",
  "The timer is moving faster than your fix quality.",
  "Interesting. You just rewired production with vibes.",
  "Contain the bug. Preferably before it reproduces again.",
  "Every keystroke is evidence.",
  "You are not losing. You are generating telemetry.",
  "Keep moving. The stack trace is not going to debug itself.",
];

const howToPlaySteps = [
  {
    title: "1. Pick a scenario",
    description:
      "Choose a language and difficulty, then read the bug title, description, stack trace, and mission hint before you start the timer.",
  },
  {
    title: "2. Understand the failure",
    description:
      "Use the stack trace to locate the broken behavior. The description tells you what users are experiencing. The hint narrows the exact kind of fix expected.",
  },
  {
    title: "3. Patch only the risky code",
    description:
      "Edit the buggy snippet directly. Avoid random rewrites. Clean, targeted fixes usually score better than large speculative changes.",
  },
  {
    title: "4. Submit and review",
    description:
      "Submit before time runs out, then review failed tests, score breakdown, and AI debrief to understand what worked and what to improve next.",
  },
];

const sampleWalkthrough = [
  "Example: if a JWT `exp` field is in seconds but the code compares it to `Date.now()` in milliseconds, valid tokens may be rejected or expired tokens may pass incorrectly.",
  "What to notice: the stack trace points at token verification, and the hint mentions a unit mismatch.",
  "What to do: convert the current time to seconds first, then keep the same expiry comparison logic.",
  "What not to do: rewrite the full auth flow, rename unrelated variables, or remove the error path completely.",
];

/* ── Types ─────────────────────────────────────────────────────────── */

type SoloPhase = "lobby" | "countdown" | "playing" | "submitting" | "results";
type SoloQueueType = "casual" | "ranked";

/* ── Helpers ───────────────────────────────────────────────────────── */

function difficultyClass(difficulty: SoloScenario["difficulty"]) {
  switch (difficulty) {
    case "EASY":
      return "text-neon-green";
    case "MEDIUM":
      return "text-neon-yellow";
    case "HARD":
      return "text-primary";
    case "EXTREME":
      return "text-accent";
    default:
      return "text-foreground";
  }
}

const difficultyOrder: Record<string, number> = { EASY: 1, MEDIUM: 2, HARD: 3, EXTREME: 4 };

function getEditorLanguage(language: SoloScenario["language"]) {
  switch (language) {
    case "python":
      return "python";
    case "cpp":
      return "cpp";
    case "typescript":
    default:
      return "typescript";
  }
}

function drawResultCard(result: SoloSubmissionResult) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas rendering is not available.");
  }

  context.fillStyle = "#060b18";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "rgba(48,201,232,0.22)");
  gradient.addColorStop(1, "rgba(232,48,140,0.16)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "#30C9E8";
  context.lineWidth = 3;
  context.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

  context.fillStyle = "#30C9E8";
  context.font = "700 58px Orbitron, sans-serif";
  context.fillText("CODECONTAGION // DEBUG ARENA", 70, 110);

  context.fillStyle = "#F8FAFC";
  context.font = "700 46px Orbitron, sans-serif";
  context.fillText(result.scenario.title, 70, 190);

  context.fillStyle = result.attempt.passed ? "#30E849" : "#E8308C";
  context.font = "700 34px JetBrains Mono, monospace";
  context.fillText(result.attempt.passed ? "PATCH ACCEPTED" : "PATCH REJECTED", 70, 250);

  context.fillStyle = "#CBD5E1";
  context.font = "500 24px JetBrains Mono, monospace";
  context.fillText(`Overall score: ${result.scores.overall}`, 70, 315);
  context.fillText(`Correctness: ${result.scores.correctness}`, 70, 360);
  context.fillText(`Speed: ${result.scores.speed}`, 70, 400);
  context.fillText(`Discipline: ${result.scores.discipline}`, 70, 440);
  context.fillText(`Resilience: ${result.scores.resilience}`, 70, 480);
  context.fillText(`Duration: ${result.attempt.durationSeconds}s`, 70, 520);

  context.fillStyle = "#94A3B8";
  context.font = "500 20px JetBrains Mono, monospace";
  context.fillText(result.summary, 70, 580);

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `codecontagion-${result.scenario.id}-result.png`;
  link.click();
}

/* ── SessionStorage helpers ────────────────────────────────────────── */

function saveAiScenarioToStorage(data: AiGeneratedScenarioResponse) {
  try {
    sessionStorage.setItem(AI_SCENARIO_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota exceeded — ignore */
  }
}

function loadAiScenarioFromStorage(): AiGeneratedScenarioResponse | null {
  try {
    const raw = sessionStorage.getItem(AI_SCENARIO_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AiGeneratedScenarioResponse) : null;
  } catch {
    return null;
  }
}

function clearAiScenarioStorage() {
  try {
    sessionStorage.removeItem(AI_SCENARIO_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/* ── Main Component ────────────────────────────────────────────────── */

const DebugArenaSolo = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<SoloPhase>("lobby");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("random");
  const [queueType, setQueueType] = useState<SoloQueueType>("casual");
  const [code, setCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [countdown, setCountdown] = useState(3);
  const [keystrokes, setKeystrokes] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [pasted, setPasted] = useState(false);
  const [hecklerFeed, setHecklerFeed] = useState<string[]>([]);
  const [result, setResult] = useState<SoloSubmissionResult | null>(null);
  const [coachReport, setCoachReport] = useState<DebugCoachReport | null>(null);
  const [debriefReport, setDebriefReport] = useState<DebugDebriefReport | null>(null);
  const [editorShake, setEditorShake] = useState(false);
  const [filterLanguage, setFilterLanguage] = useState("All");
  const [filterDifficulty, setFilterDifficulty] = useState("All");

  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [aiGeneratedScenarioContext, setAiGeneratedScenarioContext] =
    useState<AiGeneratedScenarioResponse | null>(null);
  const [aiJudgeResult, setAiJudgeResult] = useState<AiJudgeResponse | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const hecklerIndexRef = useRef(0);
  const effectiveDifficultyFilter = queueType === "ranked" ? "All" : filterDifficulty;

  /* ── Restore AI scenario from sessionStorage on mount ──────────── */

  useEffect(() => {
    const stored = loadAiScenarioFromStorage();
    if (stored) {
      setIsAiGenerated(true);
      setAiGeneratedScenarioContext(stored);
      setCode(stored.scenario.buggyCode);
    }
  }, []);

  /* ── Persist AI scenario to sessionStorage on change ───────────── */

  useEffect(() => {
    if (isAiGenerated && aiGeneratedScenarioContext) {
      saveAiScenarioToStorage(aiGeneratedScenarioContext);
    }
  }, [isAiGenerated, aiGeneratedScenarioContext]);

  /* ── Queries ─────────────────────────────────────────────────────── */

  const { data, isLoading } = useQuery({
    queryKey: ["debug-arena-scenarios", filterLanguage, effectiveDifficultyFilter],
    queryFn: () =>
      fetchSoloScenarios(token!, {
        language: filterLanguage,
        difficulty: effectiveDifficultyFilter,
      }),
    enabled: Boolean(token),
  });

  const scenarios = useMemo(() => {
    if (!data?.scenarios) return [];
    return [...data.scenarios].sort(
      (a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
    );
  }, [data?.scenarios]);

  const topicOptions = useMemo(
    () =>
      scenarios.reduce<Array<{ id: string; label: string }>>((topics, scenario) => {
        if (!topics.some((entry) => entry.id === scenario.topicId)) {
          topics.push({ id: scenario.topicId, label: scenario.topicLabel });
        }
        return topics;
      }, []),
    [scenarios]
  );

  const topicScenarios = useMemo(() => {
    if (selectedTopicId === "random") {
      return scenarios;
    }
    return scenarios.filter((scenario) => scenario.topicId === selectedTopicId);
  }, [scenarios, selectedTopicId]);

  const selectedScenario = useMemo(() => {
    if (isAiGenerated && aiGeneratedScenarioContext) {
      return {
        ...aiGeneratedScenarioContext.scenario,
        topicId: "ai-generated",
        topicLabel: "Custom AI Scenario",
      } as SoloScenario;
    }

    if (selectedScenarioId) {
      const exactMatch = scenarios.find((scenario) => scenario.id === selectedScenarioId);
      if (exactMatch) {
        return exactMatch;
      }
    }

    return topicScenarios[0] ?? scenarios[0] ?? null;
  }, [scenarios, selectedScenarioId, topicScenarios, isAiGenerated, aiGeneratedScenarioContext]);

  /* ── Effects ─────────────────────────────────────────────────────── */

  useEffect(() => {
    if (queueType === "ranked") {
      setSelectedTopicId("random");
      setFilterDifficulty("All");
    }
  }, [queueType]);

  useEffect(() => {
    if (topicOptions.length === 0) return;
    if (queueType === "ranked") {
      if (selectedTopicId !== "random") setSelectedTopicId("random");
      return;
    }
    if (selectedTopicId === "random") return;
    if (!topicOptions.some((topic) => topic.id === selectedTopicId)) {
      setSelectedTopicId(topicOptions[0].id);
    }
  }, [queueType, selectedTopicId, topicOptions]);

  useEffect(() => {
    if (!selectedScenario && scenarios.length > 0) {
      setSelectedScenarioId(scenarios[0].id);
      setCode(scenarios[0].buggyCode);
    }
  }, [scenarios, selectedScenario]);

  useEffect(() => {
    if (phase !== "lobby") return;
    const previewScenario = topicScenarios[0] ?? scenarios[0] ?? null;
    if (!previewScenario) return;
    setSelectedScenarioId(previewScenario.id);
    setCode(previewScenario.buggyCode);
  }, [phase, scenarios, topicScenarios]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("playing");
      startTimeRef.current = Date.now();
      return;
    }
    const timeout = window.setTimeout(() => setCountdown((v) => v - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [countdown, phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    const interval = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing" || !selectedScenario || !token) return;
    let cancelled = false;
    const fetchTaunt = async () => {
      try {
        const result = await fetchHecklerTaunt(token, {
          scenarioId: selectedScenario.id,
          code,
          timeLeft,
          keystrokes,
          tabSwitches,
          pasted,
        });
        if (!cancelled && result?.taunt) {
          setHecklerFeed((current) => [...current.slice(-5), result.taunt]);
        }
      } catch {
        if (!cancelled) {
          const fallback =
            hecklerFallbackMessages[hecklerIndexRef.current % hecklerFallbackMessages.length];
          hecklerIndexRef.current += 1;
          setHecklerFeed((current) => [...current.slice(-5), fallback]);
        }
      }
    };
    const interval = window.setInterval(fetchTaunt, 12000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [phase, selectedScenario, token, code, timeLeft, keystrokes, tabSwitches, pasted]);

  useEffect(() => {
    if (phase !== "playing") return;
    const handleBlur = () => {
      setTabSwitches((current) => current + 1);
      setHecklerFeed((current) => [
        ...current.slice(-5),
        "Tab switch detected. Penalty recorded.",
      ]);
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [phase]);

  /* ── Mutations ───────────────────────────────────────────────────── */

  const submitMutation = useMutation({
    mutationFn: (payload: {
      scenarioId: string;
      code: string;
      durationSeconds: number;
      pasted: boolean;
      tabSwitches: number;
      keystrokes: number;
      queueType: SoloQueueType;
    }) => submitSoloScenario(token!, payload),
    onSuccess: (submissionResult) => {
      setResult(submissionResult);
      setPhase("results");
      clearAiScenarioStorage();
      void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const aiJudgeMutation = useMutation({
    mutationFn: (payload: Parameters<typeof submitAiJudge>[1]) =>
      submitAiJudge(token!, payload),
    onSuccess: (data) => {
      setAiJudgeResult(data);
      setPhase("results");
      clearAiScenarioStorage();
    },
  });

  const coachMutation = useMutation({
    mutationFn: (payload: { scenarioId: string; code: string }) =>
      fetchPyDebugCoachReport(token!, payload),
    onSuccess: (data) => {
      setCoachReport(data.report);
    },
  });

  const debriefMutation = useMutation({
    mutationFn: (payload: {
      scenarioId: string;
      code: string;
      passed: boolean;
      durationSeconds: number;
      pasted: boolean;
      tabSwitches: number;
      keystrokes: number;
      testResults: Array<{ name: string; description: string; passed: boolean }>;
      scores: Record<string, number>;
    }) => fetchPyDebugDebriefReport(token!, payload),
    onSuccess: (data) => {
      setDebriefReport(data.report);
    },
  });

  /* ── Actions ─────────────────────────────────────────────────────── */

  function resetForScenario(
    scenario: SoloScenario | null,
    aiIsGenerated = false,
    aiContext: AiGeneratedScenarioResponse | null = null
  ) {
    if (scenario) setSelectedScenarioId(scenario.id);
    if (scenario) setCode(scenario.buggyCode);
    if (aiIsGenerated && aiContext) {
      setCode(aiContext.scenario.buggyCode);
      setIsAiGenerated(true);
      setAiGeneratedScenarioContext(aiContext);
      setAiJudgeResult(null);
    } else {
      setIsAiGenerated(false);
      setAiGeneratedScenarioContext(null);
      setAiJudgeResult(null);
      clearAiScenarioStorage();
    }
    setTimeLeft(TOTAL_TIME);
    setCountdown(3);
    setKeystrokes(0);
    setTabSwitches(0);
    setPasted(false);
    setHecklerFeed([]);
    setResult(null);
    setCoachReport(null);
    setDebriefReport(null);
    startTimeRef.current = null;
    hecklerIndexRef.current = 0;
  }

  function startRound() {
    const pool =
      queueType === "ranked"
        ? scenarios
        : selectedTopicId === "random"
          ? scenarios
          : topicScenarios;

    const chosenScenario = pool[Math.floor(Math.random() * pool.length)] ?? selectedScenario;

    if (!chosenScenario) return;

    resetForScenario(chosenScenario);
    setPhase("countdown");
  }

  const handleSubmit = useCallback(async () => {
    if (!selectedScenario || submitMutation.isPending || aiJudgeMutation.isPending) return;

    setPhase("submitting");
    const durationSeconds = startTimeRef.current
      ? Math.min(TOTAL_TIME, Math.max(0, Math.round((Date.now() - startTimeRef.current) / 1000)))
      : TOTAL_TIME - timeLeft;

    if (isAiGenerated && aiGeneratedScenarioContext) {
      await aiJudgeMutation.mutateAsync({
        buggyCode: aiGeneratedScenarioContext.scenario.buggyCode,
        userCode: code,
        evaluationCriteria: aiGeneratedScenarioContext.evaluationCriteria,
        expectedFix: aiGeneratedScenarioContext.expectedFix,
        language: aiGeneratedScenarioContext.scenario.language,
        difficulty: aiGeneratedScenarioContext.scenario.difficulty,
        durationSeconds,
        keystrokes,
        tabSwitches,
        pasted,
      });
      return;
    }

    await submitMutation.mutateAsync({
      scenarioId: selectedScenario.id,
      code,
      durationSeconds,
      pasted,
      tabSwitches,
      keystrokes,
      queueType,
    });
  }, [
    code,
    keystrokes,
    pasted,
    queueType,
    selectedScenario,
    submitMutation,
    aiJudgeMutation,
    tabSwitches,
    timeLeft,
    isAiGenerated,
    aiGeneratedScenarioContext,
  ]);

  useEffect(() => {
    if (timeLeft === 0 && phase === "playing" && selectedScenario) {
      void handleSubmit();
    }
  }, [handleSubmit, phase, selectedScenario, timeLeft]);

  function handleEditorChange(value: string | undefined) {
    setCode(value ?? "");
    if (phase === "playing") {
      setKeystrokes((current) => current + 1);
    }
  }

  function handlePaste(event: React.ClipboardEvent) {
    if (phase !== "playing") return;
    event.preventDefault();
    setPasted(true);
    setEditorShake(true);
    window.setTimeout(() => setEditorShake(false), 350);
    setHecklerFeed((current) => [
      ...current.slice(-5),
      "Clipboard injection blocked. Manual patching only.",
    ]);
  }

  const isBusy = phase === "submitting" || submitMutation.isPending;
  const editorLanguage = selectedScenario ? getEditorLanguage(selectedScenario.language) : "typescript";
  const workspaceHeightClass = "xl:h-[calc(100vh-9rem)]";

  /* ── Chip helpers ────────────────────────────────────────────────── */

  const configChips = useMemo(() => {
    const chips: { label: string; colorClass: string; icon: React.ReactNode }[] = [];
    chips.push({
      label: queueType.toUpperCase(),
      colorClass:
        queueType === "ranked"
          ? "text-primary border-primary/30 bg-primary/10"
          : "text-neon-green border-neon-green/30 bg-neon-green/10",
      icon: queueType === "ranked" ? <Trophy className="w-3 h-3" /> : <Shield className="w-3 h-3" />,
    });
    if (filterLanguage !== "All") {
      chips.push({
        label: filterLanguage.toUpperCase(),
        colorClass: "text-primary border-primary/30 bg-primary/10",
        icon: <Code2 className="w-3 h-3" />,
      });
    }
    if (effectiveDifficultyFilter !== "All") {
      chips.push({
        label: effectiveDifficultyFilter,
        colorClass: "text-neon-yellow border-neon-yellow/30 bg-neon-yellow/10",
        icon: <Zap className="w-3 h-3" />,
      });
    }
    if (isAiGenerated) {
      chips.push({
        label: "AI GENERATED",
        colorClass: "text-accent border-accent/30 bg-accent/10",
        icon: <Sparkles className="w-3 h-3" />,
      });
    }
    return chips;
  }, [queueType, filterLanguage, effectiveDifficultyFilter, isAiGenerated]);

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <CyberNavbar />

      {/* Mission Config Modal */}
      <MissionConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        queueType={queueType}
        onQueueTypeChange={setQueueType}
        filterLanguage={filterLanguage}
        onFilterLanguageChange={setFilterLanguage}
        filterDifficulty={filterDifficulty}
        onFilterDifficultyChange={setFilterDifficulty}
        selectedTopicId={selectedTopicId}
        onSelectedTopicIdChange={setSelectedTopicId}
        topicOptions={topicOptions}
        onStartRound={startRound}
        isLoading={isLoading}
        onAiScenarioGenerated={(result) => {
          resetForScenario(null, true, result);
          setPhase("countdown");
        }}
      />

      <div className="pt-20 pb-12 px-4 max-w-7xl mx-auto">
        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-primary">// SOLO DEBUG ARENA</p>
            <h1 className="font-display text-4xl mt-2">
              PATCH THE <span className="text-primary text-glow-cyan">OUTBREAK</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground">ROUND STATE</p>
              <p className="font-display text-lg text-foreground">{phase.toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground">ELO</p>
              <p className="font-display text-lg text-primary">{user?.stats?.elo ?? 600}</p>
            </div>
            <Link
              to={appRoutes.debugArenaDuo}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 font-mono text-xs tracking-[0.18em] text-primary transition-colors hover:bg-primary/20"
            >
              <Play className="w-4 h-4" />
              DUO MODE
            </Link>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
              LOBBY PHASE — Redesigned
           ══════════════════════════════════════════════════════════════ */}

        {phase === "lobby" && (
          <div className="space-y-6">
            {/* ── Top Row: Config Summary + Actions ─────────────────── */}
            <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-start">
              <GlassPanel className="p-6 relative overflow-hidden">
                {/* Decorative corner accents */}
                <div className="absolute top-0 left-0 w-16 h-16 border-t border-l border-primary/20 rounded-tl-lg pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b border-r border-primary/10 rounded-br-lg pointer-events-none" />
                {/* Subtle grid overlay */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.015]"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(48,201,232,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(48,201,232,0.3) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />

                <div className="relative">
                  {/* Section header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 border border-primary/20">
                        <Crosshair className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-mono text-[10px] tracking-[0.24em] text-primary">MISSION BRIEFING</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Current threat configuration</p>
                      </div>
                    </div>

                    {/* Config chips */}
                    <div className="flex flex-wrap gap-2">
                      {configChips.map((chip) => (
                        <span
                          key={chip.label}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.12em] ${chip.colorClass}`}
                        >
                          {chip.icon}
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Decorative divider */}
                  <div className="h-[1px] bg-gradient-to-r from-primary/30 via-border/20 to-transparent mb-6" />

                  {/* Scenario preview */}
                  {selectedScenario ? (
                    <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
                      {/* Left — Info */}
                      <div className="space-y-4">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-block rounded-md border px-2.5 py-1 font-mono text-[10px] tracking-[0.15em] ${difficultyClass(
                              selectedScenario.difficulty
                            )} border-current/20 bg-current/5`}
                          >
                            {selectedScenario.difficulty}
                          </span>
                          <span className="inline-block rounded-md border border-border/30 bg-surface-1/40 px-2.5 py-1 font-mono text-[10px] tracking-[0.15em] text-muted-foreground">
                            {selectedScenario.language.toUpperCase()}
                          </span>
                          <span className="inline-block rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 font-mono text-[10px] tracking-[0.15em] text-primary">
                            {selectedScenario.topicLabel}
                          </span>
                        </div>

                        <h2 className="font-display text-2xl text-foreground leading-tight">
                          {selectedScenario.title}
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                          {selectedScenario.description}
                        </p>

                        {/* Hint */}
                        <div className="flex items-start gap-3 rounded-lg border border-neon-yellow/20 bg-neon-yellow/5 px-4 py-3">
                          <ShieldAlert className="w-4 h-4 text-neon-yellow mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground line-clamp-2">{selectedScenario.hint}</p>
                        </div>
                      </div>

                      {/* Right — Stack trace */}
                      <div className="rounded-xl border border-border/20 bg-surface-1/30 p-4 overflow-hidden">
                        <p className="font-mono text-[10px] tracking-[0.24em] text-accent mb-3">STACK TRACE</p>
                        <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono max-h-[140px] overflow-y-auto custom-scrollbar leading-relaxed">
                          {selectedScenario.stackTrace}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <p className="font-mono text-sm text-muted-foreground animate-pulse">Loading scenarios…</p>
                    </div>
                  )}

                  {/* Decorative divider */}
                  <div className="h-[1px] bg-gradient-to-r from-transparent via-border/20 to-primary/30 mt-6 mb-5" />

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setShowConfigModal(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-surface-1/40 px-5 py-3 font-mono text-xs tracking-[0.15em] text-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                    >
                      <Settings className="w-4 h-4" />
                      CONFIGURE MISSION
                    </button>
                    <button
                      onClick={startRound}
                      disabled={!selectedScenario}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-mono text-xs tracking-[0.2em] text-primary-foreground transition-all hover:brightness-110 glow-cyan disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play className="w-4 h-4" />
                      {queueType === "ranked" ? "START RANKED ROUND" : "START ROUND"}
                    </button>
                    <button
                      onClick={() => selectedScenario && resetForScenario(selectedScenario)}
                      className="inline-flex items-center gap-2 rounded-lg border border-border/30 px-4 py-3 font-mono text-xs tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground hover:border-border/50"
                    >
                      <RotateCcw className="w-4 h-4" />
                      RESET
                    </button>
                  </div>
                </div>
              </GlassPanel>

              {/* ── Sidebar Stats Panel ─────────────────────────────── */}
              <div className="w-full lg:w-[260px] space-y-4">
                {/* Stats Cards */}
                <GlassPanel className="p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full pointer-events-none" />
                  <p className="font-mono text-[10px] tracking-[0.24em] text-primary mb-4">PILOT STATUS</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-muted-foreground">ELO RATING</span>
                      <span className="font-display text-xl text-primary">{user?.stats?.elo ?? 600}</span>
                    </div>
                    <div className="h-[1px] bg-border/20" />
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-muted-foreground">WIN RATE</span>
                      <span className="font-display text-xl text-neon-green">{user?.stats?.winRate ?? 0}%</span>
                    </div>
                    <div className="h-[1px] bg-border/20" />
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-muted-foreground">STREAK</span>
                      <span className="font-display text-xl text-neon-yellow">{user?.stats?.streak ?? 0}</span>
                    </div>
                  </div>
                </GlassPanel>

                {/* Quick Rules */}
                <GlassPanel className="p-5 relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-accent/5 to-transparent rounded-tr-full pointer-events-none" />
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-neon-yellow" />
                    <p className="font-mono text-[10px] tracking-[0.2em] text-neon-yellow">DISCIPLINE RULES</p>
                  </div>
                  <ul className="space-y-2 text-[11px] text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="w-1 h-1 mt-1.5 rounded-full bg-neon-yellow/60 shrink-0" />
                      Paste is blocked during live rounds
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1 h-1 mt-1.5 rounded-full bg-neon-yellow/60 shrink-0" />
                      Tab switching reduces discipline score
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1 h-1 mt-1.5 rounded-full bg-neon-yellow/60 shrink-0" />
                      Faster clean fixes produce higher totals
                    </li>
                  </ul>
                </GlassPanel>

                {/* Timer visual */}
                <GlassPanel className="p-5 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-2">
                    <TimerReset className="w-3.5 h-3.5 text-primary" />
                    <p className="font-mono text-[10px] tracking-[0.2em] text-primary">TIME LIMIT</p>
                  </div>
                  <p className="font-display text-3xl text-foreground">{TOTAL_TIME}s</p>
                  <div className="mt-3 h-1.5 rounded-full bg-surface-1/50 overflow-hidden">
                    <div className="h-full w-full rounded-full bg-gradient-to-r from-primary/60 to-primary/30" />
                  </div>
                </GlassPanel>
              </div>
            </div>

            {/* ── Collapsible How to Play ───────────────────────────── */}
            <GlassPanel className="relative overflow-hidden">
              <button
                onClick={() => setHowToPlayOpen(!howToPlayOpen)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="font-mono text-[10px] tracking-[0.24em] text-primary">HOW TO PLAY</span>
                  <span className="font-mono text-[10px] text-muted-foreground">— DEBUG ARENA GUIDE</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${
                    howToPlayOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {howToPlayOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 border-t border-border/20">
                      <div className="grid md:grid-cols-2 gap-6 mt-5">
                        {/* Steps */}
                        <div className="space-y-3">
                          <p className="font-mono text-[10px] tracking-[0.2em] text-neon-yellow mb-2">GAME FLOW</p>
                          {howToPlaySteps.map((step) => (
                            <div key={step.title} className="rounded-lg border border-border/20 bg-surface-1/30 px-4 py-3">
                              <p className="font-mono text-[10px] tracking-[0.15em] text-neon-yellow">{step.title}</p>
                              <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                                {step.description}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Sample Walkthrough */}
                        <div className="space-y-3">
                          <p className="font-mono text-[10px] tracking-[0.2em] text-primary mb-2">
                            SAMPLE WALKTHROUGH
                          </p>
                          {sampleWalkthrough.map((item, index) => (
                            <div
                              key={item}
                              className="rounded-lg border border-primary/10 bg-primary/5 px-4 py-3"
                            >
                              <p className="font-mono text-[10px] tracking-[0.15em] text-primary">STEP {index + 1}</p>
                              <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassPanel>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
              PLAYING / COUNTDOWN PHASE — unchanged logic, cleaned up
           ══════════════════════════════════════════════════════════════ */}

        {(phase === "countdown" || phase === "playing" || phase === "submitting") && selectedScenario && (
          <div className="grid xl:grid-cols-[300px_minmax(0,1fr)_320px] gap-6 items-start">
            <GlassPanel className={`p-6 overflow-hidden ${workspaceHeightClass}`}>
              <div className="flex h-full flex-col">
                <button
                  onClick={() => {
                    setPhase("lobby");
                    resetForScenario(selectedScenario);
                  }}
                  className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                  ABORT ROUND
                </button>

                <div className="mt-6 flex-1 overflow-y-auto pr-2">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.24em] text-primary">ACTIVE THREAT</p>
                    <h2 className="mt-3 font-display text-2xl text-foreground">{selectedScenario.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{selectedScenario.description}</p>
                  </div>

                  <div className="mt-6 grid gap-3">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-center gap-2">
                        <ListChecks className="w-4 h-4 text-primary" />
                        <p className="font-mono text-[10px] tracking-[0.24em] text-primary">ROUND FLOW</p>
                      </div>
                      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                        <p>1. Read the failure context before editing.</p>
                        <p>2. Patch the visible bug only.</p>
                        <p>3. Watch timer and avoid tab switches.</p>
                        <p>4. Submit once the core logic is stable.</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-neon-yellow/20 bg-neon-yellow/5 p-4">
                      <div className="flex items-center gap-2">
                        <TimerReset className="w-4 h-4 text-neon-yellow" />
                        <p className="font-mono text-[10px] tracking-[0.24em] text-neon-yellow">
                          QUICK SUCCESS FORMULA
                        </p>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                        Read the stack trace, identify the failing condition, apply the smallest correct fix, then
                        submit before the timer burns your score.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-border/30 bg-surface-1/40 p-4">
                    <p className="font-mono text-[10px] tracking-[0.24em] text-accent">STACK TRACE</p>
                    <pre className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground font-mono">
                      {selectedScenario.stackTrace}
                    </pre>
                  </div>

                  <div className="mt-6 flex items-start gap-3 rounded-xl border border-neon-yellow/20 bg-neon-yellow/5 p-4">
                    <ShieldAlert className="w-4 h-4 text-neon-yellow mt-0.5" />
                    <p className="text-xs text-muted-foreground">{selectedScenario.hint}</p>
                  </div>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className={`p-0 overflow-hidden ${workspaceHeightClass} ${editorShake ? "shake" : ""}`}>
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-border/30 px-5 py-4 bg-surface-1/70">
                  <div className="flex items-center gap-3">
                    <Terminal className="w-4 h-4 text-primary" />
                    <span className="font-mono text-xs tracking-[0.2em] text-foreground">
                      {selectedScenario.language.toUpperCase()} // LIVE PATCH
                    </span>
                  </div>
                  {phase === "countdown" ? (
                    <span className="font-display text-3xl text-primary text-glow-cyan">{countdown}</span>
                  ) : (
                    <ArenaTimer timeLeft={timeLeft} totalTime={TOTAL_TIME} />
                  )}
                </div>

                <div className="flex-1 min-h-0" onPaste={handlePaste}>
                  <Editor
                    height="100%"
                    language={editorLanguage}
                    value={code}
                    onChange={handleEditorChange}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      fontFamily: "JetBrains Mono, monospace",
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      readOnly: phase === "countdown" || phase === "submitting",
                    }}
                  />
                </div>

                <div className="flex items-center justify-between border-t border-border/30 px-5 py-4 bg-surface-1/70">
                  <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] text-muted-foreground">
                    <span>KEYSTROKES: {keystrokes}</span>
                    <span>TAB SWITCHES: {tabSwitches}</span>
                    <span>PASTE FLAG: {pasted ? "YES" : "NO"}</span>
                  </div>
                  <button
                    onClick={() => void handleSubmit()}
                    disabled={phase !== "playing" || isBusy}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-mono text-xs tracking-[0.18em] text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Play className="w-4 h-4" />
                    SUBMIT PATCH
                  </button>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className={`p-6 overflow-hidden ${workspaceHeightClass}`}>
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-2">
                  <Skull className="w-4 h-4 text-accent" />
                  <p className="font-mono text-[10px] tracking-[0.24em] text-accent">AI HECKLER FEED</p>
                </div>
                <div className="mt-4 flex-1 overflow-y-auto pr-2">
                  <div className="space-y-3">
                    {hecklerFeed.length > 0 ? (
                      hecklerFeed.map((message, index) => (
                        <div
                          key={`${message}-${index}`}
                          className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-muted-foreground"
                        >
                          {message}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-border/30 bg-surface-1/40 px-4 py-3 text-xs text-muted-foreground">
                        The heckler is calibrating sarcasm for this round.
                      </div>
                    )}
                  </div>

                  <div className="mt-6 rounded-xl border border-border/30 bg-surface-1/40 p-4">
                    <div className="flex items-center gap-2">
                      <Clipboard className="w-4 h-4 text-neon-yellow" />
                      <p className="font-mono text-[10px] tracking-[0.24em] text-neon-yellow">DISCIPLINE RULES</p>
                    </div>
                    <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                      <li>Paste is blocked during live rounds.</li>
                      <li>Tab switching reduces discipline score.</li>
                      <li>Faster clean fixes produce higher totals.</li>
                    </ul>
                  </div>

                  <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-primary" />
                      <p className="font-mono text-[10px] tracking-[0.24em] text-primary">WHAT TO LOOK FOR</p>
                    </div>
                    <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                      <p>Compare the stack trace with the buggy code path.</p>
                      <p>Use the hint to identify the exact bug family, not just the symptom.</p>
                      <p>Keep your change focused so tests pass without introducing new failures.</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-primary" />
                        <p className="font-mono text-[10px] tracking-[0.24em] text-primary">AI COACH</p>
                      </div>
                      <button
                        onClick={() =>
                          void coachMutation.mutateAsync({
                            scenarioId: selectedScenario.id,
                            code,
                          })
                        }
                        disabled={coachMutation.isPending}
                        className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-[10px] tracking-[0.18em] text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                      >
                        {coachMutation.isPending ? "ANALYZING..." : "ANALYZE PATCH"}
                      </button>
                    </div>

                    {coachReport ? (
                      <div className="mt-4 space-y-4">
                        <div>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            MODE: {coachReport.provider.toUpperCase()}
                          </p>
                          <p className="mt-2 text-sm text-foreground">{coachReport.rootCause}</p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.18em] text-neon-yellow">NEXT MOVES</p>
                          <div className="mt-2 space-y-2">
                            {coachReport.actionPlan.map((item) => (
                              <div
                                key={item}
                                className="rounded-lg border border-border/20 bg-surface-1/40 px-3 py-2 text-xs text-muted-foreground"
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] tracking-[0.18em] text-accent">RISK FLAGS</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {coachReport.riskFlags.map((item) => (
                              <span
                                key={item}
                                className="rounded-full border border-accent/20 bg-accent/10 px-2 py-1 font-mono text-[10px] text-accent"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-3 text-xs text-primary">
                          {coachReport.judgeLine}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-xs text-muted-foreground">
                        Ask the AI coach to inspect your current patch and suggest the next smartest move.
                      </p>
                    )}
                  </div>

                  {phase === "submitting" ? (
                    <div className="mt-6 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 font-mono text-xs text-primary">
                      Running containment checks against your patch...
                    </div>
                  ) : null}
                </div>
              </div>
            </GlassPanel>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
              RESULTS PHASE — unchanged logic
           ══════════════════════════════════════════════════════════════ */}

        {phase === "results" && (result || aiJudgeResult) && selectedScenario && (
          <div className="space-y-6">
            <GlassPanel className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p
                    className={`font-mono text-[10px] tracking-[0.24em] ${
                      result
                        ? result.attempt.passed
                          ? "text-neon-green"
                          : "text-accent"
                        : aiJudgeResult?.result.correct
                          ? "text-neon-green"
                          : "text-accent"
                    }`}
                  >
                    {result
                      ? result.attempt.passed
                        ? "PATCH ACCEPTED"
                        : "PATCH REJECTED"
                      : aiJudgeResult?.result.correct
                        ? "PATCH ACCEPTED"
                        : "PATCH REJECTED"}
                  </p>
                  <h2 className="mt-3 font-display text-3xl text-foreground">{selectedScenario.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {result?.summary ?? aiJudgeResult?.result.feedback ?? "AI Evaluation completed."}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground">OVERALL SCORE</p>
                  <p className="font-display text-5xl text-primary text-glow-cyan">
                    {result?.scores.overall ?? aiJudgeResult?.result.score ?? 0}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4 mt-8">
                {result ? (
                  Object.entries(result.scores).map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                      <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
                        {label.toUpperCase()}
                      </p>
                      <p className="mt-3 font-display text-3xl text-foreground">{value}</p>
                    </div>
                  ))
                ) : aiJudgeResult ? (
                  <>
                    <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                      <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">CORRECTNESS</p>
                      <p className="mt-3 font-display text-3xl text-foreground">
                        {aiJudgeResult.result.correctnessScore}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                      <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">SPEED</p>
                      <p className="mt-3 font-display text-3xl text-foreground">
                        {aiJudgeResult.result.speedBonus}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                      <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">DISCIPLINE</p>
                      <p className="mt-3 font-display text-3xl text-foreground">
                        {aiJudgeResult.result.disciplineBonus}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                      <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">EFFORT</p>
                      <p className="mt-3 font-display text-3xl text-foreground">
                        {aiJudgeResult.result.effortBonus}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>

              {result?.rankedUpdate?.queueType === "ranked" ? (
                <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-primary">RANKED ELO UPDATE</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground">PREVIOUS</p>
                      <p className="mt-2 font-display text-2xl text-foreground">
                        {result.rankedUpdate.previousElo}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground">CHANGE</p>
                      <p
                        className={`mt-2 font-display text-2xl ${
                          result.rankedUpdate.eloChange >= 0 ? "text-neon-green" : "text-accent"
                        }`}
                      >
                        {result.rankedUpdate.eloChange >= 0 ? "+" : ""}
                        {result.rankedUpdate.eloChange}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground">CURRENT</p>
                      <p className="mt-2 font-display text-2xl text-primary">{result.rankedUpdate.nextElo}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground">LEAGUE</p>
                      <p className="mt-2 font-display text-2xl text-neon-yellow">{result.rankedUpdate.league}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </GlassPanel>

            <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
              <GlassPanel className={`p-6 overflow-hidden ${workspaceHeightClass}`}>
                <div className="flex h-full flex-col">
                  <p className="font-mono text-[10px] tracking-[0.24em] text-primary">TEST REPORT</p>
                  <div className="mt-4 flex-1 overflow-auto rounded-xl border border-border/30 bg-surface-1/40">
                    <div className="grid grid-cols-[1.4fr_1fr_120px] gap-4 px-5 py-3 border-b border-border/30 font-mono text-[10px] tracking-[0.22em] text-muted-foreground">
                      <span>{isAiGenerated ? "EVALUATION CRITERIA" : "TEST"}</span>
                      <span>{isAiGenerated ? "AI PROVIDER" : "DESCRIPTION"}</span>
                      <span>STATUS</span>
                    </div>
                    {!isAiGenerated && result
                      ? result.tests.map((test) => (
                          <div
                            key={test.name}
                            className="grid grid-cols-[1.4fr_1fr_120px] gap-4 px-5 py-4 border-b border-border/10 text-sm"
                          >
                            <div className="font-mono text-foreground">{test.name}</div>
                            <div className="text-muted-foreground text-xs">{test.description}</div>
                            <div className="flex items-center gap-2 font-mono text-xs">
                              {test.passed ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-neon-green" />
                                  <span className="text-neon-green">PASS</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 text-accent" />
                                  <span className="text-accent">FAIL</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      : isAiGenerated && aiJudgeResult
                        ? (
                            <div className="grid grid-cols-[1.4fr_1fr_120px] gap-4 px-5 py-4 border-b border-border/10 text-sm">
                              <div className="font-mono text-foreground">
                                {aiGeneratedScenarioContext?.evaluationCriteria ??
                                  "Static Analysis & Logic Correctness"}
                              </div>
                              <div className="text-muted-foreground text-xs">{aiJudgeResult.provider}</div>
                              <div className="flex items-center gap-2 font-mono text-xs">
                                {aiJudgeResult.result.correct ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-neon-green" />
                                    <span className="text-neon-green">PASS</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4 text-accent" />
                                    <span className="text-accent">FAIL</span>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        : null}
                  </div>
                </div>
              </GlassPanel>

              <GlassPanel className={`p-6 overflow-hidden ${workspaceHeightClass}`}>
                <div className="flex h-full flex-col">
                  <p className="font-mono text-[10px] tracking-[0.24em] text-primary">MISSION REPORT</p>
                  <div className="mt-4 flex-1 overflow-y-auto pr-2">
                    <div className="space-y-4 text-sm text-muted-foreground">
                      <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                        <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">DURATION</p>
                        <p className="mt-2 font-display text-3xl text-foreground">
                          {result?.attempt.durationSeconds ?? TOTAL_TIME - timeLeft}s
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                        <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">KEYSTROKES</p>
                        <p className="mt-2 font-display text-3xl text-foreground">
                          {result?.attempt.keystrokes ?? keystrokes}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                        <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
                          DISCIPLINE FLAGS
                        </p>
                        <p className="mt-2 text-sm text-foreground">
                          Tab switches: {result?.attempt.tabSwitches ?? tabSwitches}
                          <br />
                          Paste blocked: {(result?.attempt.pasted ?? pasted) ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <button
                        onClick={() =>
                          result &&
                          void debriefMutation.mutateAsync({
                            scenarioId: result.scenario.id,
                            code,
                            passed: result.attempt.passed,
                            durationSeconds: result.attempt.durationSeconds,
                            pasted: result.attempt.pasted,
                            tabSwitches: result.attempt.tabSwitches,
                            keystrokes: result.attempt.keystrokes,
                            testResults: result.tests.map((t) => ({
                              name: t.name,
                              description: t.description,
                              passed: t.passed,
                            })),
                            scores: result.scores,
                          })
                        }
                        disabled={debriefMutation.isPending}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-secondary/40 bg-secondary/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-secondary transition-colors hover:bg-secondary/20 disabled:opacity-60"
                      >
                        <Bot className="w-4 h-4" />
                        {debriefMutation.isPending ? "GENERATING AI DEBRIEF..." : "GENERATE AI DEBRIEF"}
                      </button>
                      {result && (
                        <button
                          onClick={() => drawResultCard(result)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-primary transition-colors hover:bg-primary/20"
                        >
                          <Download className="w-4 h-4" />
                          DOWNLOAD RESULT CARD
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setPhase("lobby");
                          resetForScenario(selectedScenario);
                        }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border/40 px-4 py-3 font-mono text-xs tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <RotateCcw className="w-4 h-4" />
                        RETURN TO LOBBY
                      </button>
                    </div>

                    {debriefReport ? (
                      <div className="mt-6 rounded-xl border border-secondary/20 bg-secondary/5 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-secondary" />
                            <p className="font-mono text-[10px] tracking-[0.2em] text-secondary">
                              AI DEBRIEF // {debriefReport.provider.toUpperCase()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary">
                              CONFIDENCE: {debriefReport.confidenceBand.toUpperCase()}
                            </span>
                            <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-1 font-mono text-[10px] text-accent">
                              LEAK-RISK: {debriefReport.safety.leakRisk.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-foreground">{debriefReport.verdict}</p>

                        <div className="mt-4 space-y-4">
                          <div>
                            <p className="font-mono text-[10px] text-neon-green">STRENGTHS</p>
                            <div className="mt-2 space-y-2">
                              {debriefReport.strengths.map((item) => (
                                <div
                                  key={`${item.dimension}-${item.evidenceSpan}`}
                                  className="rounded-lg border border-border/20 bg-surface-1/40 px-3 py-2 text-xs text-muted-foreground"
                                >
                                  <p className="font-mono text-[10px] text-neon-green">{item.dimension}</p>
                                  <p className="mt-1">{item.evidenceSpan}</p>
                                  {item.whyItHelped ? (
                                    <p className="mt-1 text-[11px] text-foreground/80">
                                      Why it helped: {item.whyItHelped}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="font-mono text-[10px] text-accent">WEAKNESSES</p>
                            <div className="mt-2 space-y-2">
                              {debriefReport.weaknesses.map((item) => (
                                <div
                                  key={`${item.dimension}-${item.evidenceSpan}`}
                                  className="rounded-lg border border-border/20 bg-surface-1/40 px-3 py-2 text-xs text-muted-foreground"
                                >
                                  <p className="font-mono text-[10px] text-accent">{item.dimension}</p>
                                  <p className="mt-1">{item.evidenceSpan}</p>
                                  {item.impact ? (
                                    <p className="mt-1 text-[11px] text-foreground/80">Impact: {item.impact}</p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="font-mono text-[10px] text-primary">MISCONCEPTION TAGS</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {debriefReport.misconceptionTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="font-mono text-[10px] text-neon-yellow">NEXT PRACTICE FOCUS</p>
                            <div className="mt-2 rounded-lg border border-border/20 bg-surface-1/40 px-3 py-2 text-xs text-muted-foreground">
                              {debriefReport.nextPracticeFocus}
                            </div>
                          </div>
                          <div>
                            <p className="font-mono text-[10px] text-neon-yellow">PROGRESSIVE HINTS</p>
                            <div className="mt-2 space-y-2">
                              {debriefReport.hints.map((item, index) => (
                                <div
                                  key={`${item}-${index}`}
                                  className="rounded-lg border border-border/20 bg-surface-1/40 px-3 py-2 text-xs text-muted-foreground"
                                >
                                  <span className="font-mono text-[10px] text-neon-yellow">HINT {index + 1}:</span>{" "}
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="font-mono text-[10px] text-primary">APPROACH SKELETON</p>
                            <div className="mt-2 space-y-2">
                              {debriefReport.approachSkeleton.map((step, index) => (
                                <div
                                  key={`${step}-${index}`}
                                  className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground"
                                >
                                  <span className="font-mono text-[10px] text-primary">STEP {index + 1}:</span> {step}
                                </div>
                              ))}
                            </div>
                          </div>
                          {debriefReport.optimalApproach ? (
                            <div>
                              <p className="font-mono text-[10px] text-primary">OPTIMAL APPROACH</p>
                              <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-3 text-xs text-muted-foreground leading-relaxed">
                                {debriefReport.optimalApproach}
                              </div>
                            </div>
                          ) : null}
                          {debriefReport.safety.redactionsApplied || debriefReport.safety.fallbackUsed ? (
                            <div className="rounded-lg border border-neon-yellow/20 bg-neon-yellow/10 px-3 py-3 text-xs text-neon-yellow">
                              Safety mode was applied to keep hints non-spoiler.
                            </div>
                          ) : null}
                          <div className="rounded-lg border border-secondary/20 bg-secondary/10 px-3 py-3 text-xs text-secondary">
                            {debriefReport.judgeSoundbite}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </GlassPanel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugArenaSolo;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
  Filter,
  ListChecks,
  Play,
  RotateCcw,
  ShieldAlert,
  Skull,
  Terminal,
  TimerReset,
  Sparkles,
  XCircle
} from "lucide-react";
import CyberNavbar from "@/components/CyberNavbar";
import ArenaTimer from "@/components/ArenaTimer";
import GlassPanel from "@/components/GlassPanel";
import { appRoutes } from "@/app/routes";
import { useAuth } from "@/features/auth/auth-context";
import {
  fetchSoloScenarios,
  submitSoloScenario,
  type SoloScenario,
  type SoloSubmissionResult
} from "@/features/debug-arena/debug-arena-api";
import {
  fetchPyDebugCoachReport,
  fetchPyDebugDebriefReport,
  fetchHecklerTaunt,
  type DebugCoachReport,
  type DebugDebriefReport
} from "@/features/ai/ai-api";

const TOTAL_TIME = 90;

const hecklerFallbackMessages = [
  "That patch looked confident. Confidence is not a substitute for correctness.",
  "The timer is moving faster than your fix quality.",
  "Interesting. You just rewired production with vibes.",
  "Contain the bug. Preferably before it reproduces again.",
  "Every keystroke is evidence.",
  "You are not losing. You are generating telemetry.",
  "Keep moving. The stack trace is not going to debug itself."
];

type SoloPhase = "lobby" | "countdown" | "playing" | "submitting" | "results";
type SoloQueueType = "casual" | "ranked";

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

/* ── Custom themed dropdown ────────────────────────────────────────── */
type DropdownOption = { value: string; label: string; colorClass?: string };

function CyberDropdown({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: DropdownOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 font-mono text-[10px] tracking-[0.2em] transition-all ${
          open
            ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/5"
            : "border-border/30 bg-surface-1/50 hover:border-primary/30 hover:bg-surface-1/70"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-muted-foreground">{label}:</span>
          <span className={`block truncate ${selected?.colorClass ?? "text-foreground"}`}>
            {selected?.label ?? value}
          </span>
        </span>
        <ChevronDown
          className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="absolute z-50 mt-1.5 w-full rounded-lg border border-border/40 bg-[hsl(222,40%,8%)] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left font-mono text-[10px] tracking-[0.18em] transition-colors ${
                value === option.value
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  value === option.value ? "bg-primary shadow-[0_0_6px_hsla(193,78%,55%,0.6)]" : "bg-border/50"
                }`}
              />
              <span className={option.colorClass}>{option.label}</span>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

const languageOptions: DropdownOption[] = [
  { value: "All", label: "ALL LANGUAGES", colorClass: "text-foreground" },
  { value: "typescript", label: "TYPESCRIPT", colorClass: "text-primary" },
  { value: "python", label: "PYTHON", colorClass: "text-neon-yellow" },
  { value: "cpp", label: "C++", colorClass: "text-accent" }
];

const difficultyOptions: DropdownOption[] = [
  { value: "All", label: "ALL DIFFICULTIES", colorClass: "text-foreground" },
  { value: "EASY", label: "EASY", colorClass: "text-neon-green" },
  { value: "MEDIUM", label: "MEDIUM", colorClass: "text-neon-yellow" },
  { value: "HARD", label: "HARD", colorClass: "text-primary" },
  { value: "EXTREME", label: "EXTREME", colorClass: "text-accent" }
];

const howToPlaySteps = [
  {
    title: "1. Pick a scenario",
    description:
      "Choose a language and difficulty, then read the bug title, description, stack trace, and mission hint before you start the timer."
  },
  {
    title: "2. Understand the failure",
    description:
      "Use the stack trace to locate the broken behavior. The description tells you what users are experiencing. The hint narrows the exact kind of fix expected."
  },
  {
    title: "3. Patch only the risky code",
    description:
      "Edit the buggy snippet directly. Avoid random rewrites. Clean, targeted fixes usually score better than large speculative changes."
  },
  {
    title: "4. Submit and review",
    description:
      "Submit before time runs out, then review failed tests, score breakdown, and AI debrief to understand what worked and what to improve next."
  }
];

const sampleWalkthrough = [
  "Example: if a JWT `exp` field is in seconds but the code compares it to `Date.now()` in milliseconds, valid tokens may be rejected or expired tokens may pass incorrectly.",
  "What to notice: the stack trace points at token verification, and the hint mentions a unit mismatch.",
  "What to do: convert the current time to seconds first, then keep the same expiry comparison logic.",
  "What not to do: rewrite the full auth flow, rename unrelated variables, or remove the error path completely."
];

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
  const startTimeRef = useRef<number | null>(null);
  const hecklerIndexRef = useRef(0);
  const effectiveDifficultyFilter = queueType === "ranked" ? "All" : filterDifficulty;

  const { data, isLoading } = useQuery({
    queryKey: ["debug-arena-scenarios", filterLanguage, effectiveDifficultyFilter],
    queryFn: () =>
      fetchSoloScenarios(token!, {
        language: filterLanguage,
        difficulty: effectiveDifficultyFilter
      }),
    enabled: Boolean(token)
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
    if (selectedScenarioId) {
      const exactMatch = scenarios.find((scenario) => scenario.id === selectedScenarioId);
      if (exactMatch) {
        return exactMatch;
      }
    }

    return topicScenarios[0] ?? scenarios[0] ?? null;
  }, [scenarios, selectedScenarioId, topicScenarios]);

  useEffect(() => {
    if (queueType === "ranked") {
      setSelectedTopicId("random");
      setFilterDifficulty("All");
    }
  }, [queueType]);

  useEffect(() => {
    if (topicOptions.length === 0) {
      return;
    }

    if (queueType === "ranked") {
      if (selectedTopicId !== "random") {
        setSelectedTopicId("random");
      }
      return;
    }

    if (selectedTopicId === "random") {
      return;
    }

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
    if (phase !== "lobby") {
      return;
    }

    const previewScenario = topicScenarios[0] ?? scenarios[0] ?? null;

    if (!previewScenario) {
      return;
    }

    setSelectedScenarioId(previewScenario.id);
    setCode(previewScenario.buggyCode);
  }, [phase, scenarios, topicScenarios]);

  useEffect(() => {
    if (phase !== "countdown") {
      return;
    }

    if (countdown <= 0) {
      setPhase("playing");
      startTimeRef.current = Date.now();
      return;
    }

    const timeout = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [countdown, phase]);

  useEffect(() => {
    if (phase !== "playing") {
      return;
    }

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
    if (phase !== "playing" || !selectedScenario || !token) {
      return;
    }

    let cancelled = false;

    const fetchTaunt = async () => {
      try {
        const result = await fetchHecklerTaunt(token, {
          scenarioId: selectedScenario.id,
          code,
          timeLeft,
          keystrokes,
          tabSwitches,
          pasted
        });
        if (!cancelled && result?.taunt) {
          setHecklerFeed((current) => [...current.slice(-5), result.taunt]);
        }
      } catch {
        // Fallback to static message on error
        if (!cancelled) {
          const fallback = hecklerFallbackMessages[hecklerIndexRef.current % hecklerFallbackMessages.length];
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
    if (phase !== "playing") {
      return;
    }

    const handleBlur = () => {
      setTabSwitches((current) => current + 1);
      setHecklerFeed((current) => [...current.slice(-5), "Tab switch detected. Penalty recorded."]);
    };

    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [phase]);

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
      void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  const coachMutation = useMutation({
    mutationFn: (payload: { scenarioId: string; code: string }) => fetchPyDebugCoachReport(token!, payload),
    onSuccess: (data) => {
      setCoachReport(data.report);
    }
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
    }
  });

  function resetForScenario(scenario: SoloScenario) {
    setSelectedScenarioId(scenario.id);
    setCode(scenario.buggyCode);
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

    if (!chosenScenario) {
      return;
    }

    resetForScenario(chosenScenario);
    setPhase("countdown");
  }

  const handleSubmit = useCallback(async () => {
    if (!selectedScenario || submitMutation.isPending) {
      return;
    }

    setPhase("submitting");
    const durationSeconds = startTimeRef.current
      ? Math.min(TOTAL_TIME, Math.max(0, Math.round((Date.now() - startTimeRef.current) / 1000)))
      : TOTAL_TIME - timeLeft;

    await submitMutation.mutateAsync({
      scenarioId: selectedScenario.id,
      code,
      durationSeconds,
      pasted,
      tabSwitches,
      keystrokes,
      queueType
    });
  }, [code, keystrokes, pasted, queueType, selectedScenario, submitMutation, tabSwitches, timeLeft]);

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
    if (phase !== "playing") {
      return;
    }

    event.preventDefault();
    setPasted(true);
    setEditorShake(true);
    window.setTimeout(() => setEditorShake(false), 350);
    setHecklerFeed((current) => [...current.slice(-5), "Clipboard injection blocked. Manual patching only."]);
  }

  const isBusy = phase === "submitting" || submitMutation.isPending;
  const editorLanguage = selectedScenario ? getEditorLanguage(selectedScenario.language) : "typescript";
  const workspaceHeightClass = "xl:h-[calc(100vh-9rem)]";

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <CyberNavbar />
      <div className="pt-20 pb-12 px-4 max-w-7xl mx-auto">
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

        {phase === "lobby" && (
          <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
            <GlassPanel className={`p-6 overflow-hidden ${workspaceHeightClass}`}>
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between mb-4">
                <p className="font-mono text-xs tracking-[0.24em] text-primary">TOPICS</p>
                {isLoading ? <p className="font-mono text-[10px] text-muted-foreground">SYNCING...</p> : null}
                </div>
              
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <CyberDropdown
                    label="LANG"
                    options={languageOptions}
                    value={filterLanguage}
                    onChange={setFilterLanguage}
                  />
                  {queueType === "casual" ? (
                    <CyberDropdown
                      label="DIFF"
                      options={difficultyOptions}
                      value={filterDifficulty}
                      onChange={setFilterDifficulty}
                    />
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(["casual", "ranked"] as SoloQueueType[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setQueueType(mode)}
                      className={`rounded-lg border px-3 py-3 text-left transition-all ${
                        queueType === mode
                          ? "border-primary/50 bg-primary/10 text-primary shadow-lg shadow-primary/10"
                          : "border-border/30 bg-surface-1/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      <p className="font-mono text-[10px] tracking-[0.18em]">{mode.toUpperCase()}</p>
                      <p className="mt-2 text-xs leading-relaxed">
                        {mode === "ranked"
                          ? "Random topic, random question, live ELO update."
                          : "Choose a topic and solve a randomized scenario from that bug family."}
                      </p>
                    </button>
                  ))}
                </div>

                {(filterLanguage !== "All" || (queueType === "casual" && filterDifficulty !== "All")) && (
                  <button
                    onClick={() => {
                      setFilterLanguage("All");
                      setFilterDifficulty("All");
                    }}
                    className="group self-end inline-flex items-center gap-1.5 rounded-md border border-border/20 bg-surface-1/30 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.2em] text-muted-foreground transition-all hover:border-primary/30 hover:text-primary hover:bg-primary/5"
                  >
                    <RotateCcw className="w-3 h-3 transition-transform group-hover:-rotate-180 duration-300" />
                    RESET
                  </button>
                )}
              </div>

              <div className="mb-3 rounded-xl border border-border/20 bg-background/30 px-4 py-3">
                <p className="font-mono text-[10px] tracking-[0.18em] text-neon-yellow">TOPIC PICK RULE</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {queueType === "ranked"
                    ? "Ranked locks topic and difficulty selection. Pick only the language, then CodeContagion assigns one random topic and one random question from that language."
                    : "Pick a topic below, then CodeContagion will load one random question from that topic when the round starts."}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {queueType === "ranked" ? (
                  <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                    <p className="font-display text-sm text-foreground">Ranked Topic Selection Locked</p>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      This queue always serves a random bug topic and a random question from the selected language.
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="font-mono text-[10px] tracking-[0.18em] text-primary">TOPIC MODE</span>
                      <span className="rounded-full border border-primary/30 bg-background/40 px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-primary">
                        RANDOM ONLY
                      </span>
                    </div>
                  </div>
                ) : topicOptions.length > 0 ? (
                  [
                    { id: "random", label: "Random Topic" },
                    ...topicOptions
                  ].map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => {
                        setSelectedTopicId(topic.id);
                      }}
                      className={`w-full rounded-xl border p-4 text-left transition-all ${
                        selectedTopicId === topic.id
                          ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/10"
                          : "border-border/30 bg-surface-1/40 hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-display text-sm text-foreground">{topic.label}</p>
                          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                            {topic.id === "random"
                              ? "RANDOM QUESTION • RANDOM BUG FAMILY"
                              : `${scenarios.filter((scenario) => scenario.topicId === topic.id).length} QUESTIONS READY`}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] tracking-[0.18em] text-primary">
                          {topic.id === "random" ? "RNG" : "TOPIC"}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                    <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">NO MATCHING SCENARIOS</p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Try resetting the filters or confirm the backend is returning Debug Arena scenarios for your current session.
                    </p>
                  </div>
                )}
              </div>
              </div>
            </GlassPanel>

            <GlassPanel className="p-6">
              {selectedScenario ? (
                <>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <p className="font-mono text-[10px] tracking-[0.24em] text-primary">LANGUAGE</p>
                      <p className="mt-3 font-display text-2xl text-foreground">{selectedScenario.language.toUpperCase()}</p>
                    </div>
                    <div className="rounded-xl border border-neon-yellow/20 bg-neon-yellow/5 p-4">
                      <p className="font-mono text-[10px] tracking-[0.24em] text-neon-yellow">QUEUE</p>
                      <p className={`mt-3 font-display text-2xl ${queueType === "ranked" ? "text-primary" : difficultyClass(selectedScenario.difficulty)}`}>{queueType.toUpperCase()}</p>
                    </div>
                    <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                      <p className="font-mono text-[10px] tracking-[0.24em] text-accent">RANKED ELO</p>
                      <p className="mt-3 font-display text-2xl text-foreground">{user?.stats?.elo ?? 600}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`font-mono text-[10px] tracking-[0.24em] ${difficultyClass(selectedScenario.difficulty)}`}>
                      {selectedScenario.difficulty}
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground">
                      {selectedScenario.language.toUpperCase()}
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.24em] text-primary">
                      {selectedScenario.topicLabel.toUpperCase()}
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.24em] text-neon-yellow">
                      {queueType === "ranked" ? "RANKED ELO ACTIVE" : "CASUAL PRACTICE"}
                    </span>
                  </div>
                  <h2 className="mt-3 font-display text-3xl text-foreground">{selectedScenario.topicLabel}</h2>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{selectedScenario.description}</p>

                  <div className="grid md:grid-cols-2 gap-6 mt-8">
                    <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                      <p className="font-mono text-[10px] tracking-[0.24em] text-accent">STACK TRACE</p>
                      <pre className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground font-mono">
                        {selectedScenario.stackTrace}
                      </pre>
                    </div>
                    <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                      <p className="font-mono text-[10px] tracking-[0.24em] text-neon-yellow">MISSION HINT</p>
                      <p className="mt-3 text-sm text-muted-foreground">{selectedScenario.hint}</p>
                      <div className="mt-6 flex items-start gap-3 rounded-lg border border-neon-yellow/20 bg-neon-yellow/5 px-4 py-3">
                        <AlertTriangle className="w-4 h-4 text-neon-yellow mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          Clipboard paste is blocked during the round, and tab switching reduces your discipline score.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
                    <div className="rounded-xl border border-border/30 bg-surface-1/40 p-5">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <p className="font-mono text-[10px] tracking-[0.24em] text-primary">HOW TO PLAY</p>
                      </div>
                      <div className="mt-4 space-y-4">
                        {howToPlaySteps.map((step) => (
                          <div key={step.title} className="rounded-xl border border-border/20 bg-background/30 px-4 py-3">
                            <p className="font-mono text-[10px] tracking-[0.18em] text-neon-yellow">{step.title}</p>
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <p className="font-mono text-[10px] tracking-[0.24em] text-primary">SAMPLE WALKTHROUGH</p>
                      </div>
                      <div className="mt-4 space-y-3">
                        {sampleWalkthrough.map((item, index) => (
                          <div key={item} className="rounded-xl border border-primary/10 bg-background/30 px-4 py-3">
                            <p className="font-mono text-[10px] tracking-[0.18em] text-primary">STEP {index + 1}</p>
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      onClick={startRound}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-mono text-xs tracking-[0.2em] text-primary-foreground transition-all hover:brightness-110 glow-cyan"
                    >
                      <Play className="w-4 h-4" />
                      {queueType === "ranked" ? "START RANKED ROUND" : "START ROUND"}
                    </button>
                    <button
                      onClick={() => selectedScenario && resetForScenario(selectedScenario)}
                      className="inline-flex items-center gap-2 rounded-lg border border-border/40 px-5 py-3 font-mono text-xs tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <RotateCcw className="w-4 h-4" />
                      RESET PREVIEW
                    </button>
                  </div>
                </>
              ) : (
                <p className="font-mono text-sm text-muted-foreground">Loading scenarios...</p>
              )}
            </GlassPanel>
          </div>
        )}

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
                    <p className="font-mono text-[10px] tracking-[0.24em] text-neon-yellow">QUICK SUCCESS FORMULA</p>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                    Read the stack trace, identify the failing condition, apply the smallest correct fix, then submit before the timer burns your score.
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
                    readOnly: phase === "countdown" || phase === "submitting"
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
                        code
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
                      <p className="font-mono text-[10px] text-muted-foreground">MODE: {coachReport.provider.toUpperCase()}</p>
                      <p className="mt-2 text-sm text-foreground">{coachReport.rootCause}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.18em] text-neon-yellow">NEXT MOVES</p>
                      <div className="mt-2 space-y-2">
                        {coachReport.actionPlan.map((item) => (
                          <div key={item} className="rounded-lg border border-border/20 bg-surface-1/40 px-3 py-2 text-xs text-muted-foreground">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.18em] text-accent">RISK FLAGS</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {coachReport.riskFlags.map((item) => (
                          <span key={item} className="rounded-full border border-accent/20 bg-accent/10 px-2 py-1 font-mono text-[10px] text-accent">
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

        {phase === "results" && result && selectedScenario && (
          <div className="space-y-6">
            <GlassPanel className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className={`font-mono text-[10px] tracking-[0.24em] ${result.attempt.passed ? "text-neon-green" : "text-accent"}`}>
                    {result.attempt.passed ? "PATCH ACCEPTED" : "PATCH REJECTED"}
                  </p>
                  <h2 className="mt-3 font-display text-3xl text-foreground">{selectedScenario.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{result.summary}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground">OVERALL SCORE</p>
                  <p className="font-display text-5xl text-primary text-glow-cyan">{result.scores.overall}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4 mt-8">
                {Object.entries(result.scores).map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                    <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
                      {label.toUpperCase()}
                    </p>
                    <p className="mt-3 font-display text-3xl text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              {result.rankedUpdate?.queueType === "ranked" ? (
                <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-primary">RANKED ELO UPDATE</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground">PREVIOUS</p>
                      <p className="mt-2 font-display text-2xl text-foreground">{result.rankedUpdate.previousElo}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground">CHANGE</p>
                      <p className={`mt-2 font-display text-2xl ${result.rankedUpdate.eloChange >= 0 ? "text-neon-green" : "text-accent"}`}>
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
                  <span>TEST</span>
                  <span>DESCRIPTION</span>
                  <span>STATUS</span>
                </div>
                {result.tests.map((test) => (
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
                ))}
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
                  <p className="mt-2 font-display text-3xl text-foreground">{result.attempt.durationSeconds}s</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">KEYSTROKES</p>
                  <p className="mt-2 font-display text-3xl text-foreground">{result.attempt.keystrokes}</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">DISCIPLINE FLAGS</p>
                  <p className="mt-2 text-sm text-foreground">
                    Tab switches: {result.attempt.tabSwitches}
                    <br />
                    Paste blocked: {result.attempt.pasted ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() =>
                    result && void debriefMutation.mutateAsync({
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
                        passed: t.passed
                      })),
                      scores: result.scores
                    })
                  }
                  disabled={debriefMutation.isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-secondary/40 bg-secondary/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-secondary transition-colors hover:bg-secondary/20 disabled:opacity-60"
                >
                  <Bot className="w-4 h-4" />
                  {debriefMutation.isPending ? "GENERATING AI DEBRIEF..." : "GENERATE AI DEBRIEF"}
                </button>
                <button
                  onClick={() => drawResultCard(result)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-primary transition-colors hover:bg-primary/20"
                >
                  <Download className="w-4 h-4" />
                  DOWNLOAD RESULT CARD
                </button>
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
                            {item.whyItHelped ? <p className="mt-1 text-[11px] text-foreground/80">Why it helped: {item.whyItHelped}</p> : null}
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
                            {item.impact ? <p className="mt-1 text-[11px] text-foreground/80">Impact: {item.impact}</p> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-primary">MISCONCEPTION TAGS</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {debriefReport.misconceptionTags.map((tag) => (
                          <span key={tag} className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary">
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
                          <div key={`${item}-${index}`} className="rounded-lg border border-border/20 bg-surface-1/40 px-3 py-2 text-xs text-muted-foreground">
                            <span className="font-mono text-[10px] text-neon-yellow">HINT {index + 1}:</span> {item}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-primary">APPROACH SKELETON</p>
                      <div className="mt-2 space-y-2">
                        {debriefReport.approachSkeleton.map((step, index) => (
                          <div key={`${step}-${index}`} className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
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

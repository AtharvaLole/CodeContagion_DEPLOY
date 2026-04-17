import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bot, Code2, RefreshCcw, ShieldAlert, Swords, Trophy, UserCircle2, Workflow } from "lucide-react";
import CyberNavbar from "@/components/CyberNavbar";
import GlassPanel from "@/components/GlassPanel";
import ParticleBackground from "@/components/ParticleBackground";
import CyberScreen from "@/components/layout/CyberScreen";
import { appRoutes } from "@/app/routes";
import { useAuth } from "@/features/auth/auth-context";
import { echoTraceScenarios } from "@/features/echotrace/data/scenarios";
import { applySabotageAction, createBrokenGraph, createStarterGraph } from "@/features/echotrace/data/starter-graphs";
import { submitEchoTraceMatch, type EchoTraceSubmitResponse } from "@/features/echotrace/echotrace-api";
import { analyzeGraphSecurity, evaluateFix, translateGraphToCode } from "@/features/echotrace/echotrace-parser";
import type { EchoTraceEvaluation, LogicGraphSnapshot, SabotageAction } from "@/features/echotrace/echotrace-types";
import { DeveloperEditor } from "@/features/echotrace/views/DeveloperEditor";
import { SaboteurCanvas } from "@/features/echotrace/views/SaboteurCanvas";

type MatchMode = "ai" | "duo";
type Role = "developer" | "saboteur";
type QueueType = "casual" | "ranked";
type Phase = "lobby" | "sabotage" | "handoff" | "repair" | "results";

const REPAIR_TIME = 180;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getRandomScenarioId(excludeId?: string) {
  if (echoTraceScenarios.length <= 1) {
    return echoTraceScenarios[0]?.id ?? "";
  }

  const pool = excludeId
    ? echoTraceScenarios.filter((item) => item.id !== excludeId)
    : echoTraceScenarios;

  return pool[Math.floor(Math.random() * pool.length)]?.id ?? echoTraceScenarios[0].id;
}

function simulateAiDefense(attackScore: number, actions: SabotageAction[]) {
  const unstoppable = actions.includes("insert-bypass") && actions.includes("reroute-to-database");
  const recovered = !unstoppable && attackScore < 72;
  const steps = recovered
    ? [
        actions.includes("insert-bypass")
          ? "Removed the manual override block from the active path."
          : "Checked the active path for shortcut nodes and found none left to remove.",
        actions.includes("reroute-to-database")
          ? "Moved the protected route back behind authentication."
          : "Confirmed the protected route stayed after authentication.",
        actions.includes("drop-after-auth")
          ? "Restored request continuity by clearing the traffic drop rule."
          : "Verified request continuity from entry through the protected route."
      ]
    : [
        "The AI inspected the graph but could not fully remove the exploit path.",
        "The pipeline still contains an unsafe order or sabotage block.",
        "Original safe state was not recovered before deployment."
      ];

  return {
    recovered,
    headline: recovered
      ? "AI defender removed the exploit path and restored a safe execution order."
      : "AI defender failed to contain the visual sabotage before deployment.",
    score: recovered ? clamp(76 - Math.round(attackScore / 5), 48, 90) : clamp(34 + Math.round(attackScore / 4), 35, 82),
    steps
  };
}

export default function EchoTracePage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const gameSectionRef = useRef<HTMLElement | null>(null);
  const [scenarioId, setScenarioId] = useState(() => getRandomScenarioId());
  const [matchMode, setMatchMode] = useState<MatchMode>("ai");
  const [queueType, setQueueType] = useState<QueueType>("ranked");
  const [playerRole, setPlayerRole] = useState<Role>("developer");
  const [duoUserRole, setDuoUserRole] = useState<Role>("developer");
  const [phase, setPhase] = useState<Phase>("lobby");
  const [snapshot, setSnapshot] = useState<LogicGraphSnapshot>(() => createStarterGraph(echoTraceScenarios[0]));
  const [actions, setActions] = useState<SabotageAction[]>([]);
  const [developerCode, setDeveloperCode] = useState(() => translateGraphToCode(snapshot.nodes, snapshot.edges));
  const [evaluation, setEvaluation] = useState<EchoTraceEvaluation | null>(null);
  const [timeLeft, setTimeLeft] = useState(REPAIR_TIME);
  const [roundNonce, setRoundNonce] = useState(0);
  const [result, setResult] = useState<null | {
    winnerLabel: string;
    developerScore: number;
    saboteurScore: number;
    conclusionSteps: string[];
    response: EchoTraceSubmitResponse;
  }>(null);

  const scenario = useMemo(() => echoTraceScenarios.find((item) => item.id === scenarioId) ?? echoTraceScenarios[0], [scenarioId]);
  const analysis = useMemo(() => analyzeGraphSecurity(snapshot.nodes, snapshot.edges), [snapshot]);
  const generatedCode = useMemo(() => translateGraphToCode(snapshot.nodes, snapshot.edges), [snapshot]);
  const aiGuidance = useMemo(() => {
    const suggestions = [
      `Start with route order. Protected access should land after authentication, not before it.`,
      analysis.sabotageActionsDetected[0]
        ? `First clue: ${analysis.sabotageActionsDetected[0]}`
        : `First clue: read the runtime comments and compare the active route to the intended trust chain.`,
      actions.includes("insert-bypass")
        ? "Look for any `skip_auth` override and remove it before touching lower-risk blocks."
        : actions.includes("drop-after-auth")
          ? "Check whether requests are being dropped after auth. Recovery means preserving continuity and access control."
          : "Validate that the protected route keeps a clean middleware -> auth -> data progression.",
      `Mission target: ${scenario.targetAsset}. Keep fixes focused on the exploit path instead of rewriting the whole policy.`,
      timeLeft <= 45
        ? "Time pressure tip: fix the highest-severity exploit first, then clean up leftover sabotage directives."
        : "Stabilize the exploit path first, then polish any remaining noisy policy blocks."
    ];

    const offset = roundNonce % suggestions.length;
    return [0, 1, 2].map((index) => suggestions[(offset + index) % suggestions.length]);
  }, [actions, analysis.sabotageActionsDetected, roundNonce, scenario.targetAsset, timeLeft]);
  const deployLabel = useMemo(() => {
    const labels = [
      "DEPLOY FIX",
      "SHIP PATCH",
      "HARDEN RUNTIME",
      "PUBLISH RECOVERY"
    ];

    return labels[roundNonce % labels.length];
  }, [roundNonce]);

  const submitMutation = useMutation({
    mutationFn: (payload: Parameters<typeof submitEchoTraceMatch>[1]) => submitEchoTraceMatch(token!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  useEffect(() => {
    if (phase !== "lobby") {
      return;
    }

    const nextSnapshot = createStarterGraph(scenario);
    setSnapshot(nextSnapshot);
    setActions([]);
    setDeveloperCode(translateGraphToCode(nextSnapshot.nodes, nextSnapshot.edges));
    setEvaluation(null);
    setTimeLeft(REPAIR_TIME);
    setPhase("lobby");
    setResult(null);
  }, [phase, scenario]);

  useEffect(() => {
    if (phase !== "repair") return;
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

  function resetRound() {
    const nextScenarioId = getRandomScenarioId(scenario.id);
    const nextScenario =
      echoTraceScenarios.find((item) => item.id === nextScenarioId) ?? echoTraceScenarios[0];
    const nextSnapshot = createStarterGraph(nextScenario);
    setScenarioId(nextScenarioId);
    setSnapshot(nextSnapshot);
    setActions([]);
    setDeveloperCode(translateGraphToCode(nextSnapshot.nodes, nextSnapshot.edges));
    setEvaluation(null);
    setTimeLeft(REPAIR_TIME);
    setResult(null);
    setPhase("lobby");
    setRoundNonce((current) => current + 1);
  }

  function startMatch() {
    const nextScenarioId = getRandomScenarioId(scenario.id);
    const nextScenario =
      echoTraceScenarios.find((item) => item.id === nextScenarioId) ?? echoTraceScenarios[0];

    setEvaluation(null);
    setResult(null);
    setTimeLeft(REPAIR_TIME);
    setRoundNonce((current) => current + 1);
    setScenarioId(nextScenarioId);

    if (matchMode === "ai" && playerRole === "developer") {
      const aiSnapshot = createBrokenGraph(nextScenario);
      setSnapshot(aiSnapshot);
      setActions(nextScenario.aiSabotagePlan);
      setDeveloperCode(translateGraphToCode(aiSnapshot.nodes, aiSnapshot.edges));
      setPhase("repair");
      return;
    }

    const nextSnapshot = createStarterGraph(nextScenario);
    setSnapshot(nextSnapshot);
    setActions([]);
    setDeveloperCode(translateGraphToCode(nextSnapshot.nodes, nextSnapshot.edges));
    setPhase("sabotage");
  }

  function applyAction(action: SabotageAction) {
    setSnapshot((current) => applySabotageAction(current, action));
    setActions((current) => [...current.filter((item) => item !== action), action]);
  }

  function handleCanvasNodesChange(nextNodes: LogicGraphSnapshot["nodes"]) {
    setSnapshot((current) => ({
      ...current,
      nodes: nextNodes
    }));
  }

  function handleCanvasEdgesChange(nextEdges: LogicGraphSnapshot["edges"]) {
    setSnapshot((current) => ({
      ...current,
      edges: nextEdges
    }));
  }

  async function finalizeRound(input: {
    winner: "user" | "ai" | "developer" | "saboteur";
    winnerLabel: string;
    developerPassed: boolean;
    developerScore: number;
    saboteurScore: number;
    repairFindings: string[];
    conclusionSteps: string[];
  }) {
    if (!token) return;
    const response = await submitMutation.mutateAsync({
      scenarioId: scenario.id,
      queueType,
      mode: matchMode,
      userRole: matchMode === "ai" ? playerRole : duoUserRole,
      winner: input.winner,
      developerPassed: input.developerPassed,
      durationSeconds: REPAIR_TIME - timeLeft,
      sabotageScore: input.saboteurScore,
      developerScore: input.developerScore,
      sabotageActions: analysis.sabotageActionsDetected,
      graphFindings: analysis.findings,
      repairFindings: input.repairFindings
    });

    setResult({
      winnerLabel: input.winnerLabel,
      developerScore: input.developerScore,
      saboteurScore: input.saboteurScore,
      conclusionSteps: input.conclusionSteps,
      response
    });
    setPhase("results");
  }

  async function handleLockSabotage() {
    if (actions.length === 0) return;
    setDeveloperCode(generatedCode);

    if (matchMode === "duo") {
      setPhase("handoff");
      return;
    }

    const aiDefense = simulateAiDefense(analysis.attackSurfaceScore, actions);
    await finalizeRound({
      winner: aiDefense.recovered ? "ai" : "user",
      winnerLabel: aiDefense.recovered ? "AI DEFENDER" : "USER SABOTEUR",
      developerPassed: aiDefense.recovered,
      developerScore: aiDefense.score,
      saboteurScore: clamp(analysis.attackSurfaceScore + (aiDefense.recovered ? 0 : 12), 0, 100),
      repairFindings: [],
      conclusionSteps: aiDefense.steps
    });
  }

  async function handleDeployFix() {
    const nextEvaluation = evaluateFix(developerCode, generatedCode);
    setEvaluation(nextEvaluation);

    await finalizeRound({
      winner:
        matchMode === "ai"
          ? nextEvaluation.passed
            ? "user"
            : "ai"
          : nextEvaluation.passed
            ? "developer"
            : "saboteur",
      winnerLabel:
        matchMode === "ai"
          ? nextEvaluation.passed
            ? "USER DEVELOPER"
            : "AI SABOTEUR"
          : nextEvaluation.passed
            ? "DEVELOPER"
            : "SABOTEUR",
      developerPassed: nextEvaluation.passed,
      developerScore: clamp(nextEvaluation.finalScore, 0, 100),
      saboteurScore: clamp(analysis.attackSurfaceScore, 0, 100),
      repairFindings: nextEvaluation.findings,
      conclusionSteps: nextEvaluation.passed
        ? [
            "Authentication is back in front of the protected route.",
            "Sabotage blocks were removed from the active path.",
            "The runtime is safe enough to deploy."
          ]
        : [
            "The fix still leaves a risky path in the runtime.",
            "At least one sabotage condition or bad order remains.",
            "The original safe state was not fully restored."
          ]
    });
  }

  useEffect(() => {
    if (phase === "repair" && timeLeft === 0) {
      void handleDeployFix();
    }
  }, [phase, timeLeft]);

  useEffect(() => {
    if (phase === "lobby") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      gameSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [phase]);

  const howToPlay = [
    "The canvas is the picture version of the system.",
    "The code box is the text version of that same picture.",
    "Saboteur breaks the flow. Developer fixes the flow.",
    "When the round ends, the winner and score are shown right away."
  ];
  const selectedRole = matchMode === "ai" ? playerRole : duoUserRole;
  const modeGuide =
    matchMode === "ai"
      ? [
          {
            title: "AI Duel",
            text: "You play against the computer. Pick one side: saboteur or developer."
          },
          {
            title: selectedRole === "developer" ? "Your Job" : "Your Job",
            text:
              selectedRole === "developer"
                ? "The AI breaks the flow first. You read the code and fix the bad order."
                : "You break the flow on the map. The AI tries to fix what you changed."
          },
          {
            title: "How You Win",
            text:
              selectedRole === "developer"
                ? "Put login before the protected data and remove bad shortcuts."
                : "Create a bad path that the AI cannot fully fix."
          }
        ]
      : [
          {
            title: "Local 1v1",
            text: "Two people share one device. One person starts, then passes the device."
          },
          {
            title: "Saboteur Turn",
            text: "Break the flow on the visual map by moving data early, skipping login, or dropping requests."
          },
          {
            title: "Developer Turn",
            text: "Read the code view, find what is wrong, and put the flow back in the safe order."
          }
        ];

  return (
    <CyberScreen navbar={<CyberNavbar />} showScanlines withParticles className="text-foreground">
      <ParticleBackground />

      <section className="relative overflow-hidden px-4 pb-10 pt-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_380px] lg:items-start">
            <GlassPanel className="relative overflow-hidden rounded-[28px] border border-border/40 p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(48,201,232,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(232,48,140,0.12),transparent_30%)]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  <span className="font-mono text-[10px] tracking-[0.28em] text-primary">ECHOTRACE // EASY TO LEARN</span>
                </div>
                <h1 className="mt-5 max-w-5xl font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
                  Break the picture.
                  <span className="block text-primary text-glow-cyan">Fix the code.</span>
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
                  EchoTrace is a step-by-step game. The visual map shows the system flow. The code box
                  shows the same flow as text. One side breaks it. The other side fixes it.
                </p>
              </div>
            </GlassPanel>

            <div className="rounded-[28px] border border-border/40 bg-slate-950/70 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <p className="font-mono text-[10px] tracking-[0.3em] text-primary">PICK YOUR GAME</p>
              <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-border/40 bg-background/50 px-4 py-3 text-foreground">
                  <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground">RANDOM PROBLEM POOL</p>
                  <p className="mt-2 font-display text-lg text-foreground">{echoTraceScenarios.length} DIFFERENT PROBLEMS</p>
                  <p className="mt-1 text-xs text-muted-foreground">A new problem is picked at random every time you start a round.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button onClick={() => setMatchMode("ai")} className={`rounded-2xl border px-4 py-3 text-left ${matchMode === "ai" ? "border-primary/60 bg-primary/12 text-primary" : "border-border/40 bg-background/50 text-muted-foreground"}`}>
                    <div className="flex items-center gap-2"><Bot className="h-4 w-4" /><span className="font-mono text-[10px] tracking-[0.22em]">PLAY WITH AI</span></div>
                    <p className="mt-2 text-xs leading-6">You play against the computer.</p>
                  </button>
                  <button onClick={() => setMatchMode("duo")} className={`rounded-2xl border px-4 py-3 text-left ${matchMode === "duo" ? "border-accent/60 bg-accent/12 text-accent" : "border-border/40 bg-background/50 text-muted-foreground"}`}>
                    <div className="flex items-center gap-2"><Swords className="h-4 w-4" /><span className="font-mono text-[10px] tracking-[0.22em]">LOCAL 1V1</span></div>
                    <p className="mt-2 text-xs leading-6">Two people share the same device.</p>
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button onClick={() => setQueueType("ranked")} className={`rounded-2xl border px-4 py-3 font-mono text-[10px] tracking-[0.22em] ${queueType === "ranked" ? "border-neon-yellow/50 bg-neon-yellow/10 text-neon-yellow" : "border-border/40 bg-background/50 text-muted-foreground"}`}>RANKED</button>
                  <button onClick={() => setQueueType("casual")} className={`rounded-2xl border px-4 py-3 font-mono text-[10px] tracking-[0.22em] ${queueType === "casual" ? "border-border/60 bg-white/5 text-foreground" : "border-border/40 bg-background/50 text-muted-foreground"}`}>CASUAL</button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => (matchMode === "ai" ? setPlayerRole("developer") : setDuoUserRole("developer"))}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      (matchMode === "ai" ? playerRole : duoUserRole) === "developer"
                        ? "border-primary/60 bg-primary/12 text-primary"
                        : "border-border/40 bg-background/50 text-muted-foreground"
                    }`}
                  >
                    <p className="font-mono text-[10px] tracking-[0.22em]">
                      {matchMode === "ai" ? "PLAY DEVELOPER" : "I AM DEVELOPER"}
                    </p>
                    <p className="mt-2 text-xs leading-6">
                      {matchMode === "ai"
                        ? "You will fix the broken flow after the AI makes a mess."
                        : "Your account gets the developer result in local 1v1."}
                    </p>
                  </button>
                  <button
                    onClick={() => (matchMode === "ai" ? setPlayerRole("saboteur") : setDuoUserRole("saboteur"))}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      (matchMode === "ai" ? playerRole : duoUserRole) === "saboteur"
                        ? "border-accent/60 bg-accent/12 text-accent"
                        : "border-border/40 bg-background/50 text-muted-foreground"
                    }`}
                  >
                    <p className="font-mono text-[10px] tracking-[0.22em]">
                      {matchMode === "ai" ? "PLAY SABOTEUR" : "I AM SABOTEUR"}
                    </p>
                    <p className="mt-2 text-xs leading-6">
                      {matchMode === "ai"
                        ? "You will break the flow on the map and the AI will try to fix it."
                        : "Your account gets the saboteur result in local 1v1."}
                    </p>
                  </button>
                </div>
                <button onClick={startMatch} className="w-full rounded-2xl border border-primary/50 bg-primary/10 px-5 py-4 font-mono text-xs tracking-[0.22em] text-primary transition hover:bg-primary/20">START ROUND</button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {howToPlay.map((step) => <div key={step} className="rounded-[24px] border border-border/30 bg-slate-950/55 p-5"><p className="text-sm leading-7 text-muted-foreground">{step}</p></div>)}
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 lg:grid-cols-3">
            {modeGuide.map((item) => (
              <div key={item.title} className="rounded-[24px] border border-border/30 bg-slate-950/55 p-5">
                <p className="font-mono text-[10px] tracking-[0.22em] text-primary">{item.title.toUpperCase()}</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-[28px] border border-border/40 bg-slate-950/60 p-6">
            <div className="flex items-center gap-2 text-primary"><Workflow className="h-4 w-4" /><p className="font-mono text-[10px] tracking-[0.3em]">CURRENT PROBLEM</p></div>
            <h2 className="mt-4 font-display text-2xl text-foreground">{scenario.title}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{scenario.summary}</p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{scenario.stakes}</p>
          </div>
          <div className="rounded-[28px] border border-border/40 bg-slate-950/60 p-6">
            <p className="font-mono text-[10px] tracking-[0.3em] text-neon-yellow">PLAYER STATE</p>
            <div className="mt-4 space-y-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-3"><UserCircle2 className="h-5 w-5 text-primary" /><span>{user?.handle ?? "Operator"} // ELO {user?.stats.elo ?? 600}</span></div>
              <div>Mode: {matchMode === "ai" ? "Play with AI" : "Local 1v1"}</div>
              <div>Your side: {matchMode === "ai" ? playerRole : duoUserRole}</div>
              <div>Scored as: {matchMode === "ai" ? playerRole : duoUserRole}</div>
              <div>Round step: {phase.toUpperCase()}</div>
            </div>
          </div>
        </div>
      </section>

      <section ref={gameSectionRef} className="relative px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {phase === "lobby" ? <div className="rounded-[32px] border border-border/40 bg-slate-950/65 p-8 text-center"><p className="font-mono text-[10px] tracking-[0.28em] text-primary">BEFORE YOU START</p><h2 className="mt-4 font-display text-3xl text-foreground">First look at the map, then start the round.</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">You can already see the system map below. The boxes show the flow. The code box lower on the page shows the same thing as text.</p></div> : null}

          {phase === "lobby" ? (
            <div className="space-y-6">
              <SaboteurCanvas
                scenario={scenario}
                nodes={snapshot.nodes}
                edges={snapshot.edges}
                analysis={analysis}
                onApplyAction={() => {}}
                onNodesChange={undefined}
                onEdgesChange={undefined}
                onReset={() => {}}
                disabled
              />
            </div>
          ) : null}

          {phase === "sabotage" ? <div className="space-y-6"><SaboteurCanvas scenario={scenario} nodes={snapshot.nodes} edges={snapshot.edges} analysis={analysis} onApplyAction={applyAction} onNodesChange={handleCanvasNodesChange} onEdgesChange={handleCanvasEdgesChange} onReset={() => { const nextSnapshot = createStarterGraph(scenario); setSnapshot(nextSnapshot); setActions([]); }} /><div className="flex flex-wrap gap-3"><button onClick={() => void handleLockSabotage()} disabled={actions.length === 0 || submitMutation.isPending} className="rounded-2xl border border-accent/40 bg-accent/10 px-5 py-3 font-mono text-xs tracking-[0.22em] text-accent transition hover:bg-accent/20 disabled:opacity-60">I AM DONE BREAKING THE FLOW</button><button onClick={resetRound} className="rounded-2xl border border-border/40 bg-background/50 px-5 py-3 font-mono text-xs tracking-[0.22em] text-muted-foreground transition hover:text-foreground">RETURN TO LOBBY</button></div></div> : null}

          {phase === "handoff" ? <div className="rounded-[32px] border border-border/40 bg-slate-950/65 p-8 text-center"><p className="font-mono text-[10px] tracking-[0.28em] text-neon-yellow">PASS THE DEVICE</p><h2 className="mt-4 font-display text-3xl text-foreground">The saboteur turn is over. Now the developer fixes it.</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">The next player should read the code view and make the flow safe again. They do not need to touch the map.</p><button onClick={() => setPhase("repair")} className="mt-6 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-3 font-mono text-xs tracking-[0.22em] text-primary transition hover:bg-primary/20">START FIXING</button></div> : null}

          {phase === "repair" ? <DeveloperEditor scenario={scenario} code={developerCode} onCodeChange={setDeveloperCode} evaluation={evaluation} sourceAnalysis={analysis} aiGuidance={aiGuidance} deployLabel={deployLabel} timeLeft={timeLeft} onDeploy={() => void handleDeployFix()} /> : null}

          {phase === "results" && result ? (
            <div className="rounded-[32px] border border-border/40 bg-slate-950/70 p-8">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.28em] text-neon-green">WINNER // {result.winnerLabel}</p>
                  <h2 className="mt-4 font-display text-4xl text-foreground">{result.response.match.headline}</h2>
                  {matchMode === "duo" ? (
                    <div className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-neon-yellow/30 bg-neon-yellow/10 px-5 py-3">
                      <Trophy className="h-5 w-5 text-neon-yellow" />
                      <div>
                        <p className="font-mono text-[10px] tracking-[0.22em] text-neon-yellow">
                          LOCAL 1V1 WINNER
                        </p>
                        <p className="mt-1 text-sm text-foreground">{result.winnerLabel} takes the round trophy.</p>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-right"><p className="font-mono text-[10px] tracking-[0.22em] text-primary">OVERALL</p><p className="mt-2 font-display text-5xl text-primary">{result.response.scores.overall}</p></div>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border/30 bg-background/40 p-4"><p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground">DEVELOPER SCORE</p><p className="mt-3 font-display text-3xl text-foreground">{result.developerScore}</p></div>
                <div className="rounded-2xl border border-border/30 bg-background/40 p-4"><p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground">SABOTEUR SCORE</p><p className="mt-3 font-display text-3xl text-foreground">{result.saboteurScore}</p></div>
                <div className="rounded-2xl border border-border/30 bg-background/40 p-4"><p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground">YOUR ELO CHANGE</p><p className="mt-3 font-display text-3xl text-primary">{result.response.rankedUpdate.eloChange >= 0 ? "+" : ""}{result.response.rankedUpdate.eloChange}</p></div>
                <div className="rounded-2xl border border-border/30 bg-background/40 p-4"><p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground">CURRENT LEAGUE</p><p className="mt-3 font-display text-3xl text-neon-yellow">{result.response.rankedUpdate.league}</p></div>
              </div>
              <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-[28px] border border-border/30 bg-background/40 p-5">
                  <p className="font-mono text-[10px] tracking-[0.24em] text-primary">
                    ROUND CONCLUSION
                  </p>
                  <div className="mt-4 space-y-3">
                    {result.conclusionSteps.map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-border/20 bg-background/40 px-4 py-3 text-sm leading-7 text-muted-foreground"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                  <p className="font-mono text-[10px] tracking-[0.24em] text-neon-yellow">
                    AI RECOVERY
                  </p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {result.winnerLabel === "AI DEFENDER"
                      ? "The AI restored the flow and the steps used are listed here."
                      : matchMode === "ai" && playerRole === "saboteur"
                        ? "The AI was not able to recover the original safe state."
                        : "This result reflects the final fix outcome for the round."}
                  </p>
                </div>
              </div>
              <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="rounded-[28px] border border-primary/20 bg-primary/5 p-5"><div className="flex items-center gap-2 text-primary"><Trophy className="h-4 w-4" /><p className="font-mono text-[10px] tracking-[0.24em]">LEADERBOARD IMPACT</p></div><p className="mt-3 text-sm leading-7 text-muted-foreground">Previous ELO {result.response.rankedUpdate.previousElo} {"->"} Current ELO {result.response.rankedUpdate.nextElo}. Leaderboard and profile queries refresh after this submission.</p></div>
                <div className="rounded-[28px] border border-white/10 bg-white/5 p-5"><p className="font-mono text-[10px] tracking-[0.24em] text-neon-yellow">ROUND READOUT</p><div className="mt-3 space-y-2 text-sm text-muted-foreground"><p>Pressure: {result.response.scores.breakdown.pressure}</p><p>Resilience: {result.response.scores.breakdown.resilience}</p><p>Security: {result.response.scores.breakdown.security}</p></div></div>
              </div>
              <div className="mt-8 flex flex-wrap gap-3"><button onClick={resetRound} className="inline-flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-5 py-3 font-mono text-xs tracking-[0.22em] text-primary transition hover:bg-primary/20"><RefreshCcw className="h-4 w-4" />PLAY AGAIN</button><Link to={appRoutes.leaderboard} className="inline-flex items-center gap-2 rounded-2xl border border-border/40 bg-background/50 px-5 py-3 font-mono text-xs tracking-[0.22em] text-foreground transition hover:border-primary/30 hover:text-primary">VIEW LEADERBOARD<ArrowRight className="h-4 w-4" /></Link></div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="relative px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[28px] border border-border/40 bg-slate-950/60 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <div className="flex items-center gap-2 text-primary"><Code2 className="h-4 w-4" /><p className="font-mono text-[10px] tracking-[0.3em]">GENERATED RUNTIME SNAPSHOT</p></div>
            <pre className="mt-5 overflow-x-auto rounded-2xl border border-border/30 bg-background/70 p-5 font-mono text-xs leading-6 text-slate-200"><code>{generatedCode}</code></pre>
          </div>
          <div className="space-y-6">
            <div className="rounded-[28px] border border-border/40 bg-slate-950/60 p-6"><p className="font-mono text-[10px] tracking-[0.3em] text-accent">WHY THIS MVP WORKS</p><div className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground"><p>Real round loop: setup, sabotage, repair, winner, score, and ELO update.</p><p>Cleaner React Flow canvas with explicit sabotage actions and route feedback.</p><p>AI duel or local 1v1 with the winner shown every round.</p></div></div>
            <div className="rounded-[28px] border border-border/40 bg-slate-950/60 p-6"><p className="font-mono text-[10px] tracking-[0.3em] text-neon-yellow">LIVE ANALYSIS</p><div className="mt-5 space-y-3">{(analysis.findings.length > 0 ? analysis.findings : ["Pipeline is currently secure. Start a round or add sabotage to create a playable incident."]).map((item) => <div key={item} className="rounded-2xl border border-border/30 bg-background/50 p-4 text-sm leading-7 text-muted-foreground">{item}</div>)}</div></div>
          </div>
        </div>
      </section>
    </CyberScreen>
  );
}

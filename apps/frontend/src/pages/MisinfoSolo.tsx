import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Eye,
  MessageSquare,
  Network,
  ScanSearch,
  Send,
  ShieldCheck,
  Sparkles,
  Waves
} from "lucide-react";
import CyberNavbar from "@/components/CyberNavbar";
import ArenaTimer from "@/components/ArenaTimer";
import GlassPanel from "@/components/GlassPanel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/auth-context";
import {
  actOnSoloNode,
  createSoloSession,
  inspectSoloNode,
  type MisinfoReviewItem,
  submitSoloSession,
  tickSoloSession,
  type InspectedNode,
  type MisinfoResult,
  type MisinfoSession,
  type SimEdge,
  type SimNode
} from "@/features/misinfo-sim/misinfo-sim-api";
import { fetchSoloMisinfoChat } from "@/features/ai/ai-api";

const statusColors: Record<SimNode["status"], string> = {
  susceptible: "#30C9E8",
  infected: "#E8308C",
  recovered: "#30E849",
  flagged: "#F5C451"
};

function formatSignals(content: InspectedNode["content"]) {
  return content?.manipulationSignals.join(" • ") ?? "No signals available";
}

const SoloNetworkGraph = ({
  nodes,
  edges,
  selectedNodeId,
  onNodeClick
}: {
  nodes: SimNode[];
  edges: SimEdge[];
  selectedNodeId: number | null;
  onNodeClick: (node: SimNode) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);

    const scaleX = rect.width / 800;
    const scaleY = rect.height / 620;

    edges.forEach((edge) => {
      const source = nodes.find((node) => node.id === edge.source);
      const target = nodes.find((node) => node.id === edge.target);

      if (!source || !target) {
        return;
      }

      context.beginPath();
      context.moveTo(source.x * scaleX, source.y * scaleY);
      context.lineTo(target.x * scaleX, target.y * scaleY);
      context.strokeStyle =
        source.status === "infected" || target.status === "infected"
          ? "hsla(333, 82%, 55%, 0.20)"
          : "hsla(193, 78%, 55%, 0.12)";
      context.lineWidth = 1;
      context.stroke();
    });

    nodes.forEach((node) => {
      const x = node.x * scaleX;
      const y = node.y * scaleY;
      const radius = selectedNodeId === node.id ? 11 : hoveredNode === node.id ? 9 : 7;
      const color = statusColors[node.status];

      if (node.status === "infected") {
        const gradient = context.createRadialGradient(x, y, 0, x, y, 30);
        gradient.addColorStop(0, "hsla(333, 82%, 55%, 0.35)");
        gradient.addColorStop(1, "hsla(333, 82%, 55%, 0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, 30, 0, Math.PI * 2);
        context.fill();
      }

      context.fillStyle = color;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();

      if (node.status === "flagged") {
        context.strokeStyle = "#F5C451";
        context.lineWidth = 2;
        context.beginPath();
        context.arc(x, y, radius + 5, 0, Math.PI * 2);
        context.stroke();
      }

      if (selectedNodeId === node.id) {
        context.strokeStyle = "#ffffff";
        context.lineWidth = 2;
        context.setLineDash([4, 3]);
        context.beginPath();
        context.arc(x, y, radius + 8, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]);
      }

      if (hoveredNode === node.id) {
        context.fillStyle = "#ffffff";
        context.font = "11px JetBrains Mono";
        context.textAlign = "center";
        context.fillText(node.label, x, y - 16);
      }
    });
  }, [edges, hoveredNode, nodes, selectedNodeId]);

  function locateNode(clientX: number, clientY: number) {
    const container = containerRef.current;
    if (!container) {
      return null;
    }

    const rect = container.getBoundingClientRect();
    const scaleX = rect.width / 800;
    const scaleY = rect.height / 620;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    return nodes.find((node) => {
      const dx = node.x * scaleX - x;
      const dy = node.y * scaleY - y;
      return Math.sqrt(dx * dx + dy * dy) < 14;
    }) ?? null;
  }

  return (
    <div ref={containerRef} className="relative h-[560px] rounded-2xl overflow-hidden bg-background/60">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair"
        onMouseMove={(event) => {
          const node = locateNode(event.clientX, event.clientY);
          setHoveredNode(node?.id ?? null);
        }}
        onClick={(event) => {
          const node = locateNode(event.clientX, event.clientY);
          if (node) {
            onNodeClick(node);
          }
        }}
      />
    </div>
  );
};

const MisinfoSolo = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<MisinfoSession | null>(null);
  const [result, setResult] = useState<MisinfoResult | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [inspected, setInspected] = useState<InspectedNode | null>(null);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [chatbotQuestion, setChatbotQuestion] = useState("");
  const [chatbotTranscript, setChatbotTranscript] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [actionError, setActionError] = useState("");
  const [mode, setMode] = useState<"briefing" | "playing" | "results">("briefing");
  const [selectedReviewItem, setSelectedReviewItem] = useState<MisinfoReviewItem | null>(null);

  const startMutation = useMutation({
    mutationFn: () => createSoloSession(token!),
    onSuccess: (data) => {
      setSession(data.session);
      setResult(null);
      setSelectedNodeId(null);
      setInspected(null);
      setChatbotOpen(false);
      setChatbotQuestion("");
      setChatbotTranscript([]);
      setActionError("");
      setSelectedReviewItem(null);
      setMode("playing");
    }
  });

  const tickMutation = useMutation({
    mutationFn: (sessionId: string) => tickSoloSession(token!, sessionId),
    onSuccess: (data) => {
      setSession(data.session);
      setResult(data.result);

      if (data.session.timeLeft === 0 || data.result.panicLevel > 40) {
        setMode("results");
      }
    }
  });

  const inspectMutation = useMutation({
    mutationFn: ({ sessionId, nodeId }: { sessionId: string; nodeId: number }) =>
      inspectSoloNode(token!, sessionId, nodeId),
    onSuccess: (data) => {
      setInspected(data.inspected);
      setChatbotOpen(false);
      setChatbotQuestion("");
      setChatbotTranscript([]);
      setActionError("");
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Unable to inspect node.");
    }
  });

  const actionMutation = useMutation({
    mutationFn: ({
      sessionId,
      nodeId,
      action
    }: {
      sessionId: string;
      nodeId: number;
      action: "investigate" | "fact-check" | "quarantine";
    }) => actOnSoloNode(token!, sessionId, { nodeId, action }),
    onSuccess: (data) => {
      setSession(data.session);
      setInspected(data.inspected);
      setResult(data.result);
      setChatbotOpen(false);
      setChatbotQuestion("");
      setChatbotTranscript([]);
      setActionError("");

      if (data.session.timeLeft === 0 || data.result.panicLevel > 40) {
        setMode("results");
      }
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Unable to perform action.");
    }
  });

  const submitMutation = useMutation({
    mutationFn: (sessionId: string) => submitSoloSession(token!, sessionId),
    onSuccess: (data) => {
      setSession(data.session);
      setResult(data.result);
      setMode("results");
      setActionError("");
      void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Unable to submit simulation.");
    }
  });

  const chatbotMutation = useMutation({
    mutationFn: ({
      sessionId,
      nodeId,
      question
    }: {
      sessionId: string;
      nodeId: number;
      question: string;
    }) => fetchSoloMisinfoChat(token!, { sessionId, nodeId, question }),
    onSuccess: (data, variables) => {
      setSession(data.session);
      setInspected(data.inspected);
      setChatbotTranscript((current) => [
        ...current,
        { role: "user", text: variables.question },
        { role: "assistant", text: data.response }
      ]);
      setChatbotQuestion("");
      setActionError("");
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Unable to generate chatbot response.");
    }
  });

  useEffect(() => {
    if (!session || mode !== "playing" || tickMutation.isPending) {
      return;
    }

    const interval = window.setInterval(() => {
      void tickMutation.mutateAsync(session.sessionId);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [mode, session, tickMutation]);

  const selectedNode = useMemo(
    () => session?.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [selectedNodeId, session?.nodes]
  );

  function applyOptimisticSoloAction(action: "investigate" | "fact-check" | "quarantine") {
    if (!session || selectedNodeId === null) {
      return;
    }

    setSession({
      ...session,
      nodes: session.nodes.map((node) => {
        if (node.id !== selectedNodeId) {
          return node;
        }

        if (action === "fact-check" && node.status === "infected") {
          return { ...node, status: "flagged" as const };
        }

        if (action === "quarantine") {
          return { ...node, status: "recovered" as const };
        }

        return node;
      })
    });
  }

  const infected = session?.nodes.filter((node) => node.status === "infected").length ?? 0;
  const recovered = session?.nodes.filter((node) => node.status === "recovered").length ?? 0;
  const flagged = session?.nodes.filter((node) => node.status === "flagged").length ?? 0;

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <CyberNavbar />
      <div className="pt-20 pb-12 px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-secondary">// SOLO MISINFO SIM</p>
            <h1 className="font-display text-4xl mt-2">
              CONTAIN THE <span className="text-secondary text-glow-purple">SIGNAL STORM</span>
            </h1>
          </div>
          {session ? (
            <div className="flex items-center gap-6">
              <ArenaTimer timeLeft={session.timeLeft} totalTime={180} />
            </div>
          ) : null}
        </div>

        {mode === "briefing" ? (
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <GlassPanel className="p-6">
              <p className="font-mono text-xs tracking-[0.24em] text-secondary">OPERATION BRIEF</p>
              <h2 className="mt-3 font-display text-3xl text-foreground">Solo containment mission</h2>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                A misinformation wave is spreading through a synthetic social graph. Investigate nodes, deploy fact-checks,
                and quarantine high-risk clusters before panic rises beyond the critical threshold.
              </p>

              <div className="grid md:grid-cols-3 gap-4 mt-8">
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <Eye className="w-5 h-5 text-primary" />
                  <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-primary">INVESTIGATE</p>
                  <p className="mt-2 text-xs text-muted-foreground">Inspect a node’s content, evidence, and manipulation signals.</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <ScanSearch className="w-5 h-5 text-neon-yellow" />
                  <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-neon-yellow">FACT-CHECK</p>
                  <p className="mt-2 text-xs text-muted-foreground">Flag infected nodes and weaken their ability to spread.</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <ShieldCheck className="w-5 h-5 text-neon-green" />
                  <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-neon-green">QUARANTINE</p>
                  <p className="mt-2 text-xs text-muted-foreground">Recover a node completely when the outbreak becomes too intense.</p>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className="p-6">
              <p className="font-mono text-xs tracking-[0.24em] text-accent">JUDGE-MAGNET TOOLS</p>
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-accent">NODE CHATBOT</p>
                  <p className="mt-2 text-xs text-muted-foreground">Each solo run gives you five question opportunities tied to the selected node’s article.</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <Waves className="w-5 h-5 text-primary" />
                  <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-primary">PANIC HUD</p>
                  <p className="mt-2 text-xs text-muted-foreground">Panic rises with weighted infected reach, not just raw node count.</p>
                </div>
                <div className="rounded-xl border border-neon-yellow/20 bg-neon-yellow/5 p-4">
                  <AlertTriangle className="w-5 h-5 text-neon-yellow" />
                  <p className="mt-3 text-xs text-muted-foreground">
                    Every 15 seconds the network advances automatically. If panic rises above 40%, the mission is lost immediately.
                  </p>
                </div>
              </div>

              <button
                onClick={() => void startMutation.mutateAsync()}
                disabled={startMutation.isPending}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-3 font-mono text-xs tracking-[0.2em] text-secondary-foreground transition-all hover:brightness-110 disabled:opacity-70"
              >
                <Network className="w-4 h-4" />
                {startMutation.isPending ? "INITIALIZING..." : "START SOLO SIMULATION"}
              </button>
            </GlassPanel>
          </div>
        ) : null}

        {mode === "playing" && session ? (
          <div className="grid xl:grid-cols-[1fr_360px] gap-6">
            <GlassPanel className="p-4">
              <div className="grid md:grid-cols-5 gap-4 mb-4">
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">PANIC</p>
                  <p className={`mt-2 font-display text-3xl ${session.panicLevel < 35 ? "text-neon-green" : session.panicLevel < 65 ? "text-neon-yellow" : "text-accent"}`}>
                    {session.panicLevel}%
                  </p>
                </div>
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">INFECTED</p>
                  <p className="mt-2 font-display text-3xl text-accent">{infected}</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">RECOVERED</p>
                  <p className="mt-2 font-display text-3xl text-neon-green">{recovered}</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">FLAGGED</p>
                  <p className="mt-2 font-display text-3xl text-neon-yellow">{flagged}</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">CHATBOT</p>
                  <p className="mt-2 font-display text-3xl text-primary">
                    {session.chatbotQuestionsUsed}/{session.chatbotQuestionLimit}
                  </p>
                </div>
              </div>

              <SoloNetworkGraph
                nodes={session.nodes}
                edges={session.edges}
                selectedNodeId={selectedNodeId}
                onNodeClick={(node) => {
                  setSelectedNodeId(node.id);
                  void inspectMutation.mutateAsync({ sessionId: session.sessionId, nodeId: node.id });
                }}
              />
            </GlassPanel>

            <div className="space-y-6">
              <GlassPanel className="p-6">
                <p className="font-mono text-xs tracking-[0.24em] text-primary">NODE INTEL</p>
                {selectedNode ? (
                  <>
                    <h2 className="mt-3 font-display text-2xl text-foreground">{selectedNode.label}</h2>
                    <p className="mt-2 font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
                      FOLLOWERS {selectedNode.followers.toLocaleString()} • CREDIBILITY {selectedNode.credibility}
                    </p>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Status: <span className="text-foreground uppercase">{selectedNode.status}</span>
                    </p>
                    {selectedNode.resolvedByAction ? (
                      <p className="mt-2 font-mono text-[10px] tracking-[0.16em] text-neon-yellow">
                        NODE LOCKED BY {selectedNode.resolvedByAction.toUpperCase()}
                      </p>
                    ) : null}

                    {inspected?.content ? (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                          <p className="font-mono text-[10px] tracking-[0.2em] text-accent">CONTENT</p>
                          <p className="mt-2 text-sm text-foreground">{inspected.content.headline}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Source: {inspected.content.source}</p>
                          <p className="mt-3 text-xs leading-6 text-muted-foreground">{inspected.content.content}</p>
                        </div>
                        <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                          <p className="font-mono text-[10px] tracking-[0.2em] text-neon-yellow">MANIPULATION SIGNALS</p>
                          <p className="mt-2 text-xs text-muted-foreground">{formatSignals(inspected.content)}</p>
                        </div>
                        <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                          <p className="font-mono text-[10px] tracking-[0.2em] text-primary">SOURCE PROFILE</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {inspected.content.sourceType} • {inspected.content.category} • Credibility {inspected.content.credibilityScore} • Risk {inspected.content.riskLevel}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                          <p className="font-mono text-[10px] tracking-[0.2em] text-foreground">EVIDENCE</p>
                          <p className="mt-2 text-xs text-muted-foreground">{inspected.content.evidence}</p>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-6 grid gap-3">
                      <button
                        onClick={() => void submitMutation.mutateAsync(session.sessionId)}
                        disabled={submitMutation.isPending}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-3 font-mono text-xs tracking-[0.18em] text-secondary-foreground transition-all hover:brightness-110 disabled:opacity-70"
                      >
                        <Network className="w-4 h-4" />
                        {submitMutation.isPending ? "SUBMITTING..." : "SUBMIT CONTAINMENT"}
                      </button>
                      <button
                        onClick={() => setChatbotOpen((current) => !current)}
                        disabled={session.chatbotQuestionsUsed >= session.chatbotQuestionLimit}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-secondary/40 bg-secondary/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-secondary transition-colors hover:bg-secondary/20 disabled:opacity-70"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {session.chatbotQuestionsUsed >= session.chatbotQuestionLimit ? "CHATBOT LIMIT REACHED" : "OPEN NODE CHATBOT"}
                      </button>
                      <button
                        onClick={() =>
                          {
                            applyOptimisticSoloAction("investigate");
                            void actionMutation.mutateAsync({
                              sessionId: session.sessionId,
                              nodeId: selectedNode.id,
                              action: "investigate"
                            });
                          }
                        }
                        disabled={actionMutation.isPending}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-primary transition-colors hover:bg-primary/20 disabled:opacity-70"
                      >
                        <Eye className="w-4 h-4" />
                        INVESTIGATE
                      </button>
                      <button
                        onClick={() =>
                          {
                            applyOptimisticSoloAction("fact-check");
                            void actionMutation.mutateAsync({
                              sessionId: session.sessionId,
                              nodeId: selectedNode.id,
                              action: "fact-check"
                            });
                          }
                        }
                        disabled={actionMutation.isPending || Boolean(selectedNode.resolvedByAction)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-neon-yellow/40 bg-neon-yellow/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-neon-yellow transition-colors hover:bg-neon-yellow/20 disabled:opacity-70"
                      >
                        <ScanSearch className="w-4 h-4" />
                        FACT-CHECK
                      </button>
                      <button
                        onClick={() =>
                          {
                            applyOptimisticSoloAction("quarantine");
                            void actionMutation.mutateAsync({
                              sessionId: session.sessionId,
                              nodeId: selectedNode.id,
                              action: "quarantine"
                            });
                          }
                        }
                        disabled={actionMutation.isPending || Boolean(selectedNode.resolvedByAction)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-neon-green/40 bg-neon-green/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-neon-green transition-colors hover:bg-neon-green/20 disabled:opacity-70"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        QUARANTINE
                      </button>
                    </div>

                    {actionError ? (
                      <div className="mt-4 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-accent">
                        {actionError}
                      </div>
                    ) : null}

                    {chatbotOpen ? (
                      <div className="mt-6 rounded-xl border border-secondary/20 bg-secondary/5 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-mono text-[10px] tracking-[0.2em] text-secondary">NODE CHATBOT</p>
                          <span className="font-mono text-[10px] text-neon-yellow">
                            {session.chatbotQuestionsUsed}/{session.chatbotQuestionLimit} USED
                          </span>
                        </div>
                        <div className="mt-4 max-h-64 space-y-3 overflow-auto pr-1">
                          {chatbotTranscript.length > 0 ? (
                            chatbotTranscript.map((entry, index) => (
                              <div
                                key={`${entry.role}-${index}`}
                                className={`rounded-lg px-3 py-3 text-xs leading-6 ${
                                  entry.role === "user"
                                    ? "border border-primary/20 bg-primary/10 text-foreground"
                                    : "border border-secondary/20 bg-background/40 text-muted-foreground"
                                }`}
                              >
                                <p className="mb-1 font-mono text-[10px] tracking-[0.18em]">
                                  {entry.role === "user" ? "YOU" : "CHATBOT"}
                                </p>
                                <p>{entry.text}</p>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-lg border border-border/20 bg-background/30 px-3 py-3 text-xs text-muted-foreground">
                              Ask about suspicious wording, credibility, missing evidence, source quality, or what should be verified next.
                            </div>
                          )}
                        </div>
                        <div className="mt-4 flex gap-3">
                          <input
                            value={chatbotQuestion}
                            onChange={(event) => setChatbotQuestion(event.target.value)}
                            placeholder="Ask about this node's news..."
                            className="w-full rounded-lg border border-border/30 bg-surface-1/40 px-4 py-3 font-mono text-sm text-foreground focus:outline-none focus:border-secondary/50"
                          />
                          <button
                            onClick={() =>
                              void chatbotMutation.mutateAsync({
                                sessionId: session.sessionId,
                                nodeId: selectedNode.id,
                                question: chatbotQuestion.trim()
                              })
                            }
                            disabled={
                              chatbotMutation.isPending ||
                              !chatbotQuestion.trim() ||
                              session.chatbotQuestionsUsed >= session.chatbotQuestionLimit
                            }
                            className="rounded-lg border border-secondary/40 bg-secondary/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-secondary transition-colors hover:bg-secondary/20 disabled:opacity-70"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">Select a node in the network to investigate and act.</p>
                )}
              </GlassPanel>

              <GlassPanel className="p-6">
                <p className="font-mono text-xs tracking-[0.24em] text-secondary">OPERATOR FEED</p>
                <div className="mt-4 space-y-3">
                  {session.log.slice().reverse().map((entry, index) => (
                    <div key={`${entry.time}-${index}`} className="rounded-xl border border-border/30 bg-surface-1/40 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">{entry.type}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{entry.time}</span>
                      </div>
                      <p className="mt-2 text-xs text-foreground">{entry.message}</p>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            </div>
          </div>
        ) : null}

        {mode === "results" && session && result ? (
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            <GlassPanel className="p-6">
              <div
                className={`rounded-2xl border px-5 py-5 ${
                  result.contained ? "border-neon-green/30 bg-neon-green/10" : "border-accent/30 bg-accent/10"
                }`}
              >
                <p className={`font-mono text-[10px] tracking-[0.24em] ${result.contained ? "text-neon-green" : "text-accent"}`}>
                  {result.contained ? "SOLO VERDICT // CONTAINMENT SUCCESSFUL" : "SOLO VERDICT // CONTAINMENT BREACH"}
                </p>
                <h2 className="mt-3 font-display text-3xl text-foreground">
                  {result.contained ? "You stabilized the signal storm." : "The signal storm broke containment."}
                </h2>
                <p className="mt-3 text-sm text-muted-foreground">{result.summary}</p>
              </div>

              <div className="grid md:grid-cols-5 gap-4 mt-8">
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">FINAL SCORE</p>
                  <p className="mt-2 font-display text-4xl text-primary">{result.score}</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">PANIC INDEX</p>
                  <p className={`mt-2 font-display text-4xl ${result.panicLevel < 60 ? "text-neon-yellow" : "text-accent"}`}>
                    {result.panicLevel}%
                  </p>
                </div>
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">RECOVERED NODES</p>
                  <p className="mt-2 font-display text-4xl text-neon-green">{result.recovered}</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">INFECTED NODES</p>
                  <p className="mt-2 font-display text-4xl text-accent">{result.infected}</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">CHATBOT USED</p>
                  <p className="mt-2 font-display text-4xl text-secondary">
                    {result.chatbotQuestionsUsed}/{result.chatbotQuestionLimit}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-border/30 bg-surface-1/40 p-4 text-sm text-muted-foreground">
                <p className="font-mono text-[10px] tracking-[0.18em] text-primary">MISSION DEBRIEF</p>
                <p className="mt-3">
                  Your final verdict is calculated from panic control, correct containment of fake stories, and the number of credible stories you wrongly suppressed.
                </p>
              </div>

              <div className="mt-8 rounded-2xl border border-border/30 bg-surface-1/40 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.18em] text-secondary">ROUND REVIEW TABLE</p>
                    <h3 className="mt-2 font-display text-2xl text-foreground">News-by-news decision audit</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Click any row to inspect the full article evidence.</p>
                </div>

                <div className="mt-4 rounded-xl border border-border/20 bg-background/40">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>News</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Your action</TableHead>
                        <TableHead>Final status</TableHead>
                        <TableHead>Verdict</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.reviewItems.map((item) => (
                        <TableRow
                          key={item.nodeId}
                          className="cursor-pointer"
                          onClick={() => setSelectedReviewItem(item)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{item.headline}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{item.source}</p>
                            </div>
                          </TableCell>
                          <TableCell className={item.actualType === "fake" ? "text-accent" : "text-neon-green"}>
                            {item.actualType.toUpperCase()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.selectedAction === "none" ? "No action" : item.selectedAction}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{item.finalStatus}</TableCell>
                          <TableCell className={item.wasCorrect ? "text-neon-green" : "text-accent"}>
                            {item.wasCorrect ? "RIGHT" : "WRONG"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className="p-6">
              <p className="font-mono text-xs tracking-[0.24em] text-primary">NEXT RUN</p>
              <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                <p>You can now work through as many suspicious nodes as needed before submitting the round.</p>
                <p>Use investigations early to reveal which nodes are spreading synthetic or false narratives.</p>
                <p>Flagged nodes convert into recovered status on the next tick, so timing matters.</p>
                <p>Locked nodes preserve your decisions, so submit only when you are satisfied with your containment plan.</p>
              </div>

              <button
                onClick={() => void startMutation.mutateAsync()}
                disabled={startMutation.isPending}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-3 font-mono text-xs tracking-[0.2em] text-secondary-foreground transition-all hover:brightness-110 disabled:opacity-70"
              >
                <Network className="w-4 h-4" />
                RESTART SOLO SIM
              </button>
            </GlassPanel>
          </div>
        ) : null}
      </div>

      <Dialog open={Boolean(selectedReviewItem)} onOpenChange={(open) => !open && setSelectedReviewItem(null)}>
        <DialogContent className="max-w-4xl border-border/40 bg-surface-1 text-foreground">
          {selectedReviewItem ? (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8 font-display text-2xl">{selectedReviewItem.headline}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {selectedReviewItem.source} • {selectedReviewItem.sourceType} • {selectedReviewItem.category}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border/30 bg-background/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-secondary">DECISION REVIEW</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>Actual type: <span className={selectedReviewItem.actualType === "fake" ? "text-accent" : "text-neon-green"}>{selectedReviewItem.actualType.toUpperCase()}</span></p>
                    <p>Your action: <span className="text-foreground">{selectedReviewItem.selectedAction === "none" ? "No action" : selectedReviewItem.selectedAction}</span></p>
                    <p>Final status: <span className="text-foreground">{selectedReviewItem.finalStatus}</span></p>
                    <p>Verdict: <span className={selectedReviewItem.wasCorrect ? "text-neon-green" : "text-accent"}>{selectedReviewItem.wasCorrect ? "RIGHT" : "WRONG"}</span></p>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">{selectedReviewItem.explanation}</p>
                </div>

                <div className="rounded-xl border border-border/30 bg-background/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-primary">SOURCE RISK PROFILE</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>Credibility score: <span className="text-foreground">{selectedReviewItem.credibilityScore}</span></p>
                    <p>Risk level: <span className="text-foreground">{selectedReviewItem.riskLevel}</span></p>
                    <p>Node label: <span className="text-foreground">{selectedReviewItem.nodeLabel}</span></p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/30 bg-background/40 p-4">
                <p className="font-mono text-[10px] tracking-[0.18em] text-accent">ARTICLE CONTENT</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{selectedReviewItem.content}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border/30 bg-background/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-neon-yellow">EVIDENCE</p>
                  <p className="mt-3 text-sm text-muted-foreground">{selectedReviewItem.evidence}</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-background/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-primary">CLUES</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {selectedReviewItem.clues.map((clue) => (
                      <p key={clue}>{clue}</p>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-border/30 bg-background/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-secondary">MANIPULATION SIGNALS</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {selectedReviewItem.manipulationSignals.map((signal) => (
                      <p key={signal}>{signal}</p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/30 bg-background/40 p-4">
                <p className="font-mono text-[10px] tracking-[0.18em] text-secondary">WHY THIS ITEM WAS CLASSIFIED THIS WAY</p>
                <p className="mt-3 text-sm text-muted-foreground">{selectedReviewItem.reasoningSummary}</p>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MisinfoSolo;

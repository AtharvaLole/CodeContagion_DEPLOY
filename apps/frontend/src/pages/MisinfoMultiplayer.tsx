import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Network,
  Play,
  Search,
  Send,
  ShieldCheck,
  Users
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
  actOnMultiplayerNode,
  createMultiplayerRoom,
  fetchMultiplayerRoom,
  getMisinfoSocket,
  inspectMultiplayerNode,
  joinMultiplayerRoom,
  sendMultiplayerChat,
  startMultiplayerRoom,
  submitMultiplayerRoom,
  tickMultiplayerRoom,
  type MultiplayerRoom
} from "@/features/misinfo-sim/misinfo-multiplayer-api";
import type {
  InspectedNode,
  MisinfoResult,
  MisinfoReviewItem,
  SimEdge,
  SimNode
} from "@/features/misinfo-sim/misinfo-sim-api";
import { fetchRoomMisinfoChat } from "@/features/ai/ai-api";

const statusColors: Record<SimNode["status"], string> = {
  susceptible: "#30C9E8",
  infected: "#E8308C",
  recovered: "#30E849",
  flagged: "#F5C451"
};

const SharedNetworkGraph = ({
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
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);

  return (
    <div className="relative h-[520px] rounded-2xl overflow-hidden bg-background/60 border border-border/30">
      <svg viewBox="0 0 800 620" className="h-full w-full">
        {edges.map((edge, index) => {
          const source = nodes.find((node) => node.id === edge.source);
          const target = nodes.find((node) => node.id === edge.target);

          if (!source || !target) {
            return null;
          }

          const highlighted = source.status === "infected" || target.status === "infected";

          return (
            <line
              key={`${edge.source}-${edge.target}-${index}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={highlighted ? "rgba(232,48,140,0.22)" : "rgba(48,201,232,0.12)"}
              strokeWidth="1.2"
            />
          );
        })}

        {nodes.map((node) => {
          const radius = selectedNodeId === node.id ? 14 : hoveredNodeId === node.id ? 11 : 8;
          return (
            <g
              key={node.id}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onClick={() => onNodeClick(node)}
              className="cursor-pointer"
            >
              {node.status === "infected" ? (
                <circle cx={node.x} cy={node.y} r="24" fill="rgba(232,48,140,0.16)" />
              ) : null}
              <circle cx={node.x} cy={node.y} r={radius} fill={statusColors[node.status]} />
              {node.status === "flagged" ? (
                <circle cx={node.x} cy={node.y} r={radius + 5} fill="none" stroke="#F5C451" strokeWidth="2" />
              ) : null}
              {selectedNodeId === node.id ? (
                <circle cx={node.x} cy={node.y} r={radius + 9} fill="none" stroke="#ffffff" strokeDasharray="4 3" strokeWidth="2" />
              ) : null}
              {hoveredNodeId === node.id ? (
                <text x={node.x} y={node.y - 18} textAnchor="middle" fill="#ffffff" fontSize="11" fontFamily="JetBrains Mono">
                  {node.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const MisinfoMultiplayer = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [room, setRoom] = useState<MultiplayerRoom | null>(null);
  const [result, setResult] = useState<MisinfoResult | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [inspected, setInspected] = useState<InspectedNode | null>(null);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [chatbotQuestion, setChatbotQuestion] = useState("");
  const [chatbotTranscript, setChatbotTranscript] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [joinCode, setJoinCode] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isRefreshingRoom, setIsRefreshingRoom] = useState(false);
  const [displayTimeLeft, setDisplayTimeLeft] = useState<number | null>(null);
  const [selectedReviewItem, setSelectedReviewItem] = useState<MisinfoReviewItem | null>(null);

  useEffect(() => {
    if (!room) {
      return;
    }

    const socket = getMisinfoSocket();
    socket.emit("misinfo:join-room", room.roomCode);

    const handleRoomUpdate = (snapshot: { room: MultiplayerRoom; result: MisinfoResult | null }) => {
      setRoom(snapshot.room);
      setResult(snapshot.result);
    };

    socket.on("misinfo:room-update", handleRoomUpdate);

    const interval = window.setInterval(async () => {
      if (isRefreshingRoom) {
        return;
      }

      setIsRefreshingRoom(true);
      const latest = await fetchMultiplayerRoom(token!, room.roomCode);
      setRoom(latest.room);
      setResult(latest.result);
      setIsRefreshingRoom(false);
    }, 1200);

    return () => {
      window.clearInterval(interval);
      socket.off("misinfo:room-update", handleRoomUpdate);
      socket.emit("misinfo:leave-room", room.roomCode);
    };
  }, [isRefreshingRoom, room, token]);

  useEffect(() => {
    if (!room || room.status !== "playing") {
      return;
    }

    const interval = window.setInterval(async () => {
      if (room.hostUserId !== user?.id) {
        return;
      }

      const next = await tickMultiplayerRoom(token!, room.roomCode);
      setRoom(next.room);
      setResult(next.result);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [room, token, user?.id]);

  useEffect(() => {
    const nextTime = room?.session?.timeLeft ?? null;
    setDisplayTimeLeft(nextTime);
  }, [room?.session?.timeLeft]);

  useEffect(() => {
    if (!room?.session || room.status !== "playing") {
      return;
    }

    const interval = window.setInterval(() => {
      setDisplayTimeLeft((current) => {
        if (current === null) {
          return room.session?.timeLeft ?? null;
        }

        return Math.max(0, current - 1);
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [room?.session, room?.status]);

  const selectedNode = useMemo(
    () => room?.session?.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [room?.session?.nodes, selectedNodeId]
  );

  const isHost = room?.hostUserId === user?.id;

  const inspectMutation = useMutation({
    mutationFn: ({ roomCode, nodeId }: { roomCode: string; nodeId: number }) =>
      inspectMultiplayerNode(token!, roomCode, nodeId),
    onSuccess: (response) => {
      setInspected(response.inspected);
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
      roomCode,
      nodeId,
      action
    }: {
      roomCode: string;
      nodeId: number;
      action: "investigate" | "fact-check" | "quarantine";
    }) =>
      actOnMultiplayerNode(token!, {
        roomCode,
        nodeId,
        action
      }),
    onSuccess: (response) => {
      setRoom(response.room);
      setResult(response.result);
      setInspected(response.inspected);
      setChatbotOpen(false);
      setChatbotQuestion("");
      setChatbotTranscript([]);
      setActionError("");
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Unable to perform action.");
    }
  });

  const submitMutation = useMutation({
    mutationFn: (roomCode: string) => submitMultiplayerRoom(token!, roomCode),
    onSuccess: (response) => {
      setRoom(response.room);
      setResult(response.result);
      setActionError("");
      void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Unable to submit room.");
    }
  });

  async function handleCreateRoom() {
    setError("");
    try {
      const response = await createMultiplayerRoom(token!);
      setRoom(response.room);
      setJoinCode(response.room.roomCode);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create room.");
    }
  }

  async function handleJoinRoom() {
    setError("");
    try {
      const response = await joinMultiplayerRoom(token!, joinCode.toUpperCase());
      setRoom(response.room);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to join room.");
    }
  }

  async function handleStartRoom() {
    if (!room) {
      return;
    }

    const response = await startMultiplayerRoom(token!, room.roomCode);
    setRoom(response.room);
    setResult(response.result);
  }

  async function handleInspectNode(nodeId: number) {
    if (!room) {
      return;
    }

    void inspectMutation.mutateAsync({ roomCode: room.roomCode, nodeId });
  }

  async function handleAction(action: "investigate" | "fact-check" | "quarantine") {
    if (!room || selectedNodeId === null) {
      return;
    }

    const selectedNode = room.session?.nodes.find((node) => node.id === selectedNodeId);

    if (selectedNode) {
      setRoom({
        ...room,
        session: {
          ...room.session!,
          nodes: room.session!.nodes.map((node) => {
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
        }
      });
    }

    await actionMutation.mutateAsync({
      roomCode: room.roomCode,
      nodeId: selectedNodeId,
      action
    });
  }

  async function handleAskChatbot() {
    if (!room || selectedNodeId === null) {
      return;
    }

    try {
      const response = await fetchRoomMisinfoChat(token!, {
        roomCode: room.roomCode,
        nodeId: selectedNodeId,
        question: chatbotQuestion.trim()
      });
      setRoom(response.room);
      setInspected(response.inspected);
      setChatbotTranscript((current) => [
        ...current,
        { role: "user", text: chatbotQuestion.trim() },
        { role: "assistant", text: response.response }
      ]);
      setChatbotQuestion("");
      setActionError("");
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Unable to generate chatbot response.");
    }
  }

  async function handleSendChat() {
    if (!room || !chatInput.trim()) {
      return;
    }

    const response = await sendMultiplayerChat(token!, room.roomCode, chatInput.trim());
    setRoom(response.room);
    setChatInput("");
  }

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <CyberNavbar />
      <div className="pt-20 pb-12 px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-secondary">// MULTIPLAYER MISINFO SIM</p>
            <h1 className="font-display text-4xl mt-2">
              COORDINATE THE <span className="text-secondary text-glow-purple">CONTAINMENT CELL</span>
            </h1>
          </div>
          {room?.session ? (
            <div className="flex items-center gap-6">
              <ArenaTimer timeLeft={displayTimeLeft ?? room.session.timeLeft} totalTime={180} />
            </div>
          ) : null}
        </div>

        {!room ? (
          <div className="grid lg:grid-cols-2 gap-6">
            <GlassPanel className="p-6">
              <p className="font-mono text-xs tracking-[0.24em] text-primary">HOST ROOM</p>
              <h2 className="mt-3 font-display text-2xl text-foreground">Create a shared containment run</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Open a room, invite up to 3 teammates, and synchronize your actions in the same graph.
              </p>
              <button
                onClick={() => void handleCreateRoom()}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-secondary px-5 py-3 font-mono text-xs tracking-[0.2em] text-secondary-foreground transition-all hover:brightness-110"
              >
                <Users className="w-4 h-4" />
                CREATE ROOM
              </button>
            </GlassPanel>

            <GlassPanel className="p-6">
              <p className="font-mono text-xs tracking-[0.24em] text-accent">JOIN ROOM</p>
              <h2 className="mt-3 font-display text-2xl text-foreground">Enter a room code</h2>
              <div className="mt-6 flex gap-3">
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase().slice(0, 6))}
                  placeholder="ABC123"
                  className="w-full rounded-lg border border-border/30 bg-surface-1/40 px-4 py-3 font-mono text-sm text-foreground focus:outline-none focus:border-secondary/50"
                />
                <button
                  onClick={() => void handleJoinRoom()}
                  className="rounded-lg border border-secondary/40 bg-secondary/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-secondary transition-colors hover:bg-secondary/20"
                >
                  JOIN
                </button>
              </div>
              {error ? <p className="mt-4 text-xs text-accent">{error}</p> : null}
            </GlassPanel>
          </div>
        ) : null}

        {room && room.status === "lobby" ? (
          <div className="grid lg:grid-cols-[1fr_340px] gap-6">
            <GlassPanel className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs tracking-[0.24em] text-secondary">ROOM CODE</p>
                  <h2 className="mt-2 font-display text-4xl text-foreground">{room.roomCode}</h2>
                </div>
                {isHost ? (
                  <button
                    onClick={() => void handleStartRoom()}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-mono text-xs tracking-[0.2em] text-primary-foreground transition-all hover:brightness-110"
                  >
                    <Play className="w-4 h-4" />
                    START ROOM
                  </button>
                ) : (
                  <span className="font-mono text-xs text-muted-foreground">Waiting for host to start...</span>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-8">
                {room.players.map((player) => (
                  <div key={player.userId} className="rounded-xl border border-border/30 bg-surface-1/40 p-4 flex items-center gap-4">
                    <div className="text-3xl">{player.avatar}</div>
                    <div>
                      <p className="font-display text-lg text-foreground">{player.handle}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {player.userId === room.hostUserId ? "HOST" : "OPERATIVE"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel className="p-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <p className="font-mono text-xs tracking-[0.24em] text-primary">ROOM CHAT</p>
              </div>
              <div className="mt-4 space-y-3 max-h-[360px] overflow-auto">
                {room.chat.map((message) => (
                  <div key={message.id} className="rounded-xl border border-border/30 bg-surface-1/40 px-4 py-3">
                    <p className="font-mono text-[10px] text-muted-foreground">{message.handle}</p>
                    <p className="mt-1 text-sm text-foreground">{message.message}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Coordinate with your team..."
                  className="w-full rounded-lg border border-border/30 bg-surface-1/40 px-4 py-3 font-mono text-sm text-foreground focus:outline-none focus:border-primary/50"
                />
                <button
                  onClick={() => void handleSendChat()}
                  className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-primary transition-colors hover:bg-primary/20"
                >
                  SEND
                </button>
              </div>
            </GlassPanel>
          </div>
        ) : null}

        {room && room.session && room.status !== "lobby" ? (
          <div className="grid xl:grid-cols-[1fr_380px] gap-6">
            <GlassPanel className="p-4">
              <div className="grid md:grid-cols-5 gap-4 mb-4">
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">PANIC</p>
                  <p className={`mt-2 font-display text-3xl ${room.session.panicLevel < 35 ? "text-neon-green" : room.session.panicLevel < 65 ? "text-neon-yellow" : "text-accent"}`}>
                    {room.session.panicLevel}%
                  </p>
                </div>
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">PLAYERS</p>
                  <p className="mt-2 font-display text-3xl text-primary">{room.players.length}</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">INFECTED</p>
                  <p className="mt-2 font-display text-3xl text-accent">{room.session.nodes.filter((node) => node.status === "infected").length}</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">RECOVERED</p>
                  <p className="mt-2 font-display text-3xl text-neon-green">{room.session.nodes.filter((node) => node.status === "recovered").length}</p>
                </div>
                <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">TEAM CHATBOT</p>
                  <p className="mt-2 font-display text-3xl text-primary">
                    {room.session.chatbotQuestionsUsed}/{room.session.chatbotQuestionLimit}
                  </p>
                </div>
              </div>

              <SharedNetworkGraph
                nodes={room.session.nodes}
                edges={room.session.edges}
                selectedNodeId={selectedNodeId}
                onNodeClick={(node) => {
                  setSelectedNodeId(node.id);
                  void handleInspectNode(node.id);
                }}
              />
            </GlassPanel>

            <div className="space-y-6">
              <GlassPanel className="p-6">
                <p className="font-mono text-xs tracking-[0.24em] text-primary">TEAM INTEL</p>
                {selectedNode ? (
                  <>
                    <h2 className="mt-3 font-display text-2xl text-foreground">{selectedNode.label}</h2>
                    <p className="mt-2 font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
                      FOLLOWERS {selectedNode.followers.toLocaleString()} • STATUS {selectedNode.status.toUpperCase()}
                    </p>
                    {selectedNode.resolvedByAction ? (
                      <p className="mt-2 font-mono text-[10px] tracking-[0.16em] text-neon-yellow">
                        NODE LOCKED BY {selectedNode.resolvedByAction.toUpperCase()}
                      </p>
                    ) : null}

                    {inspected?.content ? (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                          <p className="font-mono text-[10px] tracking-[0.18em] text-accent">CONTENT</p>
                          <p className="mt-2 text-sm text-foreground">{inspected.content.headline}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Source: {inspected.content.source}</p>
                          <p className="mt-3 text-xs leading-6 text-muted-foreground">{inspected.content.content}</p>
                        </div>
                        <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                          <p className="font-mono text-[10px] tracking-[0.18em] text-neon-yellow">EVIDENCE</p>
                          <p className="mt-2 text-xs text-muted-foreground">{inspected.content.evidence}</p>
                        </div>
                        <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                          <p className="font-mono text-[10px] tracking-[0.18em] text-primary">SOURCE PROFILE</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {inspected.content.sourceType} • {inspected.content.category} • Credibility {inspected.content.credibilityScore} • Risk {inspected.content.riskLevel}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-6 grid gap-3">
                      {isHost ? (
                        <button
                          onClick={() => void submitMutation.mutateAsync(room.roomCode)}
                          disabled={submitMutation.isPending}
                          className="rounded-lg bg-secondary px-4 py-3 font-mono text-xs tracking-[0.18em] text-secondary-foreground transition-all hover:brightness-110 disabled:opacity-70"
                        >
                          <Network className="inline w-4 h-4 mr-2" />
                          {submitMutation.isPending ? "SUBMITTING..." : "SUBMIT TEAM RUN"}
                        </button>
                      ) : (
                        <div className="rounded-lg border border-border/30 bg-surface-1/40 px-4 py-3 text-xs text-muted-foreground">
                          Only the host can submit the final team result. Keep coordinating until the host finalizes the run.
                        </div>
                      )}
                      <button
                        onClick={() => setChatbotOpen((current) => !current)}
                        disabled={room.session.chatbotQuestionsUsed >= room.session.chatbotQuestionLimit}
                        className="rounded-lg border border-secondary/40 bg-secondary/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-secondary transition-colors hover:bg-secondary/20 disabled:opacity-70"
                      >
                        <MessageSquare className="inline w-4 h-4 mr-2" />
                        {room.session.chatbotQuestionsUsed >= room.session.chatbotQuestionLimit ? "TEAM CHATBOT LIMIT REACHED" : "OPEN TEAM CHATBOT"}
                      </button>
                      <button disabled={actionMutation.isPending} onClick={() => void handleAction("investigate")} className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-primary transition-colors hover:bg-primary/20 disabled:opacity-70">
                        <Search className="inline w-4 h-4 mr-2" />
                        INVESTIGATE
                      </button>
                      <button disabled={actionMutation.isPending || Boolean(selectedNode.resolvedByAction)} onClick={() => void handleAction("fact-check")} className="rounded-lg border border-neon-yellow/40 bg-neon-yellow/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-neon-yellow transition-colors hover:bg-neon-yellow/20 disabled:opacity-70">
                        FACT-CHECK
                      </button>
                      <button disabled={actionMutation.isPending || Boolean(selectedNode.resolvedByAction)} onClick={() => void handleAction("quarantine")} className="rounded-lg border border-neon-green/40 bg-neon-green/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-neon-green transition-colors hover:bg-neon-green/20 disabled:opacity-70">
                        <ShieldCheck className="inline w-4 h-4 mr-2" />
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
                          <p className="font-mono text-[10px] tracking-[0.18em] text-secondary">TEAM CHATBOT</p>
                          <span className="font-mono text-[10px] text-neon-yellow">
                            {room.session.chatbotQuestionsUsed}/{room.session.chatbotQuestionLimit} USED
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
                                  {entry.role === "user" ? "TEAM QUESTION" : "CHATBOT"}
                                </p>
                                <p>{entry.text}</p>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-lg border border-border/20 bg-background/30 px-3 py-3 text-xs text-muted-foreground">
                              Ask the chatbot to challenge credibility, identify weak evidence, or suggest what the team should verify next.
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
                            onClick={() => void handleAskChatbot()}
                            disabled={
                              !chatbotQuestion.trim() ||
                              room.session.chatbotQuestionsUsed >= room.session.chatbotQuestionLimit
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
                  <p className="mt-4 text-sm text-muted-foreground">Select a node to coordinate a team action.</p>
                )}
              </GlassPanel>

              <GlassPanel className="p-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <p className="font-mono text-xs tracking-[0.24em] text-primary">LIVE CHAT</p>
                </div>
                <div className="mt-4 space-y-3 max-h-[240px] overflow-auto">
                  {room.chat.map((message) => (
                    <div key={message.id} className="rounded-xl border border-border/30 bg-surface-1/40 px-4 py-3">
                      <p className="font-mono text-[10px] text-muted-foreground">{message.handle}</p>
                      <p className="mt-1 text-sm text-foreground">{message.message}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-3">
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Call out suspicious nodes..."
                    className="w-full rounded-lg border border-border/30 bg-surface-1/40 px-4 py-3 font-mono text-sm text-foreground focus:outline-none focus:border-primary/50"
                  />
                  <button
                    onClick={() => void handleSendChat()}
                    className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-primary transition-colors hover:bg-primary/20"
                  >
                    SEND
                  </button>
                </div>
              </GlassPanel>

              {result && room.status === "results" ? (
                <GlassPanel className="p-6">
                  <p className={`font-mono text-xs tracking-[0.24em] ${result.contained ? "text-neon-green" : "text-accent"}`}>
                    {result.contained ? "CONTAINMENT SUCCESSFUL" : "CONTAINMENT BREACH"}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">{result.summary}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">Final score</span>
                    <span className="font-display text-4xl text-primary">{result.score}</span>
                  </div>
                  <div className="mt-4 text-xs text-muted-foreground">
                    Panic {result.panicLevel}% • Recovered {result.recovered} • Infected {result.infected}
                  </div>
                  <div className="mt-6 rounded-xl border border-border/20 bg-background/40 p-3">
                    <p className="font-mono text-[10px] tracking-[0.18em] text-secondary">TEAM REVIEW TABLE</p>
                    <p className="mt-2 text-xs text-muted-foreground">Click a row to inspect the full article breakdown.</p>
                    <div className="mt-3 max-h-[420px] overflow-auto rounded-lg border border-border/20">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>News</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Player</TableHead>
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
                              <TableCell className="text-muted-foreground">
                                {item.selectedByHandle ?? "Unassigned"}
                              </TableCell>
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
              ) : null}
            </div>
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
                  {selectedReviewItem.source} | {selectedReviewItem.sourceType} | {selectedReviewItem.category}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border/30 bg-background/40 p-4">
                  <p className="font-mono text-[10px] tracking-[0.18em] text-secondary">TEAM DECISION REVIEW</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>Actual type: <span className={selectedReviewItem.actualType === "fake" ? "text-accent" : "text-neon-green"}>{selectedReviewItem.actualType.toUpperCase()}</span></p>
                    <p>Selected action: <span className="text-foreground">{selectedReviewItem.selectedAction === "none" ? "No action" : selectedReviewItem.selectedAction}</span></p>
                    <p>Selected by: <span className="text-foreground">{selectedReviewItem.selectedByHandle ?? "No player recorded"}</span></p>
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

export default MisinfoMultiplayer;


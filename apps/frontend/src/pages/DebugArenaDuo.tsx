import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Editor from "@monaco-editor/react";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clipboard,
  Code2,
  Filter,
  MessageSquare,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Users,
  XCircle
} from "lucide-react";
import CyberNavbar from "@/components/CyberNavbar";
import ArenaTimer from "@/components/ArenaTimer";
import GlassPanel from "@/components/GlassPanel";
import { appRoutes } from "@/app/routes";
import { useAuth } from "@/features/auth/auth-context";
import {
  fetchSoloScenarios,
  type SoloScenario
} from "@/features/debug-arena/debug-arena-api";
import {
  createDebugArenaRoom,
  fetchDebugArenaRoom,
  getDebugArenaSocket,
  joinDebugArenaRoom,
  registerDebugArenaCoachUse,
  sendDebugArenaRoomMessage,
  startDebugArenaRoom,
  submitDebugArenaRoom,
  syncDebugArenaRoomCode,
  type DebugArenaMultiplayerRoom,
  type DebugArenaRoomResult
} from "@/features/debug-arena/debug-arena-multiplayer-api";
import { fetchPyDebugCoachReport, type DebugCoachReport } from "@/features/ai/ai-api";

function getEditorLanguage(language: SoloScenario["language"]) {
  switch (language) {
    case "python":
      return "python";
    case "cpp":
      return "cpp";
    default:
      return "typescript";
  }
}

const workspaceHeightClass = "xl:h-[calc(100vh-9rem)]";

export default function DebugArenaDuo() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [room, setRoom] = useState<DebugArenaMultiplayerRoom | null>(null);
  const [result, setResult] = useState<DebugArenaRoomResult | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [error, setError] = useState("");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("random");
  const [filterLanguage, setFilterLanguage] = useState<string>("All");
  const [localCode, setLocalCode] = useState("");
  const [coachReport, setCoachReport] = useState<DebugCoachReport | null>(null);
  const [displayTimeLeft, setDisplayTimeLeft] = useState(90);
  const pendingRef = useRef({
    keystrokes: 0,
    editOperations: 0,
    tabSwitches: 0,
    pasteAttempts: 0
  });
  const lastSyncedCodeRef = useRef("");
  const syncTimeoutRef = useRef<number | null>(null);

  const { data } = useQuery({
    queryKey: ["debug-arena-scenarios", "duo", filterLanguage],
    queryFn: () => fetchSoloScenarios(token!, { language: filterLanguage }),
    enabled: Boolean(token)
  });

  const scenarios = data?.scenarios ?? [];
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
  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? topicScenarios[0] ?? scenarios[0] ?? null,
    [scenarios, selectedScenarioId, topicScenarios]
  );
  const isHost = room?.hostUserId === user?.id;
  const isRoomLocked = Boolean(room && (room.status === "results" || room.session?.submittedByUserId));

  useEffect(() => {
    if (!selectedScenario && scenarios.length > 0) {
      setSelectedScenarioId(scenarios[0].id);
    }
  }, [scenarios, selectedScenario]);

  useEffect(() => {
    if (topicOptions.length === 0) {
      return;
    }

    if (selectedTopicId === "random") {
      return;
    }

    if (!topicOptions.some((topic) => topic.id === selectedTopicId)) {
      setSelectedTopicId(topicOptions[0].id);
    }
  }, [selectedTopicId, topicOptions]);

  useEffect(() => {
    if (room?.status !== "lobby") {
      return;
    }

    const previewScenario = topicScenarios[0] ?? scenarios[0] ?? null;
    if (previewScenario) {
      setSelectedScenarioId(previewScenario.id);
    }
  }, [room?.status, scenarios, topicScenarios]);

  useEffect(() => {
    if (room?.session?.scenarioId) {
      setSelectedScenarioId(room.session.scenarioId);
    }
  }, [room?.session?.scenarioId]);

  useEffect(() => {
    if (!room) {
      return;
    }

    const socket = getDebugArenaSocket();
    socket.emit("debug-arena:join-room", room.roomCode);

    const handleRoomUpdate = (snapshot: { room: DebugArenaMultiplayerRoom; result: DebugArenaRoomResult | null }) => {
      setRoom(snapshot.room);
      setResult(snapshot.result);
    };

    socket.on("debug-arena:room-update", handleRoomUpdate);

    return () => {
      socket.off("debug-arena:room-update", handleRoomUpdate);
      socket.emit("debug-arena:leave-room", room.roomCode);
    };
  }, [room]);

  useEffect(() => {
    const incomingCode = room?.session?.code ?? "";

    if (!room?.session) {
      return;
    }

    if (incomingCode !== lastSyncedCodeRef.current && room.session.lastEditedByUserId !== user?.id) {
      setLocalCode(incomingCode);
      lastSyncedCodeRef.current = incomingCode;
    }
  }, [room?.session?.code, room?.session?.lastEditedByUserId, room?.session, user?.id]);

  useEffect(() => {
    if (!room?.session) {
      setDisplayTimeLeft(90);
      return;
    }

    if (room.status === "results") {
      const frozenElapsed = room.session.elapsedSeconds ?? room.session.durationSeconds;
      setDisplayTimeLeft(Math.max(0, room.session.durationSeconds - frozenElapsed));
      return;
    }

    const computeTimeLeft = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(room.session!.startedAt).getTime()) / 1000));
      return Math.max(0, room.session!.durationSeconds - elapsed);
    };

    setDisplayTimeLeft(computeTimeLeft());

    const interval = window.setInterval(() => {
      setDisplayTimeLeft(computeTimeLeft());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [room?.session?.startedAt, room?.session?.durationSeconds, room?.status]);

  useEffect(() => {
    if (!room?.session || room.status !== "playing" || !token) {
      return;
    }

    if (localCode === room.session.code) {
      return;
    }

    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = window.setTimeout(async () => {
      const payload = {
        roomCode: room.roomCode,
        code: localCode,
        ...pendingRef.current
      };

      pendingRef.current = {
        keystrokes: 0,
        editOperations: 0,
        tabSwitches: 0,
        pasteAttempts: 0
      };

      const response = await syncDebugArenaRoomCode(token, payload);
      setRoom(response.room);
      lastSyncedCodeRef.current = localCode;
    }, 450);

    return () => {
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [localCode, room, token]);

  useEffect(() => {
    if (room?.status !== "playing") {
      return;
    }

    const handleBlur = () => {
      pendingRef.current.tabSwitches += 1;
    };

    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [room?.status]);

  const coachMutation = useMutation({
    mutationFn: async () => {
      if (!room?.session || !selectedScenario || !token) {
        throw new Error("No active room session.");
      }

      await registerDebugArenaCoachUse(token, room.roomCode);
      return fetchPyDebugCoachReport(token, {
        scenarioId: room.session.scenarioId,
        code: localCode
      });
    },
    onSuccess: (data) => setCoachReport(data.report)
  });

  async function handleCreateRoom() {
    setError("");
    try {
      const response = await createDebugArenaRoom(token!);
      setRoom(response.room);
      setJoinCode(response.room.roomCode);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create room.");
    }
  }

  async function handleJoinRoom() {
    setError("");
    try {
      const response = await joinDebugArenaRoom(token!, joinCode.toUpperCase());
      setRoom(response.room);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to join room.");
    }
  }

  async function handleStartRoom() {
    const pool = selectedTopicId === "random" ? scenarios : topicScenarios;
    const chosenScenario = pool[Math.floor(Math.random() * pool.length)] ?? selectedScenario;

    if (!room || !chosenScenario) {
      return;
    }

    const response = await startDebugArenaRoom(token!, room.roomCode, chosenScenario.id);
    setRoom(response.room);
    setResult(response.result);
    setLocalCode(response.room.session?.code ?? "");
    lastSyncedCodeRef.current = response.room.session?.code ?? "";
    setCoachReport(null);
  }

  async function handleSendChat() {
    if (!room || !chatInput.trim()) {
      return;
    }

    const response = await sendDebugArenaRoomMessage(token!, room.roomCode, chatInput.trim());
    setRoom(response.room);
    setChatInput("");
  }

  async function handleSubmit() {
    if (!room || isRoomLocked) {
      return;
    }

    const response = await submitDebugArenaRoom(token!, room.roomCode);
    setRoom(response.room);
    setResult(response.result);
    void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    void queryClient.invalidateQueries({ queryKey: ["profile"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  function handleCodeChange(value: string | undefined) {
    setLocalCode(value ?? "");
    if (room?.status === "playing" && !isRoomLocked) {
      pendingRef.current.keystrokes += 1;
      pendingRef.current.editOperations += 1;
    }
  }

  function handlePaste(event: React.ClipboardEvent) {
    if (room?.status !== "playing" || isRoomLocked) {
      return;
    }

    event.preventDefault();
    pendingRef.current.pasteAttempts += 1;
  }

  const yourResult = result?.players.find((entry) => entry.userId === user?.id) ?? null;

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <CyberNavbar />
      <div className="pt-20 pb-12 px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono text-xs tracking-[0.3em] text-primary">// DEBUG ARENA DUO MODE</p>
            <h1 className="font-display text-4xl mt-2">
              SYNCHRONIZE THE <span className="text-primary text-glow-cyan">PATCH CELL</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground">ROOM STATE</p>
              <p className="font-display text-lg text-foreground">{room?.status?.toUpperCase() ?? "LOBBY"}</p>
            </div>
            <Link
              to={appRoutes.debugArena}
              className="inline-flex items-center gap-2 rounded-lg border border-border/40 px-4 py-2 font-mono text-xs tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              SOLO MODE
            </Link>
          </div>
        </div>

        {!room ? (
          <div className="grid lg:grid-cols-2 gap-6">
            <GlassPanel className="p-6">
              <p className="font-mono text-xs tracking-[0.24em] text-primary">CREATE ROOM</p>
              <h2 className="mt-3 font-display text-2xl text-foreground">Open a duo debug session</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Create a room, share the code, and solve one scenario together. Either player can submit the final patch.
              </p>
              <button
                onClick={() => void handleCreateRoom()}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-mono text-xs tracking-[0.2em] text-primary-foreground transition-all hover:brightness-110"
              >
                <Users className="w-4 h-4" />
                CREATE DUO ROOM
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
                  className="w-full rounded-lg border border-border/30 bg-surface-1/40 px-4 py-3 font-mono text-sm text-foreground focus:outline-none focus:border-primary/50"
                />
                <button
                  onClick={() => void handleJoinRoom()}
                  className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-primary transition-colors hover:bg-primary/20"
                >
                  JOIN
                </button>
              </div>
              {error ? <p className="mt-4 text-xs text-accent">{error}</p> : null}
            </GlassPanel>
          </div>
        ) : null}

        {room && room.status === "lobby" ? (
          <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
            <GlassPanel className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs tracking-[0.24em] text-primary">ROOM CODE</p>
                  <h2 className="mt-2 font-display text-4xl text-foreground">{room.roomCode}</h2>
                </div>
                {isHost && selectedScenario ? (
                  <button
                    onClick={() => void handleStartRoom()}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-mono text-xs tracking-[0.2em] text-primary-foreground transition-all hover:brightness-110"
                  >
                    <Play className="w-4 h-4" />
                    START DUO ROUND
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
                        {player.userId === room.hostUserId ? "HOST" : "PARTNER"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedScenario ? (
                <div className="mt-6 rounded-xl border border-border/30 bg-surface-1/40 p-5">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-primary" />
                    <p className="font-mono text-[10px] tracking-[0.18em] text-primary">DUO TOPIC PREVIEW</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[10px] tracking-[0.18em] text-primary">{selectedScenario.language.toUpperCase()}</span>
                    <span className="font-mono text-[10px] tracking-[0.18em] text-neon-yellow">{selectedScenario.topicLabel.toUpperCase()}</span>
                    <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">{topicScenarios.length} QUESTIONS IN POOL</span>
                  </div>
                  <h3 className="mt-3 font-display text-2xl text-foreground">{selectedScenario.topicLabel}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{selectedScenario.description}</p>
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-neon-yellow/20 bg-neon-yellow/5 p-4">
                    <ShieldAlert className="w-4 h-4 text-neon-yellow mt-0.5" />
                    <p className="text-xs text-muted-foreground">{selectedScenario.hint}</p>
                  </div>
                </div>
              ) : null}
            </GlassPanel>

            <GlassPanel className={`p-6 overflow-hidden ${workspaceHeightClass}`}>
              <p className="font-mono text-xs tracking-[0.24em] text-neon-yellow">TOPIC PICK</p>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-border/20 bg-background/30 px-4 py-3">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-2">
                  {["All", "typescript", "python", "cpp"].map((language) => (
                    <button
                      key={language}
                      onClick={() => setFilterLanguage(language)}
                      className={`rounded-md border px-3 py-2 font-mono text-[10px] tracking-[0.18em] transition-all ${
                        filterLanguage === language
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border/30 bg-surface-1/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      {language === "All" ? "ALL" : language.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 h-full space-y-3 overflow-auto pr-2">
                {[{ id: "random", label: "Random Topic" }, ...topicOptions].map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopicId(topic.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      selectedTopicId === topic.id
                        ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/10"
                        : "border-border/30 bg-surface-1/40 hover:border-primary/30"
                    }`}
                  >
                    <p className="font-display text-sm text-foreground">{topic.label}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {topic.id === "random"
                        ? "RANDOM TOPIC • RANDOM QUESTION"
                        : `${scenarios.filter((scenario) => scenario.topicId === topic.id).length} QUESTIONS READY`}
                    </p>
                  </button>
                ))}
              </div>
            </GlassPanel>
          </div>
        ) : null}

        {room && room.session && room.status !== "lobby" ? (
          <div className="grid xl:grid-cols-[300px_minmax(0,1fr)_340px] gap-6 items-start">
            <GlassPanel className={`p-6 overflow-hidden ${workspaceHeightClass}`}>
              <div className="flex h-full flex-col">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.18em] text-primary">MISSION BRIEF</p>
                  <h2 className="mt-3 font-display text-2xl text-foreground">
                    {selectedScenario?.title ?? room.session.scenarioId}
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {selectedScenario?.description ?? "Shared duo patch session is active."}
                  </p>
                </div>

                <div className="mt-6 flex-1 overflow-y-auto pr-2 space-y-4">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <p className="font-mono text-[10px] tracking-[0.18em] text-primary">DUO FLOW</p>
                    <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                      <p>1. Read the failure before editing.</p>
                      <p>2. Coordinate fixes in chat instead of overwriting each other.</p>
                      <p>3. Use the AI coach only when the room is blocked.</p>
                      <p>4. Either player can submit when the patch is stable.</p>
                    </div>
                  </div>

                  {selectedScenario ? (
                    <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                      <p className="font-mono text-[10px] tracking-[0.18em] text-accent">STACK TRACE</p>
                      <pre className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground font-mono">
                        {selectedScenario.stackTrace}
                      </pre>
                    </div>
                  ) : null}

                  {selectedScenario ? (
                    <div className="rounded-xl border border-neon-yellow/20 bg-neon-yellow/5 p-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-neon-yellow" />
                        <p className="font-mono text-[10px] tracking-[0.18em] text-neon-yellow">ROOM HINT</p>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{selectedScenario.hint}</p>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                    <p className="font-mono text-[10px] tracking-[0.18em] text-neon-yellow">PARTNERS</p>
                    <div className="mt-3 space-y-2">
                      {room.players.map((player) => (
                        <div key={player.userId} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{player.avatar} {player.handle}</span>
                          {room.session?.lastEditedByUserId === player.userId ? (
                            <span className="font-mono text-[10px] text-primary">EDITING</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className={`p-0 overflow-hidden ${workspaceHeightClass}`}>
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-border/30 px-5 py-4 bg-surface-1/70">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.18em] text-primary">SHARED PATCH BUFFER</p>
                    <p className="font-display text-xl text-foreground">
                      {selectedScenario?.title ?? room.session.scenarioId}
                    </p>
                  </div>
                  {room.status === "playing" ? (
                    <ArenaTimer timeLeft={displayTimeLeft} totalTime={room.session.durationSeconds} />
                  ) : (
                    <div className="text-right">
                      <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">SUBMITTED</p>
                      <p className="font-display text-xl text-primary">{displayTimeLeft}s LEFT</p>
                    </div>
                  )}
                </div>

                <div onPaste={handlePaste} className="flex-1 min-h-0">
                  <Editor
                    height="100%"
                    language={selectedScenario ? getEditorLanguage(selectedScenario.language) : "typescript"}
                    value={localCode}
                    onChange={handleCodeChange}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      fontFamily: "JetBrains Mono, monospace",
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      readOnly: isRoomLocked
                    }}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-border/30 px-5 py-4 bg-surface-1/70">
                  <div className="font-mono text-[10px] text-muted-foreground">
                    Either player can submit. Final room result is shared, but each contribution score is personal.
                  </div>
                  <button
                    onClick={() => void handleSubmit()}
                    disabled={isRoomLocked}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-mono text-xs tracking-[0.18em] text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60"
                  >
                    <Play className="w-4 h-4" />
                    SUBMIT ROOM PATCH
                  </button>
                </div>
              </div>
            </GlassPanel>

            <div className="space-y-6">
              <GlassPanel className={`p-6 overflow-hidden ${workspaceHeightClass}`}>
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <p className="font-mono text-xs tracking-[0.24em] text-primary">ROOM CHAT & INTEL</p>
                  </div>

                  <div className="mt-4 flex-1 overflow-y-auto pr-2">
                    <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-primary" />
                          <p className="font-mono text-[10px] tracking-[0.18em] text-primary">AI COACH</p>
                        </div>
                        <button
                          onClick={() => void coachMutation.mutateAsync()}
                          disabled={coachMutation.isPending || !room.session || isRoomLocked}
                          className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-[10px] tracking-[0.18em] text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                        >
                          {coachMutation.isPending ? "ANALYZING..." : "ANALYZE SHARED PATCH"}
                        </button>
                      </div>
                      {coachReport ? (
                        <div className="mt-4 space-y-3">
                          <p className="text-sm text-foreground">{coachReport.rootCause}</p>
                          {coachReport.actionPlan.map((item) => (
                            <div key={item} className="rounded-lg border border-border/20 bg-surface-1/40 px-3 py-2 text-xs text-muted-foreground">
                              {item}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-xs text-muted-foreground">
                          Use the AI coach when the room gets stuck. Coach usage also contributes to individual activity stats.
                        </p>
                      )}
                    </div>

                    <div className="mt-6 space-y-3 max-h-[220px] overflow-auto">
                      {room.chat.map((message) => (
                        <div key={message.id} className="rounded-xl border border-border/30 bg-surface-1/40 px-4 py-3">
                          <p className="font-mono text-[10px] text-muted-foreground">{message.handle}</p>
                          <p className="mt-1 text-sm text-foreground">{message.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <input
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      placeholder="Coordinate the patch..."
                      className="w-full rounded-lg border border-border/30 bg-surface-1/40 px-4 py-3 font-mono text-sm text-foreground focus:outline-none focus:border-primary/50"
                    />
                    <button
                      onClick={() => void handleSendChat()}
                      className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 font-mono text-xs tracking-[0.18em] text-primary transition-colors hover:bg-primary/20"
                    >
                      SEND
                    </button>
                  </div>
                </div>
              </GlassPanel>

              {result && room.status === "results" ? (
                <GlassPanel className="p-6">
                  <p className={`font-mono text-xs tracking-[0.24em] ${result.contained ? "text-neon-green" : "text-accent"}`}>
                    {result.contained ? "DUO PATCH ACCEPTED" : "DUO PATCH REJECTED"}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">{result.summary}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">Team score</span>
                    <span className="font-display text-4xl text-primary">{result.score}</span>
                  </div>

                  {yourResult ? (
                    <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <p className="font-mono text-[10px] tracking-[0.18em] text-primary">YOUR RESULT</p>
                      <p className="mt-2 font-display text-3xl text-foreground">{yourResult.contributionScore}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{yourResult.summary}</p>
                      <p className="mt-2 font-mono text-[10px] text-neon-yellow">CONTRIBUTION {yourResult.contributionPercent}%</p>
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3">
                    {result.players.map((player) => (
                      <div key={player.userId} className="rounded-xl border border-border/30 bg-surface-1/40 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-display text-lg text-foreground">{player.avatar} {player.handle}</p>
                            <p className="font-mono text-[10px] text-muted-foreground">Contribution {player.contributionPercent}%</p>
                          </div>
                          <p className="font-display text-2xl text-primary">{player.contributionScore}</p>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <span>Keystrokes: {player.stats.keystrokes}</span>
                          <span>Edits: {player.stats.editOperations}</span>
                          <span>Tab switches: {player.stats.tabSwitches}</span>
                          <span>Coach uses: {player.stats.coachRequests}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border border-border/30 bg-surface-1/40 overflow-hidden">
                    <div className="grid grid-cols-[1.4fr_1fr_120px] gap-4 px-4 py-3 border-b border-border/30 font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
                      <span>TEST</span><span>DESCRIPTION</span><span>STATUS</span>
                    </div>
                    {result.tests.map((test) => (
                      <div key={test.name} className="grid grid-cols-[1.4fr_1fr_120px] gap-4 px-4 py-3 border-b border-border/10 text-xs">
                        <span className="text-foreground">{test.name}</span>
                        <span className="text-muted-foreground">{test.description}</span>
                        <span className="flex items-center gap-2">
                          {test.passed ? <CheckCircle2 className="w-4 h-4 text-neon-green" /> : <XCircle className="w-4 h-4 text-accent" />}
                          <span className={test.passed ? "text-neon-green" : "text-accent"}>{test.passed ? "PASS" : "FAIL"}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </GlassPanel>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

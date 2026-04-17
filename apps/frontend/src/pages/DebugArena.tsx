import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";
import { Bug, Play, Clock, AlertTriangle, CheckCircle, XCircle, Skull, ChevronRight, RotateCcw, Zap, ShieldAlert, Clipboard, User, Users, Copy, Check, ArrowLeft, FileCode, Tag } from "lucide-react";
import CyberNavbar from "@/components/CyberNavbar";
import ArenaTimer from "@/components/ArenaTimer";
import GlassPanel from "@/components/GlassPanel";
import { bugScenarios, hecklerMessages, generateRoomCode } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

type ArenaMode = "select-mode" | "solo" | "duo";
type DuoRole = "setter" | "solver";
type DuoState = "role-select" | "room-setup" | "waiting" | "setter-editor" | "solver-waiting" | "playing" | "submitted" | "results";
type GameState = "lobby" | "vs-screen" | "playing" | "submitted" | "results";
type ResultTab = "efficiency" | "security" | "style";

const DebugArena = () => {
  const [arenaMode, setArenaMode] = useState<ArenaMode>("select-mode");
  const [duoRole, setDuoRole] = useState<DuoRole>("solver");
  const [duoState, setDuoState] = useState<DuoState>("role-select");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);

  // Duo setter fields
  const [setterCode, setSetterCode] = useState("");
  const [setterDescription, setSetterDescription] = useState("");
  const [setterDifficulty, setSetterDifficulty] = useState<"EASY" | "MEDIUM" | "HARD" | "EXTREME">("MEDIUM");
  const [setterTitle, setSetterTitle] = useState("");

  // Solo / shared game state
  const [gameState, setGameState] = useState<GameState>("lobby");
  const [selectedScenario, setSelectedScenario] = useState(bugScenarios[0]);
  const [timeLeft, setTimeLeft] = useState(90);
  const [code, setCode] = useState(selectedScenario.buggyCode);
  const [heckleIndex, setHeckleIndex] = useState(0);
  const [heckles, setHeckles] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<{ passed: boolean; tests: { name: string; passed: boolean }[] } | null>(null);
  const [scores, setScores] = useState<{ creativity: number; efficiency: number; reasoning: number; style: number; overall: number } | null>(null);
  const [resultTab, setResultTab] = useState<ResultTab>("efficiency");
  const [editorShaking, setEditorShaking] = useState(false);
  const [vsCountdown, setVsCountdown] = useState(3);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Timer
  useEffect(() => {
    if (gameState !== "playing" || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && gameState === "playing") handleSubmit();
  }, [timeLeft, gameState]);

  // VS screen countdown
  useEffect(() => {
    if (gameState !== "vs-screen") return;
    if (vsCountdown <= 0) { setGameState("playing"); return; }
    const t = setTimeout(() => setVsCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [gameState, vsCountdown]);

  // Heckler
  useEffect(() => {
    if (gameState !== "playing") return;
    const interval = setInterval(() => {
      setHeckles((prev) => [...prev, hecklerMessages[heckleIndex % hecklerMessages.length]]);
      setHeckleIndex((i) => i + 1);
    }, 6000 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, [gameState, heckleIndex]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [heckles]);

  // Tab-switch detection
  useEffect(() => {
    if (gameState !== "playing") return;
    const handleBlur = () => setHeckles((prev) => [...prev, "👀 Trying to tab out? I SEE YOU. Focus, human."]);
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [gameState]);

  // Keyboard shortcut
  useEffect(() => {
    if (gameState !== "playing") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  // Simulate opponent joining in duo mode
  useEffect(() => {
    if (duoState !== "waiting") return;
    const t = setTimeout(() => {
      setOpponentReady(true);
      toast({ title: "🎮 Opponent Connected", description: "NullPtr_Queen has joined the room!" });
    }, 3000);
    return () => clearTimeout(t);
  }, [duoState]);

  const startGame = (scenario: typeof bugScenarios[0]) => {
    setSelectedScenario(scenario);
    setCode(scenario.buggyCode);
    setTimeLeft(90);
    setHeckles([]);
    setHeckleIndex(0);
    setTestResults(null);
    setScores(null);
    setVsCountdown(3);
    setGameState("vs-screen");
  };

  const startDuoSolverGame = () => {
    const customScenario = {
      id: 99,
      title: setterTitle || "Custom Duo Challenge",
      language: "typescript",
      difficulty: setterDifficulty,
      description: setterDescription || "A custom bug challenge from your opponent.",
      stackTrace: "Custom challenge — no stack trace provided.",
      buggyCode: setterCode || bugScenarios[0].buggyCode,
      hint: "Your opponent set this challenge. Good luck!",
    };
    setSelectedScenario(customScenario);
    setCode(customScenario.buggyCode);
    setTimeLeft(90);
    setHeckles([]);
    setHeckleIndex(0);
    setTestResults(null);
    setScores(null);
    setVsCountdown(3);
    setArenaMode("duo");
    setGameState("vs-screen");
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (arenaMode === "duo" && duoState === "setter-editor") return; // Setter CAN paste
    e.preventDefault();
    setEditorShaking(true);
    setTimeout(() => setEditorShaking(false), 400);
    toast({ title: "⚠️ Clipboard Access Denied", description: "Rely on your own neural pathways, human.", variant: "destructive" });
    setHeckles((prev) => [...prev, "😂 Trying to paste? PATHETIC. Write it yourself!"]);
  }, [toast, arenaMode, duoState]);

  const handleSubmit = useCallback(() => {
    setGameState("submitted");
    setTimeout(() => {
      const passed = Math.random() > 0.3;
      setTestResults({
        passed,
        tests: [
          { name: "test_session_isolation", passed },
          { name: "test_concurrent_access", passed: passed && Math.random() > 0.2 },
          { name: "test_lock_ordering", passed },
          { name: "test_error_handling", passed: Math.random() > 0.4 },
          { name: "test_performance_baseline", passed: Math.random() > 0.3 },
        ],
      });
      setTimeout(() => {
        setScores({
          creativity: Math.floor(60 + Math.random() * 40),
          efficiency: Math.floor(50 + Math.random() * 50),
          reasoning: Math.floor(55 + Math.random() * 45),
          style: Math.floor(45 + Math.random() * 55),
          overall: Math.floor(55 + Math.random() * 45),
        });
        setGameState("results");
      }, 1500);
    }, 2000);
  }, []);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const initDuoRoom = () => {
    setRoomCode(generateRoomCode());
    setOpponentReady(false);
    setDuoState("waiting");
  };

  const handleBackToModeSelect = () => {
    setArenaMode("select-mode");
    setGameState("lobby");
    setDuoState("role-select");
  };

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <CyberNavbar />
      <div className="pt-16">
        <AnimatePresence mode="wait">

          {/* MODE SELECTION */}
          {arenaMode === "select-mode" && (
            <motion.div
              key="mode-select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto px-4 py-12"
            >
              <div className="text-center mb-12">
                <span className="font-mono text-xs tracking-[0.3em] text-primary">// SELECT MODE</span>
                <h1 className="font-display text-4xl md:text-5xl mt-2">
                  DEBUG <span className="text-primary text-glow-cyan">ARENA</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-2 font-mono">Choose your battle format</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {/* Solo Card */}
                <motion.div
                  whileHover={{ scale: 1.02, rotateY: 2 }}
                  onClick={() => { setArenaMode("solo"); setGameState("lobby"); }}
                  className="cursor-pointer"
                >
                  <GlassPanel className="p-8 text-center hover:border-primary/40 transition-all group h-full">
                    <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4 border border-primary/30 glow-cyan group-hover:scale-110 transition-transform">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-display text-xl text-primary mb-2">SOLO</h3>
                    <p className="font-mono text-[10px] tracking-widest text-muted-foreground mb-3">YOU vs AI HECKLER</p>
                    <p className="text-xs text-muted-foreground">Pick a scenario and fix the bug under pressure. 90 seconds. The AI heckler watches every keystroke.</p>
                  </GlassPanel>
                </motion.div>

                {/* Duo Card */}
                <motion.div
                  whileHover={{ scale: 1.02, rotateY: -2 }}
                  onClick={() => { setArenaMode("duo"); setDuoState("role-select"); }}
                  className="cursor-pointer"
                >
                  <GlassPanel className="p-8 text-center hover:border-secondary/40 transition-all group h-full">
                    <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4 border border-secondary/30 glow-purple group-hover:scale-110 transition-transform">
                      <Users className="w-8 h-8 text-secondary" />
                    </div>
                    <h3 className="font-display text-xl text-secondary mb-2">DUO</h3>
                    <p className="font-mono text-[10px] tracking-widest text-muted-foreground mb-3">CHALLENGE A FRIEND</p>
                    <p className="text-xs text-muted-foreground">One player sets the bug, the other solves it. Create custom challenges or modify pre-built ones.</p>
                  </GlassPanel>
                </motion.div>
              </div>

              <div className="md:hidden mt-8">
                <GlassPanel className="p-4 border-neon-yellow/30">
                  <div className="flex items-center gap-2 text-neon-yellow font-mono text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    Debug Arena requires a physical keyboard for optimal performance.
                  </div>
                </GlassPanel>
              </div>
            </motion.div>
          )}

          {/* DUO: ROLE SELECT */}
          {arenaMode === "duo" && duoState === "role-select" && (
            <motion.div
              key="duo-role"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto px-4 py-12"
            >
              <button onClick={handleBackToModeSelect} className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-mono text-xs mb-8 transition-colors">
                <ArrowLeft className="w-3 h-3" /> BACK TO MODE SELECT
              </button>
              <div className="text-center mb-12">
                <span className="font-mono text-xs tracking-[0.3em] text-secondary">// DUO MODE</span>
                <h1 className="font-display text-3xl md:text-4xl mt-2">
                  SELECT YOUR <span className="text-secondary text-glow-purple">ROLE</span>
                </h1>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => { setDuoRole("setter"); setDuoState("room-setup"); }}
                  className="cursor-pointer"
                >
                  <GlassPanel className="p-8 text-center hover:border-accent/40 transition-all group h-full">
                    <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4 border border-accent/30 glow-pink group-hover:scale-110 transition-transform">
                      <Bug className="w-8 h-8 text-accent" />
                    </div>
                    <h3 className="font-display text-xl text-accent mb-2">BUG SETTER</h3>
                    <p className="font-mono text-[10px] tracking-widest text-muted-foreground mb-3">CREATE THE CHALLENGE</p>
                    <p className="text-xs text-muted-foreground">Write or paste buggy code, add a description, and deploy it for your opponent to solve.</p>
                  </GlassPanel>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => { setDuoRole("solver"); setDuoState("room-setup"); }}
                  className="cursor-pointer"
                >
                  <GlassPanel className="p-8 text-center hover:border-neon-green/40 transition-all group h-full">
                    <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4 border border-neon-green/30 glow-green group-hover:scale-110 transition-transform">
                      <Zap className="w-8 h-8 text-neon-green" />
                    </div>
                    <h3 className="font-display text-xl text-neon-green mb-2">BUG SOLVER</h3>
                    <p className="font-mono text-[10px] tracking-widest text-muted-foreground mb-3">SOLVE THE CHALLENGE</p>
                    <p className="text-xs text-muted-foreground">Join a room and fix the custom bug under the 90-second timer. Same rules, same pressure.</p>
                  </GlassPanel>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* DUO: ROOM SETUP */}
          {arenaMode === "duo" && duoState === "room-setup" && (
            <motion.div
              key="duo-room"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-xl mx-auto px-4 py-12 text-center"
            >
              <button onClick={() => setDuoState("role-select")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-mono text-xs mb-8 transition-colors">
                <ArrowLeft className="w-3 h-3" /> BACK
              </button>

              <h2 className="font-display text-2xl mb-8">
                {duoRole === "setter" ? (
                  <span className="text-accent">CREATE <span className="text-glow-pink">ROOM</span></span>
                ) : (
                  <span className="text-neon-green">JOIN <span className="text-glow-green">ROOM</span></span>
                )}
              </h2>

              {duoRole === "setter" ? (
                <div>
                  <GlassPanel className="p-6 mb-6">
                    <p className="font-mono text-xs text-muted-foreground mb-4">Create a room and share the code with your opponent</p>
                    <button
                      onClick={initDuoRoom}
                      className="px-6 py-3 rounded-lg border border-accent bg-accent/10 font-mono text-sm tracking-widest text-accent hover:bg-accent/20 transition-all glow-pink"
                    >
                      <Bug className="w-4 h-4 inline mr-2" />
                      GENERATE ROOM
                    </button>
                  </GlassPanel>
                </div>
              ) : (
                <GlassPanel className="p-6">
                  <p className="font-mono text-xs text-muted-foreground mb-4">Enter the 6-digit room code from the Bug Setter</p>
                  <div className="flex gap-2 justify-center mb-4">
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                      placeholder="ENTER CODE"
                      maxLength={6}
                      className="w-48 bg-transparent border border-border/40 rounded-lg px-4 py-3 font-mono text-xl tracking-[0.5em] text-center text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-neon-green/50 transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => { setRoomCode(joinCode); setDuoState("waiting"); }}
                    disabled={joinCode.length < 6}
                    className="px-6 py-3 rounded-lg border border-neon-green bg-neon-green/10 font-mono text-sm tracking-widest text-neon-green hover:bg-neon-green/20 transition-all glow-green disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    JOIN ROOM
                  </button>
                </GlassPanel>
              )}
            </motion.div>
          )}

          {/* DUO: WAITING / ROOM CODE */}
          {arenaMode === "duo" && duoState === "waiting" && (
            <motion.div
              key="duo-waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-xl mx-auto px-4 py-12 text-center"
            >
              <GlassPanel className="p-8">
                <div className="font-mono text-[10px] tracking-widest text-muted-foreground mb-4">ROOM CODE</div>
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="font-mono text-4xl tracking-[0.5em] text-primary text-glow-cyan">{roomCode}</div>
                  <button onClick={copyRoomCode} className="p-2 rounded-lg border border-border/30 hover:border-primary/30 transition-colors">
                    {codeCopied ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-8 mb-8">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-xl glass flex items-center justify-center text-2xl border border-primary/30 mb-2">🧬</div>
                    <div className="font-mono text-[10px] text-primary">YOU ({duoRole.toUpperCase()})</div>
                  </div>
                  <div className="font-mono text-muted-foreground">
                    {opponentReady ? (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-neon-green">CONNECTED</motion.span>
                    ) : (
                      <span className="animate-pulse">WAITING...</span>
                    )}
                  </div>
                  <div className="text-center">
                    <div className={`w-14 h-14 rounded-xl glass flex items-center justify-center text-2xl border mb-2 ${opponentReady ? "border-neon-green/30" : "border-border/20"}`}>
                      {opponentReady ? "👑" : "❓"}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">{opponentReady ? "NullPtr_Queen" : "WAITING..."}</div>
                  </div>
                </div>

                {opponentReady && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    {duoRole === "setter" ? (
                      <button
                        onClick={() => setDuoState("setter-editor")}
                        className="px-6 py-3 rounded-lg border border-accent bg-accent/10 font-mono text-sm tracking-widest text-accent hover:bg-accent/20 transition-all glow-pink"
                      >
                        <FileCode className="w-4 h-4 inline mr-2" />
                        CREATE BUG CHALLENGE
                      </button>
                    ) : (
                      <div className="font-mono text-xs text-muted-foreground animate-pulse">
                        Waiting for Bug Setter to deploy challenge...
                      </div>
                    )}
                  </motion.div>
                )}
              </GlassPanel>
            </motion.div>
          )}

          {/* DUO: SETTER EDITOR */}
          {arenaMode === "duo" && duoState === "setter-editor" && (
            <motion.div
              key="setter-editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-[calc(100vh-4rem)]"
            >
              {/* Top Bar */}
              <div className="h-12 border-b border-border/50 glass-subtle flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <Bug className="w-4 h-4 text-accent" />
                  <span className="font-mono text-xs text-accent">BUG SETTER MODE</span>
                </div>
                <button
                  onClick={() => {
                    // Simulate deploying to solver
                    toast({ title: "🐛 Bug Deployed!", description: "Your opponent is now solving your challenge." });
                    setTimeout(() => startDuoSolverGame(), 1000);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-accent/10 border border-accent/30 font-mono text-xs tracking-widest text-accent hover:bg-accent/20 transition-all glow-pink"
                >
                  <Zap className="w-3 h-3 inline mr-1" />
                  DEPLOY BUG
                </button>
              </div>

              <div className="flex h-[calc(100vh-4rem-3rem)]">
                {/* Left: Config */}
                <div className="w-[350px] border-r border-border/50 p-4 space-y-4 bg-surface-1/50 overflow-y-auto">
                  <div>
                    <label className="font-mono text-[10px] tracking-widest text-muted-foreground block mb-1">CHALLENGE TITLE</label>
                    <input
                      type="text"
                      value={setterTitle}
                      onChange={(e) => setSetterTitle(e.target.value)}
                      placeholder="e.g. Race Condition in API Handler"
                      className="w-full bg-transparent border border-border/30 rounded px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-accent/40"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] tracking-widest text-muted-foreground block mb-1">DESCRIPTION</label>
                    <textarea
                      value={setterDescription}
                      onChange={(e) => setSetterDescription(e.target.value)}
                      placeholder="Describe the bug scenario..."
                      rows={4}
                      className="w-full bg-transparent border border-border/30 rounded px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-accent/40 resize-none"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] tracking-widest text-muted-foreground block mb-1">DIFFICULTY</label>
                    <div className="flex gap-2">
                      {(["EASY", "MEDIUM", "HARD", "EXTREME"] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setSetterDifficulty(d)}
                          className={`px-3 py-1 rounded font-mono text-[10px] border transition-all ${
                            setterDifficulty === d
                              ? d === "EXTREME" ? "border-accent/60 text-accent bg-accent/10" :
                                d === "HARD" ? "border-neon-yellow/60 text-neon-yellow bg-neon-yellow/10" :
                                d === "MEDIUM" ? "border-primary/60 text-primary bg-primary/10" :
                                "border-neon-green/60 text-neon-green bg-neon-green/10"
                              : "border-border/30 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border/20 pt-4">
                    <label className="font-mono text-[10px] tracking-widest text-muted-foreground block mb-2">OR USE A TEMPLATE</label>
                    {bugScenarios.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSetterCode(s.buggyCode);
                          setSetterTitle(s.title);
                          setSetterDescription(s.description);
                          setSetterDifficulty(s.difficulty as any);
                        }}
                        className="w-full text-left p-2 rounded border border-border/10 hover:border-primary/20 hover:bg-primary/5 mb-2 transition-all"
                      >
                        <div className="font-mono text-[10px] text-foreground">{s.title}</div>
                        <div className="font-mono text-[9px] text-muted-foreground">{s.difficulty}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: Code Editor */}
                <div className="flex-1">
                  <div className="h-8 bg-surface-1/50 border-b border-border/20 flex items-center px-4">
                    <span className="font-mono text-[10px] text-muted-foreground">Write or paste your buggy code below</span>
                  </div>
                  <Editor
                    height="calc(100% - 2rem)"
                    defaultLanguage="typescript"
                    value={setterCode}
                    onChange={(v) => setSetterCode(v || "")}
                    theme="vs-dark"
                    options={{
                      fontSize: 13,
                      fontFamily: "'JetBrains Mono', monospace",
                      minimap: { enabled: false },
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      padding: { top: 16 },
                      wordWrap: "on",
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* SOLO LOBBY */}
          {arenaMode === "solo" && gameState === "lobby" && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-5xl mx-auto px-4 py-12"
            >
              <button onClick={handleBackToModeSelect} className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-mono text-xs mb-8 transition-colors">
                <ArrowLeft className="w-3 h-3" /> BACK TO MODE SELECT
              </button>

              <div className="text-center mb-12">
                <span className="font-mono text-xs tracking-[0.3em] text-primary">// SELECT CHALLENGE</span>
                <h1 className="font-display text-4xl md:text-5xl mt-2">
                  SOLO <span className="text-primary text-glow-cyan">ARENA</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-2 font-mono">Choose your battlefield. 90 seconds. One shot.</p>
              </div>

              <div className="grid gap-4">
                {bugScenarios.map((scenario, i) => (
                  <motion.div
                    key={scenario.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => startGame(scenario)}
                  >
                    <GlassPanel className="group cursor-pointer p-6 hover:border-primary/30 transition-all hover:bg-primary/5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                              scenario.difficulty === "EXTREME" ? "border-accent/50 text-accent" :
                              scenario.difficulty === "HARD" ? "border-neon-yellow/50 text-neon-yellow" :
                              "border-neon-green/50 text-neon-green"
                            }`}>
                              {scenario.difficulty}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">{scenario.language.toUpperCase()}</span>
                          </div>
                          <h3 className="font-display text-lg">{scenario.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{scenario.description}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mt-2" />
                      </div>
                    </GlassPanel>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* VS SCREEN */}
          {gameState === "vs-screen" && (
            <motion.div
              key="vs-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-[calc(100vh-4rem)] flex items-center justify-center"
            >
              <div className="text-center">
                <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", bounce: 0.4 }} className="mb-8">
                  <div className="flex items-center justify-center gap-8">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-xl glass flex items-center justify-center text-3xl border border-primary/30 glow-cyan mb-2">🧬</div>
                      <div className="font-mono text-xs text-primary">YOU</div>
                    </div>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }} className="font-display text-4xl text-accent text-glow-pink">
                      VS
                    </motion.div>
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-xl glass flex items-center justify-center text-3xl border border-accent/30 glow-pink mb-2">
                        {arenaMode === "duo" ? "👑" : <Skull className="w-8 h-8 text-accent" />}
                      </div>
                      <div className="font-mono text-xs text-accent">{arenaMode === "duo" ? "NullPtr_Queen" : "AI HECKLER"}</div>
                    </div>
                  </div>
                </motion.div>
                <div className="font-mono text-sm text-muted-foreground mb-2">{selectedScenario.title}</div>
                <motion.div key={vsCountdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-7xl text-primary text-glow-cyan">
                  {vsCountdown > 0 ? vsCountdown : "GO!"}
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* PLAYING */}
          {(gameState === "playing" || gameState === "submitted") && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[calc(100vh-4rem)]">
              <div className="h-12 border-b border-border/50 glass-subtle flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <Bug className="w-4 h-4 text-primary" />
                  <span className="font-mono text-xs text-muted-foreground">{selectedScenario.title}</span>
                  {arenaMode === "duo" && <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-secondary/50 text-secondary">DUO</span>}
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                    selectedScenario.difficulty === "EXTREME" ? "border-accent/50 text-accent" :
                    selectedScenario.difficulty === "HARD" ? "border-neon-yellow/50 text-neon-yellow" :
                    "border-neon-green/50 text-neon-green"
                  }`}>{selectedScenario.difficulty}</span>
                </div>
                <div className="flex items-center gap-4">
                  <ArenaTimer timeLeft={timeLeft} totalTime={90} />
                  <button onClick={handleSubmit} disabled={gameState === "submitted"} className="px-4 py-1.5 rounded-lg bg-neon-green/10 border border-neon-green/30 font-mono text-xs tracking-widest text-neon-green hover:bg-neon-green/20 transition-all disabled:opacity-50 glow-green">
                    <Play className="w-3 h-3 inline mr-1" /> DEPLOY (⌘↵)
                  </button>
                </div>
              </div>

              <div className="h-1 bg-muted">
                <motion.div className={`h-full ${timeLeft > 30 ? "bg-neon-green" : timeLeft > 15 ? "bg-neon-yellow" : "bg-accent"}`} initial={{ width: "100%" }} animate={{ width: `${(timeLeft / 90) * 100}%` }} transition={{ duration: 0.5 }} />
              </div>

              <div className="flex h-[calc(100vh-4rem-3rem-4px)]">
                <div className="w-[380px] border-r border-border/50 flex flex-col bg-surface-1/50">
                  <div className="p-4 border-b border-border/30 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3 h-3 text-accent" />
                      <span className="font-mono text-[10px] tracking-widest text-accent">STACK TRACE</span>
                    </div>
                    <pre className="font-mono text-[11px] text-muted-foreground bg-background/50 p-3 rounded overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">{selectedScenario.stackTrace}</pre>
                    <div className="mt-3 px-3 py-2 rounded bg-primary/5 border border-primary/20">
                      <span className="font-mono text-[10px] text-primary">💡 HINT: </span>
                      <span className="font-mono text-[10px] text-muted-foreground">{selectedScenario.hint}</span>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="px-4 py-2 border-b border-border/30 flex items-center gap-2 flex-shrink-0">
                      <Skull className="w-3 h-3 text-accent" />
                      <span className="font-mono text-[10px] tracking-widest text-accent">AI HECKLER</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse ml-auto" />
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
                        <div className="w-6 h-6 rounded bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Skull className="w-3 h-3 text-accent" />
                        </div>
                        <div className="bg-accent/5 border border-accent/10 rounded-lg px-3 py-2 max-w-[280px]">
                          <p className="font-mono text-xs text-accent/80">Challenge loaded. Let's see what you've got, human. 🎯</p>
                        </div>
                      </motion.div>
                      {heckles.map((msg, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex gap-2">
                          <div className="w-6 h-6 rounded bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Skull className="w-3 h-3 text-accent" />
                          </div>
                          <div className="bg-accent/5 border border-accent/10 rounded-lg px-3 py-2 max-w-[280px]">
                            <p className="font-mono text-xs text-accent/80">{msg}</p>
                          </div>
                        </motion.div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  </div>
                </div>

                <div className={`flex-1 relative ${editorShaking ? "shake" : ""}`} onPaste={handlePaste}>
                  {gameState === "submitted" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-center relative">
                        <div className="absolute inset-0 scanner-line" />
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="font-mono text-sm text-primary animate-pulse">SCANNING CODE...</p>
                        <p className="font-mono text-[10px] text-muted-foreground mt-1">Running tests in Firecracker microVM</p>
                      </div>
                    </motion.div>
                  )}
                  <Editor
                    height="100%"
                    defaultLanguage="typescript"
                    value={code}
                    onChange={(v) => setCode(v || "")}
                    theme="vs-dark"
                    options={{
                      fontSize: 13,
                      fontFamily: "'JetBrains Mono', monospace",
                      minimap: { enabled: false },
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      padding: { top: 16 },
                      renderLineHighlight: "all",
                      bracketPairColorization: { enabled: true },
                      wordWrap: "on",
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* RESULTS */}
          {gameState === "results" && testResults && scores && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto px-4 py-12">
              <div className="text-center mb-12">
                {testResults.passed ? (
                  <>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
                      <CheckCircle className="w-16 h-16 text-neon-green mx-auto glow-green" />
                    </motion.div>
                    <h1 className="font-display text-4xl mt-4 text-neon-green text-glow-green">SUCCESS</h1>
                  </>
                ) : (
                  <>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
                      <ShieldAlert className="w-16 h-16 text-accent mx-auto glow-pink" />
                    </motion.div>
                    <h1 className="font-display text-4xl mt-4 text-accent text-glow-pink">BREACH DETECTED</h1>
                  </>
                )}
                <div className="flex justify-center gap-4 mt-3 font-mono text-xs text-muted-foreground">
                  <span>Time: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}</span>
                  <span>Tests: {testResults.tests.filter((t) => t.passed).length}/{testResults.tests.length}</span>
                  {arenaMode === "duo" && <span className="text-secondary">DUO MODE</span>}
                </div>
              </div>

              <GlassPanel className="mb-8 overflow-hidden">
                <div className="px-6 py-3 bg-surface-2/50 font-mono text-[10px] tracking-widest text-muted-foreground border-b border-border/30">UNIT TEST RESULTS</div>
                {testResults.tests.map((test, i) => (
                  <motion.div key={test.name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-center gap-3 px-6 py-3 border-b border-border/10">
                    {test.passed ? <CheckCircle className="w-4 h-4 text-neon-green" /> : <XCircle className="w-4 h-4 text-accent" />}
                    <span className="font-mono text-sm">{test.name}</span>
                    <span className={`ml-auto font-mono text-[10px] ${test.passed ? "text-neon-green" : "text-accent"}`}>{test.passed ? "PASS" : "FAIL"}</span>
                  </motion.div>
                ))}
              </GlassPanel>

              <GlassPanel className="mb-8 overflow-hidden">
                <div className="px-6 py-3 bg-surface-2/50 border-b border-border/30 flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-widest text-muted-foreground">AI COUNCIL EVALUATION</span>
                  <div className="flex gap-1">
                    {(["efficiency", "security", "style"] as ResultTab[]).map((tab) => (
                      <button key={tab} onClick={() => setResultTab(tab)} className={`px-3 py-1 rounded font-mono text-[10px] tracking-widest transition-all ${resultTab === tab ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"}`}>
                        {tab.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    {Object.entries(scores).map(([key, value], i) => (
                      <motion.div key={key} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.1 }} className="text-center">
                        <div className="relative w-20 h-20 mx-auto mb-2">
                          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="35" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                            <circle cx="40" cy="40" r="35" fill="none" stroke={key === "overall" ? "hsl(var(--primary))" : "hsl(var(--neon-green))"} strokeWidth="3" strokeDasharray={`${(value / 100) * 220} 220`} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`font-display text-lg ${key === "overall" ? "text-primary text-glow-cyan" : "text-neon-green"}`}>{value}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">{key}</span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="border-t border-border/20 pt-4">
                    {resultTab === "efficiency" && (
                      <div className="font-mono text-xs text-muted-foreground space-y-2">
                        <p>• Time complexity analysis: O(n) — optimal for this scenario</p>
                        <p>• Memory allocation reduced by moving lock release after validation</p>
                        <p>• No unnecessary variable copies detected</p>
                      </div>
                    )}
                    {resultTab === "security" && (
                      <div className="font-mono text-xs text-muted-foreground space-y-2">
                        <p>• Race condition addressed: lock now covers full critical section</p>
                        <p>• Session data no longer accessible outside lock scope</p>
                        <p>• Recommendation: consider using Mutex for production</p>
                      </div>
                    )}
                    {resultTab === "style" && (
                      <div className="font-mono text-xs text-muted-foreground space-y-2">
                        <p>• Variable naming follows conventions</p>
                        <p>• Error handling present but could be more descriptive</p>
                        <p>• Consider extracting lock logic into a utility function</p>
                      </div>
                    )}
                  </div>
                </div>
              </GlassPanel>

              <div className="flex justify-center gap-4">
                <button onClick={handleBackToModeSelect} className="px-6 py-2 rounded-lg border border-border font-mono text-xs tracking-widest text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all">
                  <RotateCcw className="w-3 h-3 inline mr-1" /> BACK TO LOBBY
                </button>
                <button onClick={() => arenaMode === "solo" ? startGame(selectedScenario) : startDuoSolverGame()} className="px-6 py-2 rounded-lg bg-primary/10 border border-primary/30 font-mono text-xs tracking-widest text-primary hover:bg-primary/20 transition-all glow-cyan">
                  <Zap className="w-3 h-3 inline mr-1" /> RETRY CHALLENGE
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DebugArena;

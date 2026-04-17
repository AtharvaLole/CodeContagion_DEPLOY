import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Network, Shield, Scissors, Search, AlertTriangle, Users, Clock, Activity, MessageSquare, Send, Eye, Zap, X, User, ArrowLeft, Copy, Check, Mic, MicOff } from "lucide-react";
import CyberNavbar from "@/components/CyberNavbar";
import ArenaTimer from "@/components/ArenaTimer";
import APBattery from "@/components/APBattery";
import GlassPanel from "@/components/GlassPanel";
import { generateNetworkGraph, fakeNewsScenarios, mockMultiplayerPlayers, mockBotChatResponses, playerColors, generateRoomCode, type GraphNode, type GraphEdge } from "@/data/mockData";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SimMode = "select-mode" | "solo" | "multiplayer";
type MultiplayerState = "create-join" | "lobby" | "playing" | "results";
type SimState = "lobby" | "playing" | "results";

const NODE_COLORS: Record<string, string> = {
  susceptible: "#30C9E8",
  infected: "#E8308C",
  recovered: "#30E849",
};

const PLAYER_CHAT_COLORS = ["text-primary", "text-secondary", "text-neon-green", "text-neon-yellow"];

const NetworkGraph = ({
  nodes, edges, onNodeClick, selectedNode,
}: {
  nodes: GraphNode[]; edges: GraphEdge[]; onNodeClick: (node: GraphNode) => void; selectedNode: number | null;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    const draw = () => {
      timeRef.current += 0.016;
      ctx.clearRect(0, 0, rect.width, rect.height);
      const scaleX = rect.width / 800;
      const scaleY = rect.height / 600;

      edges.forEach((edge) => {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) return;
        ctx.beginPath();
        ctx.moveTo(source.x * scaleX, source.y * scaleY);
        ctx.lineTo(target.x * scaleX, target.y * scaleY);
        ctx.strokeStyle = (source.status === "infected" || target.status === "infected") ? "hsla(333, 82%, 55%, 0.15)" : "hsla(193, 78%, 55%, 0.06)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      nodes.forEach((node) => {
        const x = node.x * scaleX;
        const y = node.y * scaleY;
        const color = NODE_COLORS[node.status];
        const isSelected = node.id === selectedNode;
        const isHovered = node.id === hoveredNode;
        const pulseScale = node.status === "infected" ? 1 + Math.sin(timeRef.current * 3) * 0.15 : 1;
        const baseRadius = isSelected ? 8 : isHovered ? 7 : 5;
        const radius = baseRadius * pulseScale;

        if (node.status === "infected") {
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, 22);
          gradient.addColorStop(0, "hsla(333, 82%, 55%, 0.3)");
          gradient.addColorStop(1, "hsla(333, 82%, 55%, 0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, 22, 0, Math.PI * 2);
          ctx.fill();
        }

        if (node.status === "recovered") {
          ctx.strokeStyle = "hsla(130, 90%, 56%, 0.3)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x - 2, y);
          ctx.lineTo(x + 2, y);
          ctx.moveTo(x, y - 2);
          ctx.lineTo(x, y + 2);
          ctx.strokeStyle = "hsla(130, 90%, 56%, 0.5)";
          ctx.stroke();
        }

        if (node.status === "infected") {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const segments = 12;
          for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const jag = i % 2 === 0 ? radius + 3 : radius + 1;
            const px = x + Math.cos(angle) * jag;
            const py = y + Math.sin(angle) * jag;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }

        if (node.status === "susceptible") {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        if (isSelected) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(x, y, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (isHovered) {
          ctx.fillStyle = "white";
          ctx.font = "10px 'JetBrains Mono'";
          ctx.textAlign = "center";
          ctx.fillText(node.label, x, y - 16);
        }
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [nodes, edges, hoveredNode, selectedNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = rect.width / 800;
    const scaleY = rect.height / 600;
    let found: number | null = null;
    for (const node of nodes) {
      const dx = node.x * scaleX - x;
      const dy = node.y * scaleY - y;
      if (Math.sqrt(dx * dx + dy * dy) < 12) { found = node.id; break; }
    }
    setHoveredNode(found);
  }, [nodes]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = rect.width / 800;
    const scaleY = rect.height / 600;
    for (const node of nodes) {
      const dx = node.x * scaleX - x;
      const dy = node.y * scaleY - y;
      if (Math.sqrt(dx * dx + dy * dy) < 12) { onNodeClick(node); return; }
    }
  }, [nodes, onNodeClick]);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-background/50">
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" style={{ width: '100%', height: '100%' }} onMouseMove={handleMouseMove} onClick={handleClick} />
    </div>
  );
};

const MisinfoSim = () => {
  const [simMode, setSimMode] = useState<SimMode>("select-mode");
  const [multiState, setMultiState] = useState<MultiplayerState>("create-join");
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [connectedPlayers, setConnectedPlayers] = useState([mockMultiplayerPlayers[0]]);
  const [chatExpanded, setChatExpanded] = useState(true);

  const [simState, setSimState] = useState<SimState>("lobby");
  const [timeLeft, setTimeLeft] = useState(180);
  const [actionPoints, setActionPoints] = useState(10);
  const maxAP = 15;
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<{ user: string; msg: string; color?: string }[]>([
    { user: "SYSTEM", msg: "Lobby created. Waiting for players...", color: "text-neon-yellow" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [inspectedNode, setInspectedNode] = useState<GraphNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [graphData, setGraphData] = useState(() => generateNetworkGraph());
  const [panicLevel, setPanicLevel] = useState(2);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    if (simState !== "playing" || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(t);
  }, [simState, timeLeft]);

  // AP Recharge
  useEffect(() => {
    if (simState !== "playing") return;
    const t = setInterval(() => setActionPoints((prev) => Math.min(prev + 1, maxAP)), 15000);
    return () => clearInterval(t);
  }, [simState]);

  // SIR spread
  useEffect(() => {
    if (simState !== "playing") return;
    const tick = setInterval(() => {
      setGraphData((prev) => {
        const newNodes = prev.nodes.map((n) => ({ ...n }));
        const infectedIds = newNodes.filter((n) => n.status === "infected").map((n) => n.id);
        infectedIds.forEach((id) => {
          const neighbors = prev.edges.filter((e) => e.source === id || e.target === id).map((e) => (e.source === id ? e.target : e.source));
          neighbors.forEach((nId) => {
            const node = newNodes.find((n) => n.id === nId);
            if (node && node.status === "susceptible" && Math.random() < 0.08) node.status = "infected";
          });
        });
        return { ...prev, nodes: newNodes };
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [simState]);

  useEffect(() => {
    const infected = graphData.nodes.filter((n) => n.status === "infected").length;
    setPanicLevel(Math.round((infected / graphData.nodes.length) * 100));
  }, [graphData]);

  useEffect(() => {
    if ((timeLeft <= 0 || panicLevel >= 80) && simState === "playing") setSimState("results");
  }, [timeLeft, panicLevel, simState]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  // Simulate players joining in multiplayer lobby
  useEffect(() => {
    if (multiState !== "lobby") return;
    const timers: NodeJS.Timeout[] = [];
    if (connectedPlayers.length < 2) {
      timers.push(setTimeout(() => {
        setConnectedPlayers((p) => [...p, mockMultiplayerPlayers[1]]);
        setChatMessages((m) => [...m, { user: "SYSTEM", msg: "NullPtr_Queen has joined the room!", color: "text-neon-yellow" }]);
      }, 2000));
    }
    if (connectedPlayers.length < 3) {
      timers.push(setTimeout(() => {
        setConnectedPlayers((p) => [...p, mockMultiplayerPlayers[2]]);
        setChatMessages((m) => [...m, { user: "SYSTEM", msg: "StackOverflow_IRL has joined the room!", color: "text-neon-yellow" }]);
      }, 5000));
    }
    return () => timers.forEach(clearTimeout);
  }, [multiState, connectedPlayers.length]);

  // Bot chat responses during multiplayer gameplay
  useEffect(() => {
    if (simState !== "playing" || simMode !== "multiplayer") return;
    const interval = setInterval(() => {
      const botNames = connectedPlayers.filter((p) => p.id !== 1);
      if (botNames.length === 0) return;
      const bot = botNames[Math.floor(Math.random() * botNames.length)];
      const msg = mockBotChatResponses[Math.floor(Math.random() * mockBotChatResponses.length)];
      const colorClass = playerColors[bot.color] || "text-muted-foreground";
      setChatMessages((prev) => [...prev, { user: bot.username, msg, color: colorClass }]);
    }, 8000 + Math.random() * 6000);
    return () => clearInterval(interval);
  }, [simState, simMode, connectedPlayers]);

  const startSim = () => {
    setGraphData(generateNetworkGraph());
    setTimeLeft(180);
    setActionPoints(10);
    setSelectedNode(null);
    setInspectedNode(null);
    setDrawerOpen(false);
    setChatMessages([
      { user: "SYSTEM", msg: "Simulation started. Patient Zero detected.", color: "text-neon-yellow" },
      ...(simMode === "solo" ? [
        { user: "FactCheck_AI", msg: "I'll take the northeast cluster.", color: "text-secondary" },
        { user: "MediaWatch", msg: "Monitoring central hub nodes.", color: "text-neon-green" },
      ] : connectedPlayers.filter((p) => p.id !== 1).map((p) => ({
        user: p.username, msg: "Ready to contain!", color: playerColors[p.color],
      }))),
    ]);
    setSimState("playing");
    if (simMode === "multiplayer") setMultiState("playing");
  };

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node.id);
    setInspectedNode(node);
    setDrawerOpen(true);
  }, []);

  const quarantineNode = () => {
    if (!selectedNode || actionPoints < 5) return;
    setActionPoints((p) => p - 5);
    setGraphData((prev) => {
      const newNodes = prev.nodes.map((n) => n.id === selectedNode ? { ...n, status: "recovered" as const } : n);
      const newEdges = prev.edges.filter((e) => e.source !== selectedNode && e.target !== selectedNode);
      return { nodes: newNodes, edges: newEdges };
    });
    setChatMessages((prev) => [...prev, { user: "YOU", msg: `🛡️ Quarantined node ${selectedNode}`, color: "text-primary" }]);
    setDrawerOpen(false);
    setSelectedNode(null);
    setInspectedNode(null);
  };

  const investigateNode = () => {
    if (!inspectedNode || actionPoints < 2) return;
    setActionPoints((p) => p - 2);
    const scenario = fakeNewsScenarios[Math.floor(Math.random() * fakeNewsScenarios.length)];
    setInspectedNode({
      ...inspectedNode,
      content: `${scenario.headline}\n\nSource: ${scenario.source}\nVerdict: ${scenario.isReal ? "✅ REAL" : "❌ FAKE"}\n\n${scenario.evidence}`,
    });
    setChatMessages((prev) => [...prev, { user: "SYSTEM", msg: `🔍 Evidence report generated for ${inspectedNode.label}`, color: "text-neon-yellow" }]);
  };

  const severConnection = () => {
    if (!selectedNode || actionPoints < 1) return;
    setActionPoints((p) => p - 1);
    setGraphData((prev) => {
      const connectedEdges = prev.edges.filter((e) => e.source === selectedNode || e.target === selectedNode);
      if (connectedEdges.length === 0) return prev;
      const edgeToRemove = connectedEdges[Math.floor(Math.random() * connectedEdges.length)];
      return { ...prev, edges: prev.edges.filter((e) => e !== edgeToRemove) };
    });
    setChatMessages((prev) => [...prev, { user: "YOU", msg: `✂️ Severed connection from node ${selectedNode}`, color: "text-primary" }]);
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, { user: "YOU", msg: chatInput, color: "text-primary" }]);
    setChatInput("");
    if (simMode === "solo") {
      setTimeout(() => {
        const responses = ["Roger that. Moving to intercept.", "Copy. I see suspicious activity on node 23.", "Good call. Let me verify the source.", "I'll counter-narrative that cluster."];
        setChatMessages((prev) => [...prev, { user: "FactCheck_AI", msg: responses[Math.floor(Math.random() * responses.length)], color: "text-secondary" }]);
      }, 1500 + Math.random() * 2000);
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleBackToModeSelect = () => {
    setSimMode("select-mode");
    setSimState("lobby");
    setMultiState("create-join");
    setConnectedPlayers([mockMultiplayerPlayers[0]]);
  };

  const susceptible = graphData.nodes.filter((n) => n.status === "susceptible").length;
  const infected = graphData.nodes.filter((n) => n.status === "infected").length;
  const recovered = graphData.nodes.filter((n) => n.status === "recovered").length;
  const panicColor = panicLevel < 30 ? "bg-neon-green" : panicLevel < 50 ? "bg-neon-yellow" : "bg-accent";

  return (
    <div className="min-h-screen bg-background cyber-grid">
      <CyberNavbar />
      <div className="pt-16">
        <AnimatePresence mode="wait">

          {/* MODE SELECTION */}
          {simMode === "select-mode" && (
            <motion.div key="mode-select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto px-4 py-12">
              <div className="text-center mb-12">
                <span className="font-mono text-xs tracking-[0.3em] text-secondary">// SELECT MODE</span>
                <h1 className="font-display text-4xl md:text-5xl mt-2">
                  MISINFO <span className="text-secondary text-glow-purple">SIMULATION</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-2 font-mono">Choose your containment strategy</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <motion.div whileHover={{ scale: 1.02, rotateY: 2 }} onClick={() => { setSimMode("solo"); setSimState("lobby"); }} className="cursor-pointer">
                  <GlassPanel className="p-8 text-center hover:border-primary/40 transition-all group h-full">
                    <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4 border border-primary/30 glow-cyan group-hover:scale-110 transition-transform">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-display text-xl text-primary mb-2">SOLO</h3>
                    <p className="font-mono text-[10px] tracking-widest text-muted-foreground mb-3">YOU + AI TEAMMATES</p>
                    <p className="text-xs text-muted-foreground">Contain the outbreak with AI-controlled teammates. Full control, all the pressure.</p>
                  </GlassPanel>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02, rotateY: -2 }} onClick={() => { setSimMode("multiplayer"); setMultiState("create-join"); }} className="cursor-pointer">
                  <GlassPanel className="p-8 text-center hover:border-secondary/40 transition-all group h-full">
                    <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4 border border-secondary/30 glow-purple group-hover:scale-110 transition-transform">
                      <Users className="w-8 h-8 text-secondary" />
                    </div>
                    <h3 className="font-display text-xl text-secondary mb-2">MULTIPLAYER</h3>
                    <p className="font-mono text-[10px] tracking-widest text-muted-foreground mb-3">UP TO 4 PLAYERS</p>
                    <p className="text-xs text-muted-foreground">Team up with friends. Create or join a room. Coordinate via live chat to contain the spread.</p>
                  </GlassPanel>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* MULTIPLAYER: CREATE / JOIN */}
          {simMode === "multiplayer" && multiState === "create-join" && (
            <motion.div key="mp-create-join" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-xl mx-auto px-4 py-12">
              <button onClick={handleBackToModeSelect} className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-mono text-xs mb-8 transition-colors">
                <ArrowLeft className="w-3 h-3" /> BACK
              </button>
              <div className="text-center mb-8">
                <h2 className="font-display text-2xl text-secondary text-glow-purple">MULTIPLAYER LOBBY</h2>
              </div>

              <div className="grid gap-4">
                <GlassPanel className="p-6 text-center">
                  <h3 className="font-display text-lg text-primary mb-3">CREATE ROOM</h3>
                  <p className="font-mono text-xs text-muted-foreground mb-4">Start a new room and invite up to 3 friends</p>
                  <button
                    onClick={() => {
                      setRoomCode(generateRoomCode());
                      setConnectedPlayers([mockMultiplayerPlayers[0]]);
                      setChatMessages([{ user: "SYSTEM", msg: "Room created. Share the code with your team.", color: "text-neon-yellow" }]);
                      setMultiState("lobby");
                    }}
                    className="px-6 py-3 rounded-lg border border-primary bg-primary/10 font-mono text-sm tracking-widest text-primary hover:bg-primary/20 transition-all glow-cyan"
                  >
                    <Network className="w-4 h-4 inline mr-2" />
                    CREATE ROOM
                  </button>
                </GlassPanel>

                <div className="flex items-center gap-3 px-4">
                  <div className="flex-1 h-px bg-border/30" />
                  <span className="font-mono text-[10px] text-muted-foreground">OR</span>
                  <div className="flex-1 h-px bg-border/30" />
                </div>

                <GlassPanel className="p-6 text-center">
                  <h3 className="font-display text-lg text-secondary mb-3">JOIN ROOM</h3>
                  <p className="font-mono text-xs text-muted-foreground mb-4">Enter a 6-digit room code to join</p>
                  <div className="flex gap-2 justify-center mb-4">
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                      placeholder="ENTER CODE"
                      maxLength={6}
                      className="w-48 bg-transparent border border-border/40 rounded-lg px-4 py-3 font-mono text-xl tracking-[0.5em] text-center text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-secondary/50 transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setRoomCode(joinCode);
                      setConnectedPlayers([mockMultiplayerPlayers[0]]);
                      setChatMessages([{ user: "SYSTEM", msg: "Joined room. Waiting for host to start.", color: "text-neon-yellow" }]);
                      setMultiState("lobby");
                    }}
                    disabled={joinCode.length < 6}
                    className="px-6 py-3 rounded-lg border border-secondary bg-secondary/10 font-mono text-sm tracking-widest text-secondary hover:bg-secondary/20 transition-all glow-purple disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    JOIN ROOM
                  </button>
                </GlassPanel>
              </div>
            </motion.div>
          )}

          {/* MULTIPLAYER: LOBBY */}
          {simMode === "multiplayer" && multiState === "lobby" && (
            <motion.div key="mp-lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto px-4 py-12">
              <button onClick={() => setMultiState("create-join")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-mono text-xs mb-8 transition-colors">
                <ArrowLeft className="w-3 h-3" /> BACK
              </button>

              {/* Room Code */}
              <GlassPanel className="p-6 text-center mb-6">
                <div className="font-mono text-[10px] tracking-widest text-muted-foreground mb-2">ROOM CODE</div>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="font-mono text-3xl tracking-[0.5em] text-secondary text-glow-purple">{roomCode}</div>
                  <button onClick={copyRoomCode} className="p-2 rounded-lg border border-border/30 hover:border-secondary/30 transition-colors">
                    {codeCopied ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
              </GlassPanel>

              {/* Player Slots */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[0, 1, 2, 3].map((slot) => {
                  const player = connectedPlayers[slot];
                  return (
                    <GlassPanel key={slot} className={`p-4 text-center ${player ? "border-neon-green/20" : "border-border/10 opacity-40"}`}>
                      <div className={`w-12 h-12 rounded-xl glass flex items-center justify-center text-xl mx-auto mb-2 ${player ? "border border-neon-green/30" : "border border-border/20"}`}>
                        {player ? player.avatar : "❓"}
                      </div>
                      <div className="font-mono text-[10px] text-foreground">{player ? player.username : "EMPTY"}</div>
                      {player && (
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                          <span className="font-mono text-[8px] text-neon-green">READY</span>
                        </div>
                      )}
                    </GlassPanel>
                  );
                })}
              </div>

              {/* Lobby Chat */}
              <GlassPanel className="mb-6">
                <div className="px-4 py-2 border-b border-border/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3 h-3 text-secondary" />
                    <span className="font-mono text-[10px] tracking-widest text-muted-foreground">LOBBY CHAT</span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="p-1 rounded text-muted-foreground/30 cursor-not-allowed" disabled>
                          <MicOff className="w-3 h-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono text-xs">Voice Chat — Coming Soon</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="max-h-32 overflow-y-auto p-3 space-y-1">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className="font-mono text-[10px]">
                      <span className={msg.color || "text-muted-foreground"}>[{msg.user}]</span>{" "}
                      <span className="text-muted-foreground">{msg.msg}</span>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-2 border-t border-border/20 flex gap-1">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                    placeholder="Message..."
                    className="flex-1 bg-transparent border border-border/20 rounded px-2 py-1 font-mono text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-secondary/30"
                  />
                  <button onClick={sendChat} className="p-1 rounded text-secondary hover:bg-secondary/10">
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </GlassPanel>

              <div className="text-center">
                <button
                  onClick={startSim}
                  disabled={connectedPlayers.length < 2}
                  className="px-8 py-3 rounded-lg border border-secondary bg-secondary/10 font-mono text-sm tracking-widest text-secondary hover:bg-secondary/20 transition-all glow-purple disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Zap className="w-4 h-4 inline mr-2" />
                  START EPIDEMIC ({connectedPlayers.length}/4 PLAYERS)
                </button>
              </div>
            </motion.div>
          )}

          {/* SOLO LOBBY */}
          {simMode === "solo" && simState === "lobby" && (
            <motion.div key="solo-lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto px-4 py-12 text-center">
              <button onClick={handleBackToModeSelect} className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-mono text-xs mb-8 transition-colors">
                <ArrowLeft className="w-3 h-3" /> BACK
              </button>

              <span className="font-mono text-xs tracking-[0.3em] text-primary">// SOLO MODE</span>
              <h1 className="font-display text-4xl md:text-5xl mt-2 mb-4">
                MISINFO <span className="text-primary text-glow-cyan">SIMULATION</span>
              </h1>
              <p className="text-sm text-muted-foreground font-mono max-w-xl mx-auto mb-8">
                Contain the spread with AI teammates. Investigate, quarantine, and sever connections before panic breaches 80%.
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
                {[
                  { icon: User, value: "1+AI", label: "TEAM", color: "text-primary" },
                  { icon: Network, value: "50", label: "NODES", color: "text-secondary" },
                  { icon: Clock, value: "3:00", label: "TIME", color: "text-accent" },
                ].map((s) => (
                  <GlassPanel key={s.label} className="p-4 text-center">
                    <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                    <div className={`font-display text-lg ${s.color}`}>{s.value}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{s.label}</div>
                  </GlassPanel>
                ))}
              </div>

              <button onClick={startSim} className="px-8 py-3 rounded-lg border border-primary bg-primary/10 font-mono text-sm tracking-widest text-primary hover:bg-primary/20 transition-all glow-cyan">
                <Zap className="w-4 h-4 inline mr-2" />
                START EPIDEMIC
              </button>
            </motion.div>
          )}

          {/* PLAYING (both solo and multiplayer) */}
          {simState === "playing" && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[calc(100vh-4rem)] relative">
              <div className="absolute inset-0">
                <NetworkGraph nodes={graphData.nodes} edges={graphData.edges} onNodeClick={handleNodeClick} selectedNode={selectedNode} />
              </div>

              {/* HUD: Top Left - Panic Level */}
              <div className="absolute top-4 left-4 z-10">
                <GlassPanel className="p-3 w-64">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${panicLevel > 50 ? "text-accent animate-pulse" : "text-neon-yellow"}`} />
                      <span className="font-mono text-[10px] tracking-widest text-muted-foreground">GLOBAL PANIC</span>
                    </div>
                    <span className={`font-display text-sm ${panicLevel > 50 ? "text-accent" : "text-neon-yellow"}`}>{panicLevel}%</span>
                  </div>
                  <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div className={`h-full rounded-full ${panicColor}`} animate={{ width: `${panicLevel}%` }} transition={{ duration: 0.5 }} />
                  </div>
                  <div className="flex gap-3 mt-2 font-mono text-[9px]">
                    <span className="text-primary">S:{susceptible}</span>
                    <span className="text-accent">I:{infected}</span>
                    <span className="text-neon-green">R:{recovered}</span>
                  </div>
                  {simMode === "multiplayer" && (
                    <div className="mt-2 pt-2 border-t border-border/20 font-mono text-[9px] text-secondary">MULTIPLAYER · {connectedPlayers.length} PLAYERS</div>
                  )}
                </GlassPanel>
              </div>

              {/* HUD: Top Right */}
              <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
                <GlassPanel className="px-4 py-2 flex items-center gap-3">
                  <ArenaTimer timeLeft={timeLeft} totalTime={180} />
                </GlassPanel>
                <GlassPanel className="px-3 py-2">
                  <APBattery current={actionPoints} max={maxAP} />
                </GlassPanel>
                <GlassPanel className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {(simMode === "multiplayer" ? connectedPlayers : [{ avatar: "🧬" }, { avatar: "🤖" }, { avatar: "🔬" }, { avatar: "📡" }]).map((p, i) => (
                      <div key={i} className="relative">
                        <span className="text-sm">{p.avatar}</span>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-neon-green border border-background`} />
                      </div>
                    ))}
                    {simMode === "multiplayer" && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="p-0.5 rounded text-muted-foreground/30 cursor-not-allowed ml-1" disabled>
                              <MicOff className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-mono text-xs">Voice Chat — Coming Soon</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </GlassPanel>
              </div>

              {/* Legend */}
              <div className="absolute bottom-4 left-4 z-10">
                <GlassPanel variant="subtle" className="px-3 py-2 flex gap-4 font-mono text-[9px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-primary" /> Susceptible</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> Infected</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neon-green" /> Recovered</span>
                </GlassPanel>
              </div>

              {/* Chat */}
              <div className="absolute bottom-4 right-4 z-10 w-80">
                <GlassPanel className="flex flex-col">
                  <div className="px-3 py-2 border-b border-border/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3 h-3 text-secondary" />
                      <span className="font-mono text-[9px] tracking-widest text-muted-foreground">
                        {simMode === "multiplayer" ? "TEAM CHAT" : "TEAM COMMS"}
                      </span>
                    </div>
                    <button onClick={() => setChatExpanded(!chatExpanded)} className="text-muted-foreground hover:text-foreground">
                      {chatExpanded ? <X className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                    </button>
                  </div>
                  {chatExpanded && (
                    <>
                      <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-36">
                        {chatMessages.slice(-10).map((msg, i) => (
                          <div key={i} className="font-mono text-[10px]">
                            <span className={msg.color || "text-muted-foreground"}>[{msg.user}]</span>{" "}
                            <span className="text-muted-foreground">{msg.msg}</span>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="p-2 border-t border-border/20 flex gap-1">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && sendChat()}
                          placeholder="Message..."
                          className="flex-1 bg-transparent border border-border/20 rounded px-2 py-1 font-mono text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-secondary/30"
                        />
                        <button onClick={sendChat} className="p-1 rounded text-secondary hover:bg-secondary/10">
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </GlassPanel>
              </div>

              {/* Investigate Drawer */}
              <AnimatePresence>
                {drawerOpen && inspectedNode && (
                  <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="absolute top-0 right-0 bottom-0 w-[400px] z-20 border-l border-border/30">
                    <GlassPanel className="h-full rounded-none flex flex-col">
                      <div className="p-4 border-b border-border/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-primary" />
                          <span className="font-mono text-xs tracking-widest text-primary">NODE INSPECTOR</span>
                        </div>
                        <button onClick={() => setDrawerOpen(false)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                            inspectedNode.status === "infected" ? "bg-accent/10 border border-accent/30" :
                            inspectedNode.status === "recovered" ? "bg-neon-green/10 border border-neon-green/30" :
                            "bg-primary/10 border border-primary/30"
                          }`}>{inspectedNode.id}</div>
                          <div>
                            <div className="font-mono text-sm text-foreground">{inspectedNode.label}</div>
                            <div className={`font-mono text-[10px] ${
                              inspectedNode.status === "infected" ? "text-accent" :
                              inspectedNode.status === "recovered" ? "text-neon-green" : "text-primary"
                            }`}>{inspectedNode.status.toUpperCase()}</div>
                          </div>
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          Followers: <span className="text-foreground">{inspectedNode.followers.toLocaleString()}</span>
                        </div>
                        {inspectedNode.content && (
                          <div className="p-3 bg-surface-1/50 rounded-lg border border-border/20">
                            <pre className="font-mono text-[10px] text-muted-foreground whitespace-pre-wrap">{inspectedNode.content}</pre>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <button onClick={investigateNode} disabled={actionPoints < 2} className="flex flex-col items-center gap-1 p-3 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            <Search className="w-5 h-5" />
                            <span className="text-[10px] font-mono">DEPLOY FACT-CHECK</span>
                            <span className="text-[9px] font-mono opacity-60">2 AP</span>
                          </button>
                          <button onClick={quarantineNode} disabled={actionPoints < 5} className="flex flex-col items-center gap-1 p-3 rounded-lg border border-neon-green/30 bg-neon-green/5 text-neon-green hover:bg-neon-green/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            <Shield className="w-5 h-5" />
                            <span className="text-[10px] font-mono">QUARANTINE NODE</span>
                            <span className="text-[9px] font-mono opacity-60">5 AP</span>
                          </button>
                        </div>
                        <button onClick={severConnection} disabled={actionPoints < 1} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-secondary/30 bg-secondary/5 text-secondary hover:bg-secondary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                          <Scissors className="w-4 h-4" />
                          <span className="text-[10px] font-mono">SEVER CONNECTION</span>
                          <span className="text-[9px] font-mono opacity-60">1 AP</span>
                        </button>
                      </div>
                    </GlassPanel>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* RESULTS */}
          {simState === "results" && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto px-4 py-12 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                {panicLevel < 30 ? (
                  <Shield className="w-16 h-16 text-neon-green mx-auto glow-green" />
                ) : panicLevel < 60 ? (
                  <AlertTriangle className="w-16 h-16 text-neon-yellow mx-auto" />
                ) : (
                  <AlertTriangle className="w-16 h-16 text-accent mx-auto glow-pink" />
                )}
              </motion.div>
              <h1 className="font-display text-4xl mt-4">
                {panicLevel < 30 ? (
                  <span className="text-neon-green text-glow-green">CONTAINMENT SUCCESS</span>
                ) : panicLevel < 60 ? (
                  <span className="text-neon-yellow">PARTIAL CONTAINMENT</span>
                ) : (
                  <span className="text-accent text-glow-pink">CONTAINMENT FAILED</span>
                )}
              </h1>
              {simMode === "multiplayer" && (
                <div className="font-mono text-xs text-secondary mt-2">MULTIPLAYER · {connectedPlayers.length} PLAYERS</div>
              )}

              <div className="grid grid-cols-3 gap-4 mt-8 max-w-md mx-auto">
                {[
                  { value: susceptible, label: "SAFE", color: "text-primary" },
                  { value: infected, label: "INFECTED", color: "text-accent" },
                  { value: recovered, label: "RECOVERED", color: "text-neon-green" },
                ].map((s) => (
                  <GlassPanel key={s.label} className="p-4">
                    <div className={`font-display text-2xl ${s.color}`}>{s.value}</div>
                    <div className="font-mono text-[10px] text-muted-foreground mt-1">{s.label}</div>
                  </GlassPanel>
                ))}
              </div>

              <div className="mt-8">
                <div className="font-mono text-xs text-muted-foreground mb-2">TEAM EFFICACY SCORE</div>
                <div className="font-display text-5xl text-primary text-glow-cyan">{Math.max(0, 100 - panicLevel)}%</div>
              </div>

              <button onClick={handleBackToModeSelect} className="mt-8 px-8 py-3 rounded-lg border border-secondary bg-secondary/10 font-mono text-sm tracking-widest text-secondary hover:bg-secondary/20 transition-all glow-purple">
                PLAY AGAIN
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MisinfoSim;

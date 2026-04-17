// Debug Arena mock data
export const bugScenarios = [
  {
    id: 1,
    title: "Race Condition in User Session Handler",
    language: "typescript",
    difficulty: "HARD",
    description: "A critical race condition has been detected in the session management module. Users are intermittently receiving other users' session data. The DevOps team has narrowed it down to the `SessionManager` class.",
    stackTrace: `TypeError: Cannot read properties of undefined (reading 'userId')
    at SessionManager.getSession (session.ts:24:18)
    at AuthMiddleware.validate (auth.ts:15:32)
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async Router.handle (router.ts:67:5)`,
    buggyCode: `class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private lock: boolean = false;

  async getSession(token: string): Promise<Session> {
    while (this.lock) {
      await new Promise(r => setTimeout(r, 10));
    }
    this.lock = true;

    const session = this.sessions.get(token);
    // BUG: Lock released before session validation
    this.lock = false;

    if (!session) {
      throw new Error('Session not found');
    }

    // This runs AFTER lock release - race condition!
    session.lastAccessed = Date.now();
    return session;
  }

  async createSession(userId: string): Promise<string> {
    const token = crypto.randomUUID();
    this.sessions.set(token, {
      userId,
      lastAccessed: Date.now(),
      created: Date.now()
    });
    return token;
  }
}`,
    hint: "The lock is released before the session object is fully processed.",
  },
  {
    id: 2,
    title: "Off-By-One in Pagination Logic",
    language: "typescript",
    difficulty: "MEDIUM",
    description: "Users report that the last page of search results always shows one duplicate item from the previous page. The QA team confirmed this affects all paginated endpoints.",
    stackTrace: `Expected 10 items on page 3, received 11
    at PaginationService.paginate (pagination.ts:18:5)
    at SearchController.search (search.ts:42:20)
    at async Router.handle (router.ts:67:5)`,
    buggyCode: `interface PaginationResult<T> {
  items: T[];
  page: number;
  totalPages: number;
  hasNext: boolean;
}

function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): PaginationResult<T> {
  const totalPages = Math.ceil(items.length / pageSize);

  // BUG: Start index calculation is wrong
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize + 1; // Off by one!

  const pageItems = items.slice(startIndex, endIndex);

  return {
    items: pageItems,
    page,
    totalPages,
    hasNext: page <= totalPages, // Should be <
  };
}`,
    hint: "Check the endIndex calculation and the hasNext comparison.",
  },
  {
    id: 3,
    title: "Memory Leak in WebSocket Pool",
    language: "typescript",
    difficulty: "EXTREME",
    description: "Production servers are running out of memory after ~6 hours. The monitoring dashboard shows a steady climb in heap usage correlated with WebSocket connection events.",
    stackTrace: `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed
    - JavaScript heap out of memory
    at WebSocketPool.handleConnection (ws-pool.ts:31:5)
    at Server.onUpgrade (server.ts:18:12)`,
    buggyCode: `class WebSocketPool {
  private connections: Map<string, WebSocket> = new Map();
  private messageHistory: any[] = [];

  handleConnection(ws: WebSocket, userId: string) {
    this.connections.set(userId, ws);

    ws.on('message', (data: string) => {
      const parsed = JSON.parse(data);
      // BUG: messageHistory grows unbounded
      this.messageHistory.push({
        userId,
        data: parsed,
        timestamp: Date.now(),
        connection: ws // Retaining reference to ws object!
      });
      this.broadcast(parsed);
    });

    ws.on('close', () => {
      this.connections.delete(userId);
      // BUG: Never cleans up messageHistory entries
      // BUG: Event listeners not removed
    });
  }

  private broadcast(data: any) {
    this.connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  }
}`,
    hint: "The messageHistory array grows forever and retains WebSocket references.",
  },
];

export const hecklerMessages = [
  "Are you seriously trying to solve a race condition with setTimeout? Bold strategy. 🤡",
  "I've seen faster debugging from a rubber duck. At least the duck doesn't type wrong.",
  "That's an interesting approach... if by 'interesting' you mean 'completely wrong'.",
  "The clock is ticking. Your code isn't the only thing that's broken here.",
  "Ah yes, the classic 'delete random lines and pray' technique. A timeless strategy.",
  "You know there's a bug, right? Not the one in the code. The one behind the keyboard.",
  "50 seconds left. I've seen compilers produce better code by accident.",
  "Is that a fix or a new feature request? Hard to tell from here.",
  "Pro tip: the bug is in the code, not in the console.log you just added.",
  "Even GPT-2 could solve this faster. And it's been deprecated.",
  "Your keystrokes sound confident. Your code says otherwise.",
  "At this rate, the production server will fix itself before you do.",
  "I'm not saying your solution is wrong... actually, yes I am. It's very wrong.",
  "30 seconds. Tick tock. Your imposter syndrome was right all along.",
  "That variable name is a war crime. The Hague will hear about this.",
];

// Misinformation Simulation mock data
export interface GraphNode {
  id: number;
  x: number;
  y: number;
  status: 'susceptible' | 'infected' | 'recovered';
  label: string;
  followers: number;
  content?: string;
}

export interface GraphEdge {
  source: number;
  target: number;
}

export const generateNetworkGraph = () => {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const labels = [
    "NewsBot_42", "TruthSeeker", "ViralVince", "FactCheck_AI", "DataDiva",
    "InfoWars_X", "MediaWatch", "ClickBait99", "DeepFake_Dan", "RealNews_Hub",
    "Echo_Chamber", "BotNetwork", "Verified_Sue", "Troll_Farm_7", "CryptoGuru",
    "PolitiCheck", "Meme_Lord", "Conspiracy_K", "Source_Check", "AI_Reporter",
    "DisInfo_Lab", "Fact_Ninja", "Spam_King", "Truth_Bot", "Fake_Alert",
    "Media_Bias", "Bot_Hunter", "News_Watcher", "Signal_Boost", "Noise_Filter",
    "Echo_Bot", "Truth_Radar", "Misinfo_Map", "Data_Stream", "Net_Patrol",
    "Code_Break", "Virus_Track", "Clean_Feed", "Safe_Zone", "Red_Flag",
    "Blue_Check", "Gray_Area", "Dark_Web", "Light_Source", "Mid_Ground",
    "Hot_Take", "Cold_Facts", "Raw_Data", "Pure_Signal", "Static_Noise",
  ];

  for (let i = 0; i < 50; i++) {
    const angle = (i / 50) * Math.PI * 2;
    const radius = 200 + Math.random() * 150;
    nodes.push({
      id: i,
      x: 400 + Math.cos(angle) * radius + (Math.random() - 0.5) * 80,
      y: 300 + Math.sin(angle) * radius + (Math.random() - 0.5) * 80,
      status: i === 0 ? 'infected' : 'susceptible',
      label: labels[i] || `Node_${i}`,
      followers: Math.floor(Math.random() * 50000) + 100,
    });
  }

  // Create small-world connections
  for (let i = 0; i < 50; i++) {
    // Connect to neighbors
    const numConnections = 2 + Math.floor(Math.random() * 3);
    for (let j = 0; j < numConnections; j++) {
      const target = (i + j + 1) % 50;
      if (!edges.find(e => (e.source === i && e.target === target) || (e.source === target && e.target === i))) {
        edges.push({ source: i, target });
      }
    }
    // Random long-range connections
    if (Math.random() > 0.7) {
      const randomTarget = Math.floor(Math.random() * 50);
      if (randomTarget !== i) {
        edges.push({ source: i, target: randomTarget });
      }
    }
  }

  return { nodes, edges };
};

export const fakeNewsScenarios = [
  {
    id: 1,
    headline: "BREAKING: Major Tech Company Secretly Mining Cryptocurrency Using Customer Devices",
    source: "TechInsider_Leak",
    isReal: false,
    evidence: "No official reports from the company. Source account created 2 days ago. Image metadata shows AI generation artifacts.",
    viralityMultiplier: 2.5,
  },
  {
    id: 2,
    headline: "New Study Links 5G Towers to Disrupted Bird Migration Patterns",
    source: "ScienceDaily_Alt",
    isReal: false,
    evidence: "The cited 'University of Stockholm' study does not exist. No peer-reviewed publication found. Original image is from 2018.",
    viralityMultiplier: 1.8,
  },
  {
    id: 3,
    headline: "Government Announces New Cybersecurity Framework for Critical Infrastructure",
    source: "CISA_Official",
    isReal: true,
    evidence: "Confirmed by official government press release. Multiple verified news outlets reporting. PDF available on .gov domain.",
    viralityMultiplier: 1.0,
  },
];

export const mockLeaderboard = [
  { rank: 1, username: "ByteSlayer_X", elo: 2847, wins: 342, avatar: "🥷", streak: 12 },
  { rank: 2, username: "NullPtr_Queen", elo: 2791, wins: 318, avatar: "👑", streak: 8 },
  { rank: 3, username: "StackOverflow_IRL", elo: 2688, wins: 295, avatar: "🔥", streak: 6 },
  { rank: 4, username: "Bug_Terminator", elo: 2654, wins: 287, avatar: "🤖", streak: 5 },
  { rank: 5, username: "Debug_Demon", elo: 2601, wins: 271, avatar: "👹", streak: 4 },
  { rank: 6, username: "Syntax_Samurai", elo: 2558, wins: 256, avatar: "⚔️", streak: 3 },
  { rank: 7, username: "Zero_Day_Hero", elo: 2499, wins: 243, avatar: "🦸", streak: 7 },
  { rank: 8, username: "Code_Phantom", elo: 2445, wins: 228, avatar: "👻", streak: 2 },
  { rank: 9, username: "Kernel_Panic", elo: 2398, wins: 215, avatar: "💀", streak: 1 },
  { rank: 10, username: "Bit_Flipper", elo: 2344, wins: 201, avatar: "🎯", streak: 3 },
  { rank: 11, username: "Seg_Fault_Sam", elo: 2301, wins: 194, avatar: "💥", streak: 0 },
  { rank: 12, username: "Race_Condition", elo: 2256, wins: 182, avatar: "🏎️", streak: 1 },
];

export const mockUserProfile = {
  username: "CyberOp_Alpha",
  avatar: "🧬",
  elo: 2150,
  rank: 47,
  totalMatches: 156,
  wins: 98,
  losses: 58,
  winRate: 62.8,
  favoriteMode: "Debug Arena",
  memberSince: "2024-11-15",
  achievements: [
    { id: 1, name: "First Blood", description: "Win your first Debug Arena match", icon: "🩸", unlocked: true },
    { id: 2, name: "Speed Demon", description: "Fix a bug in under 30 seconds", icon: "⚡", unlocked: true },
    { id: 3, name: "Contagion Crusher", description: "Contain infection below 10%", icon: "🛡️", unlocked: true },
    { id: 4, name: "Heckler Proof", description: "Win 10 matches without getting tilted", icon: "🧘", unlocked: true },
    { id: 5, name: "Perfect Score", description: "Score 100 on all AI Council metrics", icon: "💎", unlocked: false },
    { id: 6, name: "Team Player", description: "Win 20 Misinfo Sim cooperative rounds", icon: "🤝", unlocked: true },
    { id: 7, name: "Code Ninja", description: "Fix 50 bugs total", icon: "🥷", unlocked: false },
    { id: 8, name: "Legend", description: "Reach ELO 2500", icon: "🏆", unlocked: false },
  ],
  recentMatches: [
    { id: 1, mode: "Debug Arena", result: "WIN", elo_change: +15, scenario: "Race Condition", time: "1:12", date: "2h ago" },
    { id: 2, mode: "Misinfo Sim", result: "WIN", elo_change: +12, scenario: "Network Outbreak", time: "2:45", date: "5h ago" },
    { id: 3, mode: "Debug Arena", result: "LOSS", elo_change: -8, scenario: "Memory Leak", time: "0:00", date: "1d ago" },
    { id: 4, mode: "Debug Arena", result: "WIN", elo_change: +18, scenario: "Off-By-One", time: "0:42", date: "1d ago" },
    { id: 5, mode: "Misinfo Sim", result: "LOSS", elo_change: -5, scenario: "Viral Storm", time: "3:00", date: "2d ago" },
  ],
  weeklyEloHistory: [2050, 2080, 2065, 2110, 2095, 2130, 2150],
  weeklyWins: [3, 5, 2, 4, 6, 3, 5],
};

export const dailyChallenges = [
  { id: 1, title: "Win 3 Debug Arena rounds", progress: 1, total: 3, reward: "+50 XP", icon: "🐛" },
  { id: 2, title: "Contain an outbreak below 20%", progress: 0, total: 1, reward: "+30 XP", icon: "🦠" },
  { id: 3, title: "Score 80+ in AI Council", progress: 2, total: 3, reward: "+40 XP", icon: "🤖" },
];

export const mockRecentActivity = [
  { type: "win", message: "Won Debug Arena — Race Condition in 1:12", time: "2h ago" },
  { type: "achievement", message: "Unlocked 'Team Player' achievement", time: "5h ago" },
  { type: "loss", message: "Lost Debug Arena — Memory Leak (timed out)", time: "1d ago" },
  { type: "win", message: "Won Misinfo Sim — 92% containment", time: "1d ago" },
  { type: "rank", message: "Climbed to rank #47 (+3)", time: "2d ago" },
];

// Multiplayer mock data
export const mockMultiplayerPlayers = [
  { id: 1, username: "CyberOp_Alpha", avatar: "🧬", color: "cyan", status: "ready" as const },
  { id: 2, username: "NullPtr_Queen", avatar: "👑", color: "magenta", status: "ready" as const },
  { id: 3, username: "StackOverflow_IRL", avatar: "🔥", color: "green", status: "waiting" as const },
  { id: 4, username: "Bug_Terminator", avatar: "🤖", color: "amber", status: "offline" as const },
];

export const playerColors: Record<string, string> = {
  cyan: "text-primary",
  magenta: "text-secondary",
  green: "text-neon-green",
  amber: "text-neon-yellow",
};

export const mockBotChatResponses = [
  "Roger that. Moving to intercept.",
  "Copy. I see suspicious activity on node 23.",
  "Good call. Let me verify the source.",
  "I'll counter-narrative that cluster.",
  "Looks like a bot network. Flagging for review.",
  "Confirmed fake. Deploying fact-check now.",
  "Hold on, I'm seeing a new outbreak in sector 7.",
  "Nice quarantine! That cut off the spread path.",
];

export const duoModeSetterTemplates = [
  {
    title: "Custom Bug Challenge",
    description: "Write or paste your buggy code and let your opponent find the fix!",
    language: "typescript",
  },
];

export const generateRoomCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

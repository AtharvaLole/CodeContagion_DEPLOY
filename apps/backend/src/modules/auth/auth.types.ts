export type UserRecord = {
  id: string;
  email: string;
  handle: string;
  avatar: string;
  createdAt: string;
  stats: {
    elo: number;
    rank: number;
    winRate: number;
    totalMatches: number;
    wins: number;
    losses: number;
    streak: number;
  };
};

export type SafeUser = UserRecord;

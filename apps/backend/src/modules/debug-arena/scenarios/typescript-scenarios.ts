import type { DebugArenaScenarioDraft } from "../debug-arena.types.js";

// Taking the existing scenarios from debug-arena.data.ts and defining them here
export const typescriptScenarios: DebugArenaScenarioDraft[] = [
  {
    id: "race-condition-session",
    title: "Race Condition in User Session Handler",
    language: "typescript",
    difficulty: "HARD",
    description:
      "A critical race condition has been detected in the session management module. Users are intermittently receiving other users' session data. Stabilize the locking logic so session state is validated before mutation.",
    stackTrace: `TypeError: Cannot read properties of undefined (reading 'userId')
at SessionManager.getSession (session.ts:24:18)
at AuthMiddleware.validate (auth.ts:15:32)
at async Router.handle (router.ts:67:5)`,
    buggyCode: `class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private lock = false;

  async getSession(token: string): Promise<Session> {
    while (this.lock) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    this.lock = true;
    const session = this.sessions.get(token);
    this.lock = false;

    if (!session) {
      throw new Error("Session not found");
    }

    session.lastAccessed = Date.now();
    return session;
  }
}`,
    hint: "Do not release the lock before the session object is validated and updated.",
    expectedSignals: ["try", "finally", "this.lock = false"],
    tests: [
      {
        name: "Lock is released in a finally block",
        description: "The session lock should always be released, even if an error occurs.",
        check: (code) => /finally\s*{[\s\S]*this\.lock\s*=\s*false/.test(code)
      },
      {
        name: "Lock is not released before null check",
        description: "The lock should remain active until after the session has been validated.",
        check: (code) => {
          const unlockIndex = code.indexOf("this.lock = false");
          const nullCheckIndex = code.indexOf("if (!session)");
          return unlockIndex === -1 || nullCheckIndex === -1 || unlockIndex > nullCheckIndex;
        }
      },
      {
        name: "Session timestamp is updated inside protected section",
        description: "The access timestamp should be updated before the lock is released.",
        check: (code) => {
          const updateIndex = code.indexOf("session.lastAccessed");
          const unlockIndex = code.lastIndexOf("this.lock = false");
          return updateIndex !== -1 && unlockIndex !== -1 && updateIndex < unlockIndex;
        }
      }
    ]
  },
  {
    id: "pagination-off-by-one",
    title: "Off-by-One in Pagination Logic",
    language: "typescript",
    difficulty: "MEDIUM",
    description:
      "Users report that the last page of search results always shows one duplicate item from the previous page. Fix the page slicing logic and next-page flag.",
    stackTrace: `Expected 10 items on page 3, received 11
at PaginationService.paginate (pagination.ts:18:5)
at SearchController.search (search.ts:42:20)`,
    buggyCode: `function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.ceil(items.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize + 1;
  const pageItems = items.slice(startIndex, endIndex);

  return {
    items: pageItems,
    page,
    totalPages,
    hasNext: page <= totalPages,
  };
}`,
    hint: "One extra item is being sliced, and the hasNext comparison is too loose.",
    expectedSignals: ["startIndex + pageSize", "page < totalPages"],
    tests: [
      {
        name: "Page slice stops at the correct end index",
        description: "The slice should stop exactly at startIndex + pageSize.",
        check: (code) => /startIndex\s*\+\s*pageSize(?!\s*\+)/.test(code)
      },
      {
        name: "hasNext is strict",
        description: "The next-page check should only be true when a later page exists.",
        check: (code) => /hasNext:\s*page\s*<\s*totalPages/.test(code)
      },
      {
        name: "Slice still starts at startIndex",
        description: "The fixed solution should preserve the page start boundary.",
        check: (code) => /items\.slice\(\s*startIndex\s*,/.test(code)
      }
    ]
  },
  {
    id: "memory-leak-websocket",
    title: "Memory Leak in WebSocket Pool",
    language: "typescript",
    difficulty: "EXTREME",
    description:
      "Production servers are running out of memory after prolonged WebSocket usage. Remove the retention pattern that keeps stale socket references alive and add cleanup on close.",
    stackTrace: `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed
- JavaScript heap out of memory
at WebSocketPool.handleConnection (ws-pool.ts:31:5)
at Server.onUpgrade (server.ts:18:12)`,
    buggyCode: `class WebSocketPool {
  private connections: Map<string, WebSocket> = new Map();
  private messageHistory: any[] = [];

  handleConnection(ws: WebSocket, userId: string) {
    this.connections.set(userId, ws);

    ws.on("message", (data: string) => {
      const parsed = JSON.parse(data);
      this.messageHistory.push({
        userId,
        data: parsed,
        timestamp: Date.now(),
        connection: ws,
      });
      this.broadcast(parsed);
    });

    ws.on("close", () => {
      this.connections.delete(userId);
    });
  }
}`,
    hint: "The history should not keep live WebSocket objects, and close handlers should reclaim retained data.",
    expectedSignals: ["messageHistory =", "filter(", "delete(userId)"],
    tests: [
      {
        name: "Message history no longer stores the WebSocket instance",
        description: "History records should not retain the ws object.",
        check: (code) => !/connection:\s*ws/.test(code)
      },
      {
        name: "Close handler performs history cleanup",
        description: "Stale history items should be pruned when the connection closes.",
        check: (code) =>
          /messageHistory\s*=\s*this\.messageHistory\.filter/.test(code) ||
          /this\.messageHistory\s*=\s*this\.messageHistory\.filter/.test(code)
      },
      {
        name: "Connection map cleanup remains intact",
        description: "The active connection map still needs to delete the closed socket.",
        check: (code) => /delete\(userId\)/.test(code)
      }
    ]
  },
  {
    id: "jwt-expiry-check",
    title: "JWT Expiry Validation Bug",
    language: "typescript",
    difficulty: "EASY",
    description:
      "Expired JWTs are being accepted in a middleware check. The code compares the expiry timestamp against the wrong unit. Fix the validation.",
    stackTrace: `UnauthorizedError: Token accepted after expiration
at verifyAccessToken (jwt.ts:14:9)
at AuthGuard.handle (auth-guard.ts:22:13)`,
    buggyCode: `function verifyAccessToken(payload: { exp: number }) {
  const now = Date.now();
  const graceSeconds = 30;

  if (payload.exp + graceSeconds < now) {
    throw new Error("Token expired");
  }

  return true;
}`,
    hint: "JWT `exp` is in seconds, while Date.now() is milliseconds. If you include grace, keep all values in the same unit.",
    expectedSignals: ["Date.now() / 1000", "Math.floor", "graceSeconds"],
    tests: [
      {
        name: "Current time is converted to seconds",
        description: "Use seconds before comparing against exp.",
        check: (code) => /Date\.now\(\)\s*\/\s*1000/.test(code) || /Math\.floor\(Date\.now\(\)\s*\/\s*1000\)/.test(code)
      },
      {
        name: "Expiry comparison still exists",
        description: "The function must still reject expired tokens.",
        check: (code) =>
          /(payload\.exp\s*\+\s*graceSeconds\s*<\s*now|now\s*>\s*payload\.exp\s*\+\s*graceSeconds|now\s*>\s*payload\.exp)/.test(code)
      },
      {
        name: "The error path is preserved",
        description: "The code should still throw when the token is expired.",
        check: (code) => /throw\s+new\s+Error\(/.test(code)
      }
    ]
  },
  {
    id: "rate-limiter-window",
    title: "Rate Limiter Window Reset Bug",
    language: "typescript",
    difficulty: "MEDIUM",
    description:
      "A login rate limiter never resets after the first lockout. Repair the window logic so counters reset after the time bucket expires.",
    stackTrace: `TooManyRequestsError: User remains locked out after cooldown
at RateLimiter.assertWithinLimit (rate-limiter.ts:36:11)`,
    buggyCode: `class RateLimiter {
  private attempts = new Map<string, { count: number; windowStartedAt: number }>();
  private readonly maxAttempts = 5;
  private readonly windowMs = 60_000;

  assertWithinLimit(key: string) {
    const now = Date.now();
    const existing = this.attempts.get(key) ?? { count: 0, windowStartedAt: now };

    if (existing.count >= this.maxAttempts) {
      throw new Error("Too many attempts");
    }

    existing.count += 1;
    this.attempts.set(key, existing);
  }
}`,
    hint: "You need to compare the current time against the start of the rate-limit window.",
    expectedSignals: ["windowStartedAt", "this.windowMs", "count = 0"],
    tests: [
      {
        name: "Expired windows reset the count",
        description: "Old windows should clear the previous attempt count.",
        check: (code) => /existing\.count\s*=\s*0/.test(code) || /count:\s*0/.test(code)
      },
      {
        name: "Window expiration is checked against windowMs",
        description: "The limiter must compare the current time to windowStartedAt + windowMs.",
        check: (code) => /windowStartedAt[\s\S]*this\.windowMs/.test(code) || /now\s*-\s*existing\.windowStartedAt\s*>\s*this\.windowMs/.test(code)
      },
      {
        name: "The current attempt is still recorded",
        description: "Attempts should continue to increment after the reset logic.",
        check: (code) => /existing\.count\s*\+\=/.test(code)
      }
    ]
  },
  {
    id: "ts-equality-bug",
    title: "Loose Equality Type Bug",
    language: "typescript",
    difficulty: "EASY",
    description: "The API accepts status as string/number, and the current coercive checks collapse multiple values (`false`, `0`, `'0'`, `''`) into the same branch. Tighten logic so only explicit inactive codes are rejected.",
    stackTrace: `AssertionError: Expected 'active' for '0', got 'inactive'
at checkStatus (status.ts:14)`,
    buggyCode: `function checkStatus(code: string | number) {
  if (code == false || code == "") {
    return "inactive";
  }
  return "active";
}`,
    hint: "Avoid coercive checks (`==`). Compare explicit values with strict equality and decide precisely which representations mean inactive.",
    expectedSignals: ["===", "code === 0", "code === \"inactive\""],
    tests: [
      {
        name: "Loose equality removed",
        description: "No `==` checks should remain in status branching.",
        check: (code) => !/[^=!]==[^=]/.test(code)
      },
      {
        name: "Strict inactive checks present",
        description: "Use explicit strict checks for inactive values instead of coercion.",
        check: (code) => /code\s*===\s*(false|0|"0"|"inactive")/.test(code)
      }
    ]
  },
  {
    id: "ts-missing-await",
    title: "Missing Await on Async Task",
    language: "typescript",
    difficulty: "EASY",
    description: "An async API call returns a Promise, but the code proceeds to perform calculations on the Promise object itself rather than the resolved data.",
    stackTrace: `TypeError: Cannot read properties of undefined (reading 'records')
at fetchData (api.ts:5)`,
    buggyCode: `async function fetchData() {
  const result = fetch("https://api.example.com/data");
  const parsed = await result.json();
  return parsed.records;
}`,
    hint: "The global `fetch()` function is asynchronous. You must `await` the response before calling `.json()` on it.",
    expectedSignals: ["await fetch("],
    tests: [{ name: "Awaiting fetch call", description: "Insert the await keyword before fetch.", check: (code) => /const\s+result\s*=\s*await\s+fetch/.test(code) }]
  },
  {
    id: "ts-unhandled-promise",
    title: "Unhandled Promise in Map",
    language: "typescript",
    difficulty: "MEDIUM",
    description: "A job processor maps async tasks and returns early. Recent incidents also showed that one rejected job crashes the entire batch with no per-id visibility.",
    stackTrace: `AssertionError: Returned array of Promises instead of resolved numbers
at processJobs (jobs.ts:8)`,
    buggyCode: `async function processJobs(ids: string[]) {
  const results = ids.map(async (id) => {
    const data = await fetchJob(id);
    return data.value;
  });
  return results;
}`,
    hint: "`map(async ...)` produces Promise[]. Await the whole batch, and add a strategy so one failed job doesn't hide which IDs succeeded.",
    expectedSignals: ["Promise.all", "Promise.allSettled", "status"],
    tests: [
      {
        name: "Batch promises are awaited",
        description: "Resolve mapped promises with Promise.all or Promise.allSettled before returning.",
        check: (code) => /Promise\.all\(/.test(code) || /Promise\.allSettled\(/.test(code)
      },
      {
        name: "Failure handling strategy present",
        description: "Either use allSettled or explicit try/catch around each mapped task.",
        check: (code) => /Promise\.allSettled/.test(code) || /ids\.map\([\s\S]*try\s*\{/.test(code)
      }
    ]
  },
  {
    id: "ts-stale-closure",
    title: "Stale Closure in SetTimeout",
    language: "typescript",
    difficulty: "MEDIUM",
    description: "A React hook sets up an interval that increments a counter. However, the interval is logging the initial state of '0' every second instead of the updated count.",
    stackTrace: `Warning: React state update skipped due to stale closure capture`,
    buggyCode: `function useCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []); // Empty dependency array

  return count;
}`,
    hint: "Because the dependency array is empty, `count` is locked at 0. Use the functional setState updater: `setCount(prev => prev + 1)`.",
    expectedSignals: ["=>", "prev"],
    tests: [{ name: "Functional state updater", description: "Use `setCount(prev => prev + 1)` instead of referencing the closure value.", check: (code) => /setCount\(\s*([a-zA-Z_]\w*)\s*=>\s*\1\s*\+\s*1\s*\)/.test(code) || /setCount\(\(prev\)\s*=>/.test(code) }]
  },
  {
    id: "ts-memory-leak-event",
    title: "Event Listener Memory Leak",
    language: "typescript",
    difficulty: "HARD",
    description: "A React component subscribes to global scroll events and updates local state. Frequent mount/unmount cycles leak listeners and trigger setState on dead components.",
    stackTrace: `Performance Warning: 50,000 active 'scroll' listeners detected`,
    buggyCode: `function ScrollTracker() {
  const [y, setY] = useState(0);

  useEffect(() => {
    const handler = () => setY(window.scrollY);
    window.addEventListener("scroll", handler);
  }, []);

  return <div>Tracking... {y}</div>;
}`,
    hint: "Always cleanup global subscriptions in `useEffect`. Use the same handler reference and return a teardown function.",
    expectedSignals: ["return () =>", "removeEventListener", "setY"],
    tests: [
      {
        name: "Return cleanup block",
        description: "Return a function block removing the exact same handler.",
        check: (code) => {
          const addMatch = code.match(/window\.addEventListener\(\s*"scroll"\s*,\s*([a-zA-Z_]\w*)\s*\)/);
          const removeMatch = code.match(/window\.removeEventListener\(\s*"scroll"\s*,\s*([a-zA-Z_]\w*)\s*\)/);
          return Boolean(addMatch && removeMatch && addMatch[1] === removeMatch[1]);
        }
      },
      {
        name: "Stateful handler retained",
        description: "The scenario should remain stateful (setY usage) while adding cleanup.",
        check: (code) => /setY\(/.test(code)
      }
    ]
  },
  {
    id: "ts-reference-mutation",
    title: "Direct Reference Mutation in Reducer",
    language: "typescript",
    difficulty: "HARD",
    description: "A Redux-style reducer directly alters the properties on the incoming state object. This prevents React from detecting the change and triggering a re-render.",
    stackTrace: `AssertionError: State was modified but reference identical (re-render skipped)`,
    buggyCode: `function reducer(state, action) {
  switch (action.type) {
    case "UPDATE_TITLE":
      state.title = action.payload;
      return state;
    default:
      return state;
  }
}`,
    hint: "Never mutate state directly. Return a completely new object enclosing a shallow copy (spread) of the old state.",
    expectedSignals: ["...state", "return {"],
    tests: [{ name: "Spread syntax used", description: "Return `{ ...state, title: action.payload }` syntax.", check: (code) => /return\s*{\s*\.\.\.state\s*,\s*title\s*:/.test(code) }]
  },
  {
    id: "ts-prototype-pollution",
    title: "Deep Merge Prototype Pollution",
    language: "typescript",
    difficulty: "EXTREME",
    description: "A custom deep-merge function carelessly iterates through generic object keys. An attacker can pass `__proto__` as a key to pollute the global Object prototype layer.",
    stackTrace: `Security Vulnerability: Object.prototype polluted with 'admin=true'`,
    buggyCode: `function deepMerge(target: any, source: any) {
  for (const key in source) {
    if (source[key] instanceof Object && target[key]) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    } else {
      target[key] = source[key];
    }
  }
  return target;
}`,
    hint: "Identify specifically forbidden prototype keys like `__proto__` and `constructor` and `continue` (skip) the loop if encountered.",
    expectedSignals: ["__proto__", "continue", "constructor"],
    tests: [{ name: "Guard against prototype keys", description: "Add a security guard checking if key === '__proto__'.", check: (code) => /if\s*\(\s*key\s*===\s*['"]__proto__['"]\s*\)/.test(code) && /continue/.test(code) }]
  },
  {
    id: "ts-generator-yielding",
    title: "Async Yield Execution Ordering",
    language: "typescript",
    difficulty: "EXTREME",
    description: "A legacy generator-based async flow assumes yielded promises are automatically resolved. It crashes in production because no runner feeds resolved values/errors back into the generator.",
    stackTrace: `TypeError: user.id is undefined (user is Promise<User>)
at fetchUserData (saga.ts:5)
at startup (bootstrap.ts:18)`,
    buggyCode: `function* fetchUserData(apiCall: Function) {
  try {
    // Missing execution unwrap. The yielded item returns immediately.
    const user = yield apiCall();
    console.log(user.id);
  } catch (e) {
    console.error(e);
  }
}`,
    hint: "Refactor this flow to native async/await with explicit try/catch error handling.",
    expectedSignals: ["async function", "await apiCall", "try", "catch"],
    tests: [
      {
        name: "Converted to async/await",
        description: "For this arena scenario, refactor to native async/await and remove `yield`.",
        check: (code) => /async\s+function/.test(code) && /await\s+apiCall/.test(code) && !/\byield\b/.test(code)
      },
      {
        name: "Error handling preserved",
        description: "The refactored flow should still retain try/catch handling.",
        check: (code) => /try\s*{[\s\S]*await\s+apiCall/.test(code) && /catch\s*\(/.test(code)
      }
    ]
  }
];

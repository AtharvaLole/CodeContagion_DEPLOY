import type { DebugArenaScenarioDraft } from "../debug-arena.types.js";

export const pythonScenarios: DebugArenaScenarioDraft[] = [
  {
    id: "py-mut-default-args",
    title: "Mutable Default Arguments",
    language: "python",
    difficulty: "EASY",
    description: "A function designed to append an item to a list seems to retain items from previous calls when no list is provided. Fix the function signature and initialization.",
    stackTrace: `AssertionError: Expected [2], got [1, 2]
  File "main.py", line 12, in <module>
    assert append_item(2) == [2]`,
    buggyCode: `def append_item(item, target_list=[]):
    target_list.append(item)
    return target_list`,
    hint: "Default arguments are evaluated only once at definition time. Use None as the default value.",
    expectedSignals: ["None"],
    tests: [
      {
        name: "Default argument is no longer a mutable list",
        description: "The function signature should use None as the default instead of [].",
        check: (code) => /target_list\s*=\s*None/.test(code)
      },
      {
        name: "List is instantiated inside the function",
        description: "A new list should be created if target_list is None.",
        check: (code) => /if\s*target_list\s*is\s*None:/.test(code) && /target_list\s*=\s*\[\]/.test(code)
      }
    ]
  },
  {
    id: "py-dict-iteration-mod",
    title: "Modifying Dictionary During Iteration",
    language: "python",
    difficulty: "MEDIUM",
    description: "An account cleanup job removes inactive users, but starts failing in production and accidentally wipes legitimate accounts. The loop mutates the dictionary while iterating and compares activity flags using identity.",
    stackTrace: `RuntimeError: dictionary changed size during iteration
  File "main.py", line 8, in prune_inactive
    for user_id, active in active_users.items():`,
    buggyCode: `def prune_inactive(active_users):
    for user_id, active in active_users.items():
        if active is False:
            del active_users[user_id]
    return active_users`,
    hint: "Fix both issues: iterate over a stable snapshot (or rebuild a new dict), and avoid brittle identity checks for boolean-like values.",
    expectedSignals: ["list(", ".copy()", "== False", "not active"],
    tests: [
      {
        name: "Iterating over a copy or list of keys",
        description: "Use stable iteration (`list(...)` / `.copy()`) or rebuild and return a filtered dictionary.",
        check: (code) =>
          /list\(active_users\.(items|keys)\(\)\)/.test(code) ||
          /active_users\.copy\(\)/.test(code) ||
          /return\s*\{[\s\S]*for\s+[a-zA-Z_]\w*\s*,\s*[a-zA-Z_]\w*\s+in\s+active_users\.items\(\)/.test(code)
      },
      {
        name: "Inactive users are removed",
        description: "Solution should either delete inactive entries in-place or return a filtered dictionary.",
        check: (code) =>
          /del\s*active_users\[user_id\]/.test(code) ||
          /return\s*\{[\s\S]*for\s+[a-zA-Z_]\w*\s*,\s*[a-zA-Z_]\w*\s+in\s+active_users\.items\(\)/.test(code)
      },
      {
        name: "Identity check removed",
        description: "Avoid `is False`; use truthiness (`not active`) or equality (`== False`).",
        check: (code) => !/is\s+False/.test(code) && (/not\s+active/.test(code) || /==\s*False/.test(code))
      }
    ]
  },
  {
    id: "py-late-binding-closures",
    title: "Late Binding in Loops",
    language: "python",
    difficulty: "HARD",
    description: "A list of multiplier functions is generated. However, when executing them, they all multiply by the last value of the loop variable instead of the value at their creation time.",
    stackTrace: `AssertionError: List results do not match expected multipliers
  File "main.py", line 14, in <module>
    assert [f(2) for f in multipliers] == [0, 2, 4, 6]
  Got: [6, 6, 6, 6]`,
    buggyCode: `def create_multipliers():
    funcs = []
    for i in range(4):
        funcs.append(lambda x: x * i)
    return funcs`,
    hint: "Python evaluates closures using late binding. Force early evaluation by passing the loop variable as a default argument to the lambda.",
    expectedSignals: ["i=i"],
    tests: [
      {
        name: "Forcing early evaluation via default arguments",
        description: "The lambda should capture the variable by setting it as a default keyword parameter.",
        check: (code) => /lambda\s*[a-zA-Z_]\w*\s*,\s*i\s*=\s*i\s*:/.test(code)
      },
      {
        name: "Returns the expected structure",
        description: "Should still return a list of callables.",
        check: (code) => /return\s*funcs/.test(code) && /funcs\.append/.test(code)
      }
    ]
  },
  {
    id: "py-gil-race-condition",
    title: "Threading Race Condition with Shared State",
    language: "python",
    difficulty: "EXTREME",
    description: "Multiple threads increment a shared counter using the `+=` operator. Sometimes the final count is lower than expected because `+=` is not thread-safe. Add a thread lock to synchronize access.",
    stackTrace: `AssertionError: Counter reached 99874, expected 100000
  File "main.py", line 22, in <module>
    raise AssertionError(f"Expected 100000, got {counter}")`,
    buggyCode: `import threading

counter = 0

def increment_worker():
    global counter
    for _ in range(10000):
        counter += 1

threads = []
for _ in range(10):
    t = threading.Thread(target=increment_worker)
    threads.append(t)
    t.start()

for t in threads:
    t.join()`,
    hint: "Import Lock from threading. Create a lock instance and acquire it before modifying the global counter.",
    expectedSignals: ["with lock:", "lock.acquire()"],
    tests: [
      {
        name: "Lock is created",
        description: "A threading lock must be initialized.",
        check: (code) => /threading\.Lock\(\)/.test(code)
      },
      {
        name: "Lock used during mutation",
        description: "The `+=` operation must be wrapped in a lock context or acquire/release block.",
        check: (code) => /with\s+[a-zA-Z_]\w*:\s*counter\s*\+=/.test(code) || (/acquire\(\)/.test(code) && /release\(\)/.test(code))
      }
    ]
  },
  {
    id: "py-bool-identity",
    title: "Boolean Identity Check Bug",
    language: "python",
    difficulty: "EASY",
    description: "A request parser tries to verify payload presence and admin eligibility, but strict identity checks cause truthy values to be rejected and one branch to become dead code.",
    stackTrace: `AssertionError: Expected valid for truthy integer 1
  File "main.py", line 4, in <module>
    assert process_flag(1) == "valid"`,
    buggyCode: `def process_flag(flag):
    if flag is True:
        return "valid"
    if flag is 1:
        return "valid"
    return "invalid"`,
    hint: "Use truthiness/equality semantics, not identity checks against literals. `is` is for object identity (e.g., `None`), not scalar value logic.",
    expectedSignals: ["if flag:", "== 1"],
    tests: [
      {
        name: "Removed strict identity checks",
        description: "Replace identity checks (`is True`, `is 1`) with value checks or truthiness.",
        check: (code) => !/is\s+True/.test(code) && !/is\s+1/.test(code)
      },
      {
        name: "Truthy branch preserved",
        description: "A truthy check (or equivalent) should still return valid behavior.",
        check: (code) => /if\s+flag\s*:/.test(code) || /if\s+flag\s*==\s*1\s*:/.test(code)
      }
    ]
  },
  {
    id: "py-missing-self",
    title: "Missing 'self' in Class Method",
    language: "python",
    difficulty: "EASY",
    description: "A class method fails when called on an instance because the implicit instance reference was omitted from the signature.",
    stackTrace: `TypeError: get_status() takes 0 positional arguments but 1 was given
  File "main.py", line 5, in <module>
    Processor().get_status()`,
    buggyCode: `class Processor:
    def __init__(self):
        self.status = "active"

    def get_status():
        return self.status`,
    hint: "Instance methods in Python automatically receive the instance as the first argument, commonly named 'self'.",
    expectedSignals: ["def get_status(self):"],
    tests: [{ name: "Self parameter added", description: "The method signature must include 'self'.", check: (code) => /def\s+get_status\(\s*self\s*\):/.test(code) }]
  },
  {
    id: "py-list-iteration-mod",
    title: "Modifying List While Iterating",
    language: "python",
    difficulty: "MEDIUM",
    description: "A loop attempts to remove positive numbers from a list. However, deleting items shifts the indexes, causing the loop to skip the adjacent elements.",
    stackTrace: `AssertionError: Expected [-1, -2], got [-1, 2, -2]
  File "main.py", line 4, in <module>`,
    buggyCode: `def remove_positives(nums):
    for item in nums:
        if item > 0:
            nums.remove(item)
    return nums`,
    hint: "Iterate over a copy of the list (e.g., nums[:]) or use a list comprehension to build a new list.",
    expectedSignals: ["nums[:]", "for item in nums.copy():", "[x for x"],
    tests: [{ name: "Safe iteration / comprehension", description: "Iterate over a copy or reconstruct.", check: (code) => /nums\[\s*:\s*\]/.test(code) || /copy\(\)/.test(code) || /\[\s*[a-z_]+\s+for\s+/.test(code) }]
  },
  {
    id: "py-shallow-copy",
    title: "Shallow Copy Nested Mutation",
    language: "python",
    difficulty: "MEDIUM",
    description: "Generating a duplicated matrix using the multiplication operator creates shallow references. Modifying one row modifies them all.",
    stackTrace: `AssertionError: Expected row 1 col 0 to be 0
  File "main.py", line 3, in <module>`,
    buggyCode: `def create_matrix(rows, cols):
    matrix = [[0] * cols] * rows
    matrix[0][0] = 1 # Supposed to only change top-left
    return matrix`,
    hint: "List multiplication duplicates the reference to the inner list. Use a list comprehension to generate distinct inner lists.",
    expectedSignals: ["for _ in range(rows)"],
    tests: [{ name: "List comprehension for rows", description: "Instantiate distinct row lists using a comprehension.", check: (code) => /\[\[0\]\s*\*\s*cols\]\s+for\s+[a-zA-Z_]\w*\s+in\s+range/.test(code) }]
  },
  {
    id: "py-generator-exhaustion",
    title: "Generator Exhaustion",
    language: "python",
    difficulty: "HARD",
    description: "A generator expression is evaluated twice (e.g. checked for content, then consumed). The second evaluation yields nothing because generators are single-use.",
    stackTrace: `AssertionError: Final result count mismatch
  File "main.py", line 5, in <module>`,
    buggyCode: `def process_items(data):
    results = (x * 2 for x in data)
    if not any(results):
        return []
    return list(results)`,
    hint: "The 'any()' call consumes some or all of the generator. Convert it to a list first if you need to iterate multiple times.",
    expectedSignals: ["results = [", "list("],
    tests: [{ name: "Immediate materialization", description: "Convert generator to a list to allow multiple passes.", check: (code) => /results\s*=\s*\[.*for.*in.*\]/.test(code) || /results\s*=\s*list\(.*for.*in.*\)/.test(code) }]
  },
  {
    id: "py-unbound-local",
    title: "UnboundLocalError in Nested Function",
    language: "python",
    difficulty: "HARD",
    description: "An inner counter function attempts to increment a primitive integer defined in the enclosing scope, leading to an UnboundLocalError.",
    stackTrace: `UnboundLocalError: local variable 'count' referenced before assignment
  File "main.py", line 4, in increment`,
    buggyCode: `def create_counter():
    count = 0
    def increment():
        count += 1
        return count
    return increment`,
    hint: "In Python 3, use the 'nonlocal' keyword to modify primitive variables from an enclosing scope.",
    expectedSignals: ["nonlocal count"],
    tests: [{ name: "nonlocal declaration", description: "Declare 'nonlocal count' to map the variable assignment to the outer scope.", check: (code) => /nonlocal\s+count/.test(code) }]
  },
  {
    id: "py-class-attribute-leak",
    title: "Class Attribute State Leak",
    language: "python",
    difficulty: "EXTREME",
    description: "A mutable dictionary is defined at the class level instead of inside '__init__'. Multiple object instances are accidentally sharing the exact same state.",
    stackTrace: `AssertionError: User 2 has User 1's data
  File "main.py", line 7, in <module>`,
    buggyCode: `class UserSettings:
    preferences = {}
    
    def set_pref(self, key, val):
        self.preferences[key] = val`,
    hint: "Move the dictionary instantiation into the '__init__' method to ensure each instance receives its own isolated object.",
    expectedSignals: ["def __init__", "self.preferences = {}"],
    tests: [{ name: "Preferences isolated to instance", description: "Initialize `self.preferences` inside `__init__`.", check: (code) => /def\s+__init__\s*\(\s*self\s*\)\s*:[\s\n]+self\.preferences\s*=\s*\{\}/.test(code) }]
  },
  {
    id: "py-asyncio-not-awaited",
    title: "Unawaited Async Tasks",
    language: "python",
    difficulty: "EXTREME",
    description: "A data hydration worker launches async tasks but exits before completion. On top of that, one task failure now cancels the whole batch, making the pipeline flaky.",
    stackTrace: `RuntimeWarning: coroutine 'fetch_data' was never awaited`,
    buggyCode: `import asyncio

async def fetch_data(id):
    await asyncio.sleep(0.1)
    if id == 3:
        raise RuntimeError("source timed out")
    print(f"Data {id}")

async def main():
    tasks = []
    for i in range(5):
        tasks.append(asyncio.create_task(fetch_data(i)))
    # Missing await/collection strategy for completion and errors`,
    hint: "Keep task references and await them. For resilient batch runs, collect failures using `return_exceptions=True` (or explicit per-task handling).",
    expectedSignals: ["create_task", "await asyncio.gather", "return_exceptions=True"],
    tests: [
      {
        name: "Collect and await tasks",
        description: "Keep explicit task references and await completion using gather/wait.",
        check: (code) => /create_task\(/.test(code) && (/await\s+asyncio\.gather\(/.test(code) || /await\s+asyncio\.wait\(/.test(code))
      },
      {
        name: "Error strategy included",
        description: "The solution should prevent single-task failure from silently killing the whole batch.",
        check: (code) =>
          /return_exceptions\s*=\s*True/.test(code) ||
          /for\s+result\s+in\s+results/.test(code) ||
          /except\s+[A-Za-z_]\w*/.test(code)
      }
    ]
  }
];

import type { DebugArenaScenarioDraft } from "../debug-arena.types.js";

export const cppScenarios: DebugArenaScenarioDraft[] = [
  {
    id: "cpp-out-of-bounds",
    title: "Array Out of Bounds Reference",
    language: "cpp",
    difficulty: "EASY",
    description: "A simple loop calculating the sum of an array contains a classic mistake, resulting in unpredictable values or segmentation faults due to an out-of-bounds read.",
    stackTrace: `Segmentation Fault (core dumped)
    at sumArray(int*, int) (main.cpp:5)`,
    buggyCode: `#include <iostream>

int sumArray(int arr[], int size) {
    int sum = 0;
    for (int i = 0; i <= size; i++) {
        sum += arr[i];
    }
    return sum;
}`,
    hint: "Array indices are 0-based. The condition in the for-loop allows `i` to reach `size`, which is strictly past the last element.",
    expectedSignals: ["i < size"],
    tests: [
      {
        name: "Loop condition fixed",
        description: "The loop condition must read `i < size` rather than `i <= size`.",
        check: (code) => /i\s*<\s*size/.test(code) && !/i\s*<=\s*size/.test(code)
      }
    ]
  },
  {
    id: "cpp-dangling-pointer",
    title: "Dangling Pointer on Return",
    language: "cpp",
    difficulty: "MEDIUM",
    description: "A greeting helper sometimes returns garbage text, and long names intermittently crash production workers. The implementation mixes a stack-allocated return buffer with unbounded formatting.",
    stackTrace: `Warning: address of local variable 'buffer' returned
    ==1287==ERROR: AddressSanitizer: stack-buffer-overflow on address 0x7ffeefbff2c0
    at generateGreeting(const char*) (main.cpp:7)`,
    buggyCode: `#include <string>
#include <cstdio>

const char* generateGreeting(const char* name) {
    char buffer[32];
    std::sprintf(buffer, "Hello, %s!", name);
    return buffer;
}`,
    hint: "There are two issues: lifetime and bounds safety. Don't return a stack buffer, and avoid unbounded `sprintf` writes.",
    expectedSignals: ["std::string", "snprintf", "new char"],
    tests: [
      {
        name: "Avoid returning stack addresses",
        description: "The function must not return a local stack array. Use safe ownership (`std::string` or heap allocation).",
        check: (code) => /new\s+char/.test(code) || /malloc/.test(code) || /std::string/.test(code)
      },
      {
        name: "Unbounded formatting removed",
        description: "Use bounded formatting (`snprintf`) or switch to string-based concatenation. Raw `sprintf` should not remain.",
        check: (code) => (/snprintf/.test(code) || /std::string/.test(code)) && !/\bsprintf\s*\(/.test(code)
      }
    ]
  },
  {
    id: "cpp-vector-invalidation",
    title: "Iterator Invalidation",
    language: "cpp",
    difficulty: "HARD",
    description: "Code that aims to remove all even numbers from a standard vector crashes unpredictably. The iterators are being invalidated as elements are erased.",
    stackTrace: `libc++abi: terminating with uncaught exception of type std::out_of_range
    at std::vector<int>::erase(const_iterator) (vector:1839)`,
    buggyCode: `#include <vector>

void removeEvens(std::vector<int>& vec) {
    for (auto it = vec.begin(); it != vec.end(); ++it) {
        if (*it % 2 == 0) {
            vec.erase(it);
        }
    }
}`,
    hint: "`std::vector::erase` invalidates the given iterator and returns a new iterator pointing to the next element. Use that returned iterator.",
    expectedSignals: ["it = vec.erase("],
    tests: [
      {
        name: "Iterator correctly restored after erase",
        description: "The return value of erase() should be assigned back to `it` instead of continuously incrementing an invalid iterator.",
        check: (code) => /it\s*=\s*vec\.erase\(it\)/.test(code)
      },
      {
        name: "Correct increment logic",
        description: "The iterator should only be manually incremented when an element is NOT erased.",
        check: (code) => /else\s*{\s*\+\+it/.test(code) || /else\s*{\s*it\+\+/.test(code)
      }
    ]
  },
  {
    id: "cpp-virtual-destructor",
    title: "Missing Virtual Destructor",
    language: "cpp",
    difficulty: "EXTREME",
    description: "A class hierarchy is being used polymorphically. Deleting derived objects through base class pointers is leaking memory because derived class destructors aren't executing.",
    stackTrace: `Valgrind MEMORY LEAK REPORT:
    400 bytes lost in NetworkStream::~NetworkStream()
    at (main.cpp:32)`,
    buggyCode: `#include <iostream>

class BaseStream {
public:
    BaseStream() { std::cout << "Base init\\n"; }
    ~BaseStream() { std::cout << "Base destroyed\\n"; }
    virtual void process() = 0;
};

class NetworkStream : public BaseStream {
    int* buffer;
public:
    NetworkStream() { buffer = new int[100]; }
    ~NetworkStream() { 
        delete[] buffer;
        std::cout << "Network destroyed\\n"; 
    }
    void process() override { /* ... */ }
};

void cleanup(BaseStream* stream) {
    delete stream;
}`,
    hint: "When deleting an object through a base pointer, the base class must have a `virtual` destructor to ensure the derived destructor is correctly dispatched.",
    expectedSignals: ["virtual ~BaseStream()"],
    tests: [
      {
        name: "Destructor is polymorphic",
        description: "The `~BaseStream` destructor must be declared virtual.",
        check: (code) => /virtual\s+~BaseStream\(\)/.test(code)
      }
    ]
  },
  {
    id: "cpp-missing-reference",
    title: "Pass by Value Mutation Bug",
    language: "cpp",
    difficulty: "EASY",
    description: "A function attempts to update a user's score, but the caller's score remains unchanged because the object was passed by value (copied).",
    stackTrace: `AssertionError: Player score expected to be 10, got 0
    at test_score (main.cpp:12)`,
    buggyCode: `#include <iostream>

struct Player {
    int score = 0;
};

void updateScore(Player p) {
    p.score += 10;
}`,
    hint: "Change the parameter to take a reference to the Player struct to modify the original instance.",
    expectedSignals: ["Player& p"],
    tests: [{ name: "Parameter is a reference", description: "The parameter type should be Player&.", check: (code) => /Player\s*&\s*p/.test(code) }]
  },
  {
    id: "cpp-uninitialized-var",
    title: "Uninitialized Local Variable",
    language: "cpp",
    difficulty: "EASY",
    description: "An accumulator variable is used in a loop without initial assignment, causing the summation to start from garbage memory values.",
    stackTrace: `AssertionError: Expected sum 15, got 32782
    at test_sum (main.cpp:8)`,
    buggyCode: `int calculateSum(int* arr, int n) {
    int total;
    for (int i = 0; i < n; i++) {
        total += arr[i];
    }
    return total;
}`,
    hint: "Always initialize primitive numeric variables in C++ to 0.",
    expectedSignals: ["int total = 0;"],
    tests: [{ name: "Initialization provided", description: "Total must be assigned 0 upon declaration.", check: (code) => /int\s+total\s*=\s*0\s*;/.test(code) }]
  },
  {
    id: "cpp-signed-unsigned",
    title: "Signed vs Unsigned Comparison",
    language: "cpp",
    difficulty: "MEDIUM",
    description: "A loop iterating backward using a standard unsigned vector size creates an underflow bug. size_t is unsigned; when it hits 0, subtracting 1 underflows to SIZE_MAX.",
    stackTrace: `Segmentation Fault: Core dumped (invalid memory access)
    at reverse_print (main.cpp:5)`,
    buggyCode: `#include <vector>
#include <iostream>

void printReverse(const std::vector<int>& v) {
    for (size_t i = v.size() - 1; i >= 0; --i) {
        std::cout << v[i] << " ";
    }
}`,
    hint: "Since size_t is unsigned, `i >= 0` is always true. Change `i` to a signed type like `int` or adjust the iteration constraint.",
    expectedSignals: ["int i ="],
    tests: [{ name: "Signed type used for loop index", description: "Convert to int or change condition to avoid unsigned underflow.", check: (code) => /int\s+i\s*=\s*v\.size/.test(code) || /i\s*<\s*v\.size\(\)/.test(code) }]
  },
  {
    id: "cpp-missing-return",
    title: "Missing Return on Branch",
    language: "cpp",
    difficulty: "MEDIUM",
    description: "A non-void function guarantees a return, but one code path unexpectedly falls through without returning, invoking undefined behavior.",
    stackTrace: `Warning: control reaches end of non-void function
    Undefined Behavior at testPath() (main.cpp:14)`,
    buggyCode: `int determineStatus(int code) {
    if (code > 200) {
        return 1;
    } else if (code < 200) {
        return -1;
    }
    // undefined if code == 200
}`,
    hint: "Ensure all conditional branches return a valid integer, including the fallback path.",
    expectedSignals: ["return 0;", "else { return"],
    tests: [{ name: "Fallback return provided", description: "Function must return a value if no conditions are met.", check: (code) => /}\s*return\s+-?\d+;/.test(code) || /else\s*{\s*return\s+-?\d+;/.test(code) }]
  },
  {
    id: "cpp-object-slicing",
    title: "Object Slicing Polymorphism",
    language: "cpp",
    difficulty: "HARD",
    description: "A derived class object is passed by value to a function expecting a base class object. The derived fields are 'sliced' off and the virtual dispatch uses the base class.",
    stackTrace: `AssertionError: Expected 'Dog barks', got 'Animal sound'
    at feedAnimal (main.cpp:18)`,
    buggyCode: `#include <string>

class Animal {
public: virtual std::string speak() { return "Animal sound"; }
};

class Dog : public Animal {
public: std::string speak() override { return "Dog barks"; }
};

std::string feed(Animal a) {
    return a.speak();
}`,
    hint: "To retain polymorphic behavior and avoid slicing, pass objects by reference (Animal&) or pointer (Animal*).",
    expectedSignals: ["Animal& a", "Animal* a"],
    tests: [{ name: "Pass by reference/pointer", description: "Change parameter signature to use reference binding.", check: (code) => /feed\(\s*Animal\s*&\s*[a-zA-Z]\w*\)/.test(code) || /feed\(\s*Animal\s*\*\s*[a-zA-Z]\w*\)/.test(code) }]
  },
  {
    id: "cpp-catch-by-value",
    title: "Catching Exceptions by Value",
    language: "cpp",
    difficulty: "HARD",
    description: "Error handling swallows important details from derived exceptions. The current code catches by value and then rethrows by value, slicing twice and breaking downstream diagnostics.",
    stackTrace: `AssertionError: expected std::runtime_error("Specific failure")
    got std::exception("std::exception")
    at execute() rethrow path`,
    buggyCode: `#include <stdexcept>
#include <iostream>

void execute() {
    try {
        throw std::runtime_error("Specific failure");
    } catch (std::exception e) {
        std::cerr << "recovering from: " << e.what() << '\\n';
        throw e;
    }
}`,
    hint: "Catch polymorphic exceptions by const reference, and use `throw;` to preserve the original dynamic exception type.",
    expectedSignals: ["const std::exception&", "throw;"],
    tests: [
      {
        name: "Caught by reference",
        description: "Catch block must use reference semantics.",
        check: (code) => /catch\s*\(\s*(const\s+)?std::exception\s*&\s*[a-zA-Z_]\w*\s*\)/.test(code)
      },
      {
        name: "Rethrow preserves dynamic type",
        description: "Use bare `throw;` instead of `throw e;` in the catch block.",
        check: (code) => /throw\s*;/.test(code) && !/throw\s+e\s*;/.test(code)
      }
    ]
  },
  {
    id: "cpp-incorrect-c-cast",
    title: "Incorrect C-Style Cast in Multiple Inheritance",
    language: "cpp",
    difficulty: "EXTREME",
    description: "A raw C-style cast is used to convert a pointer from one base to a derived class containing multiple bases. The raw cast fails to calculate the pointer offset correctly.",
    stackTrace: `Segmentation fault (invalid vtable read)
    at invokeInterface2 (main.cpp:20)`,
    buggyCode: `class I1 { virtual void a() = 0; };
class I2 { virtual void b() = 0; };
class Impl : public I1, public I2 { 
    void a() override {} 
    void b() override {} 
};

void handle(I1* ptr) {
    // Dangerous raw pointer memory shift
    I2* other = (I2*)ptr;
    other->b();
}`,
    hint: "Raw C-casts do not guarantee pointer offset adjustment in multiple inheritance trees. Use `dynamic_cast<I2*>(ptr)`.",
    expectedSignals: ["dynamic_cast<I2*>"],
    tests: [{ name: "Use dynamic_cast", description: "Safe polymorphic casting across multiple bases requires dynamic_cast.", check: (code) => /dynamic_cast\s*<\s*I2\s*\*\s*>\s*\(\s*ptr\s*\)/.test(code) }]
  },
  {
    id: "cpp-use-after-move",
    title: "Use After Move Behavior",
    language: "cpp",
    difficulty: "EXTREME",
    description: "A security registration path moves a username into a registry, then keeps reading the moved-from string in multiple checks. This causes non-deterministic authorization behavior.",
    stackTrace: `AssertionError: privileged user was not flagged consistently
    sanitizer note: read from moved-from std::string
    at registerName (main.cpp:12)`,
    buggyCode: `#include <vector>
#include <string>

std::vector<std::string> registry;

void registerName(std::string name) {
    registry.push_back(std::move(name));
    // Bug: Using 'name' after it has been moved
    if (name.find("admin") != std::string::npos) {
        // privileged branch...
    }
    if (!name.empty()) {
        // audit branch...
    }
}`,
    hint: "Treat moved-from objects as valid-but-unspecified. Perform all `name`-based checks before `std::move`, or read from `registry.back()` after insertion.",
    expectedSignals: ["std::move(name)", "registry.back()", "find(\"admin\")"],
    tests: [
      {
        name: "No moved-from reads",
        description: "`name.find`, `name.empty`, or `name.length` should not appear after `std::move(name)`.",
        check: (code) => {
          const moveCall = code.match(/std::move\s*\(\s*name\s*\)/);
          if (!moveCall || moveCall.index === undefined) return false;
          const afterMove = code.slice(moveCall.index + moveCall[0].length);
          const withoutComments = afterMove.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
          return !/\bname\b/.test(withoutComments);
        }
      },
      {
        name: "Privilege check still exists",
        description: "The branch checking for admin-like names should remain, either before move or via registry.back().",
        check: (code) => /find\s*\(\s*"admin"\s*\)/.test(code)
      }
    ]
  }
];

import Editor, { type Monaco } from "@monaco-editor/react";
import { FileCode2, Terminal } from "lucide-react";
import type {
  EchoTraceEvaluation,
  EchoTraceGraphAnalysis,
  EchoTraceScenario
} from "../echotrace-types";

const ECHOTRACE_LANGUAGE_ID = "echotrace-policy";
const ECHOTRACE_THEME_ID = "echotrace-vscode";

function configureEchoTraceMonaco(monaco: Monaco) {
  const existingLanguage = monaco.languages
    .getLanguages()
    .some((language) => language.id === ECHOTRACE_LANGUAGE_ID);

  if (!existingLanguage) {
    monaco.languages.register({ id: ECHOTRACE_LANGUAGE_ID });
  }

  // Give the runtime DSL its own syntax rules so the editor feels closer to a real VS Code policy file.
  monaco.languages.setMonarchTokensProvider(ECHOTRACE_LANGUAGE_ID, {
    tokenizer: {
      root: [
        [/#.*$/, "comment"],
        [/"[^"]*"/, "string"],
        [/\b(policy|entry|middleware|authentication|route|policy_override|traffic_control)\b/, "keyword"],
        [/\b(mode|attack_surface_score|rule|strategy|enforce|resource|action|skip_auth|reason)\b/, "attribute.name"],
        [/\b(true|false)\b/, "constant.language.boolean"],
        [/\b\d+\b/, "number"],
        [/[{}]/, "@brackets"]
      ]
    }
  });

  monaco.languages.setLanguageConfiguration(ECHOTRACE_LANGUAGE_ID, {
    comments: { lineComment: "#" },
    brackets: [
      ["{", "}"],
      ["(", ")"],
      ["[", "]"]
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: '"', close: '"' },
      { open: "(", close: ")" },
      { open: "[", close: "]" }
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: '"', close: '"' },
      { open: "(", close: ")" }
    ]
  });

  monaco.editor.defineTheme(ECHOTRACE_THEME_ID, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "4FC1FF", fontStyle: "bold" },
      { token: "attribute.name", foreground: "DCDCAA" },
      { token: "string", foreground: "CE9178" },
      { token: "number", foreground: "B5CEA8" },
      { token: "comment", foreground: "6A9955" },
      { token: "constant.language.boolean", foreground: "569CD6", fontStyle: "bold" }
    ],
    colors: {
      "editor.background": "#171717",
      "editor.lineHighlightBackground": "#262626",
      "editorLineNumber.foreground": "#6b7280",
      "editorLineNumber.activeForeground": "#e5e7eb",
      "editorCursor.foreground": "#38bdf8",
      "editor.selectionBackground": "#1d4ed833",
      "editor.inactiveSelectionBackground": "#33415544",
      "editorSuggestWidget.background": "#0b1220",
      "editorSuggestWidget.border": "#1e293b",
      "editorSuggestWidget.foreground": "#e2e8f0",
      "editorSuggestWidget.selectedBackground": "#082f49",
      "editorHoverWidget.background": "#0b1220",
      "editorHoverWidget.border": "#1e293b"
    }
  });

  monaco.languages.registerCompletionItemProvider(ECHOTRACE_LANGUAGE_ID, {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      return {
        suggestions: [
          {
            label: "policy block",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'policy "${1:runtime_name}" {\n  mode = "${2:request_pipeline}"\n  attack_surface_score = ${3:0}\n\n  ${4:# incident notes}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Creates a top-level EchoTrace policy block.",
            range
          },
          {
            label: "entry block",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'entry "${1:Public API Gateway}" {\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Adds the public entry point for the runtime.",
            range
          },
          {
            label: "middleware block",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              'middleware "${1:Request Middleware}" {\n  rule = "${2:sanitize_headers}"\n  rule = "${3:validate_origin}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Adds a middleware validation layer.",
            range
          },
          {
            label: "authentication block",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              'authentication "${1:JWT Auth Guard}" {\n  strategy = "${2:jwt_session_guard}"\n  enforce = true\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Adds an authentication step that enforces access.",
            range
          },
          {
            label: "route block",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              'route "${1:Protected Records}" {\n  resource = "${2:customer_records}"\n  action = "${3:read_write}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Adds the protected route definition.",
            range
          },
          {
            label: "policy_override block",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              'policy_override "${1:Manual Override}" {\n  skip_auth = true\n  reason = "${2:manual override injected}"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Represents a risky bypass block.",
            range
          },
          {
            label: "traffic_control block",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'traffic_control "${1:Traffic Dropper}" {\n  action = "drop"\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Represents a traffic disruption block.",
            range
          },
          {
            label: "request_pipeline",
            kind: monaco.languages.CompletionItemKind.Value,
            insertText: "request_pipeline",
            documentation: "Standard left-to-right trust chain mode.",
            range
          },
          {
            label: "incident_guard",
            kind: monaco.languages.CompletionItemKind.Value,
            insertText: "incident_guard",
            documentation: "Runtime mode used during incident recovery scenarios.",
            range
          },
          {
            label: "service_path",
            kind: monaco.languages.CompletionItemKind.Value,
            insertText: "service_path",
            documentation: "Runtime mode focused on service-to-service flow.",
            range
          },
          {
            label: "trust_chain",
            kind: monaco.languages.CompletionItemKind.Value,
            insertText: "trust_chain",
            documentation: "Runtime mode focused on validation and identity order.",
            range
          }
        ]
      };
    }
  });
}

type DeveloperEditorProps = {
  scenario: EchoTraceScenario;
  code: string;
  onCodeChange: (value: string) => void;
  evaluation: EchoTraceEvaluation | null;
  sourceAnalysis: EchoTraceGraphAnalysis;
  aiGuidance: string[];
  deployLabel: string;
  timeLeft?: number;
  onDeploy: () => void;
  disabled?: boolean;
};

export function DeveloperEditor({
  scenario,
  code,
  onCodeChange,
  evaluation,
  sourceAnalysis,
  aiGuidance,
  deployLabel,
  timeLeft,
  onDeploy,
  disabled = false
}: DeveloperEditorProps) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border/40 bg-slate-950/90 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      {typeof timeLeft === "number" ? (
        <div className="h-1 w-full bg-white/5">
          <div
            className={`h-full transition-[width] duration-500 ${
              timeLeft > 90 ? "bg-primary" : timeLeft > 45 ? "bg-neon-yellow" : "bg-accent"
            }`}
            style={{ width: `${Math.max(8, (timeLeft / 180) * 100)}%` }}
          />
        </div>
      ) : null}
      <div className="flex items-center justify-between border-b border-border/30 px-5 py-4 bg-surface-1/70">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
            CODE VIEW
          </p>
          <h2 className="mt-2 font-display text-lg text-foreground">
            Fix The Broken Flow
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {scenario.developerGoal}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-primary">
              {scenario.sector}
            </span>
            <span className="rounded-full border border-border/30 bg-background/40 px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
              TARGET // {scenario.targetAsset}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {typeof timeLeft === "number" ? (
            <div className="rounded-xl border border-border/30 bg-background/40 px-4 py-3 font-mono text-xs tracking-[0.2em] text-muted-foreground">
              TIME LEFT: <span className="text-foreground">{timeLeft}s</span>
            </div>
          ) : null}
          <button
            onClick={onDeploy}
            disabled={disabled}
            className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 font-mono text-xs tracking-[0.2em] text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deployLabel}
          </button>
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex h-[720px] min-w-0 flex-col overflow-hidden border-r border-border/30 bg-[#111827]">
          <div className="flex items-center justify-between border-b border-border/30 bg-surface-1/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <span className="font-mono text-[11px] tracking-[0.18em] text-foreground">
                ECHOTRACE // LIVE PATCH
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
              <span>{scenario.runtimeMode}</span>
              <span className="text-primary">{scenario.policyName}</span>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage={ECHOTRACE_LANGUAGE_ID}
              beforeMount={configureEchoTraceMonaco}
              value={code}
              onChange={(value) => onCodeChange(value ?? "")}
              theme={ECHOTRACE_THEME_ID}
              options={{
                fontSize: 13,
                fontFamily: "JetBrains Mono, monospace",
                minimap: { enabled: false },
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                renderLineHighlight: "all",
                bracketPairColorization: { enabled: true },
                guides: {
                  bracketPairs: true,
                  indentation: true
                },
                wordWrap: "on",
                quickSuggestions: {
                  other: true,
                  comments: true,
                  strings: true
                },
                suggestOnTriggerCharacters: true,
                inlineSuggest: { enabled: true },
                acceptSuggestionOnEnter: "on",
                tabCompletion: "on",
                snippetSuggestions: "top",
                formatOnPaste: true,
                formatOnType: true,
                scrollbar: {
                  vertical: "visible",
                  horizontal: "visible",
                  useShadows: false,
                  verticalScrollbarSize: 12,
                  horizontalScrollbarSize: 12,
                  alwaysConsumeMouseWheel: false
                },
                readOnly: disabled,
                automaticLayout: true
              }}
            />
          </div>

          <div className="flex items-center justify-between border-t border-border/30 bg-surface-1/70 px-4 py-3">
            <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] tracking-[0.16em] text-muted-foreground">
              <span>MODE: {scenario.runtimeMode.toUpperCase()}</span>
              <span>TARGET: {scenario.targetAsset.toUpperCase()}</span>
            </div>
            <div className="font-mono text-[10px] tracking-[0.16em] text-primary">
              AUTOCOMPLETE ACTIVE
            </div>
          </div>
        </div>

        <aside className="h-[720px] overflow-y-auto bg-surface-1/60 p-5">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
              QUICK HELP
            </p>
            <div className="mt-3 space-y-2">
              {aiGuidance.map((message) => (
                <div
                  key={message}
                  className="rounded-xl border border-primary/10 bg-background/40 px-3 py-3 text-sm leading-6 text-muted-foreground"
                >
                  {message}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border/30 bg-background/50 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
              WHAT YOU ARE LOOKING AT
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{scenario.stakes}</p>
            <p className="mt-3 text-xs text-neon-yellow">
              Current path: {sourceAnalysis.routeLabels.join(" -> ")}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              The code on the left is just a text version of the visual map. You do not need to
              understand every line. Focus on the order of the steps.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-border/30 bg-background/50 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
              JSON FLOW AUDIT
            </p>
            <p className="mt-3 text-xs font-mono tracking-[0.18em] text-neon-yellow">
              {sourceAnalysis.verdictLabel}
            </p>
            <div className="mt-3 space-y-2">
              {sourceAnalysis.jsonAuditTrail.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-border/20 bg-background/40 px-3 py-3 text-sm leading-6 text-muted-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border/30 bg-background/50 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-neon-yellow">
              FIX GOAL
            </p>
            <div className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
              <p>1. Entry should lead into middleware.</p>
              <p>2. Authentication should happen before the protected route.</p>
              <p>3. Remove any bypass or traffic drop block from the active path.</p>
            </div>
          </div>

          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.24em] text-neon-yellow">
            CHECK YOUR FIX
          </p>
          <div className="mt-4 rounded-2xl border border-border/30 bg-background/50 p-4">
            <p
              className={`font-mono text-[10px] tracking-[0.2em] ${
                evaluation?.tone === "success" ? "text-neon-green" : "text-accent"
              }`}
            >
              {evaluation
                ? evaluation.passed
                  ? "FIX LOOKS GOOD"
                  : "PROBLEM STILL THERE"
                : "NO CHECK YET"}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {evaluation
                ? evaluation.summary
                : "Find the wrong order, remove any bad shortcut, and make the flow safe again."}
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {(evaluation?.findings.length
              ? evaluation.findings
              : sourceAnalysis.findings.length
                ? sourceAnalysis.findings
                : [
                    "Protected data should only appear after authentication.",
                    "Auth bypass directives must be removed.",
                    "Traffic disruption actions should not remain in the active path."
                  ]).map((finding) => (
              <div
                key={finding}
                className="rounded-xl border border-border/20 bg-background/40 px-4 py-3 text-sm text-muted-foreground"
              >
                {finding}
              </div>
            ))}
          </div>

          {evaluation ? (
            <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <p className="font-mono text-[10px] tracking-[0.24em] text-primary">FIX SCORE</p>
            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Patch quality</span>
                <span className="text-foreground">{evaluation.patchQuality}</span>
              </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Cleanup</span>
                  <span className="text-foreground">{evaluation.cleanupScore}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Resilience</span>
                  <span className="text-foreground">{evaluation.resilienceScore}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/20 pt-3 text-sm">
                  <span className="font-mono text-primary">FINAL</span>
                  <span className="font-display text-xl text-primary">{evaluation.finalScore}</span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl border border-border/30 bg-background/40 p-4">
            <div className="flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-neon-yellow" />
              <p className="font-mono text-[10px] tracking-[0.24em] text-neon-yellow">
                EDITOR TIPS
              </p>
            </div>
            <div className="mt-3 space-y-2 text-xs leading-6 text-muted-foreground">
              <p>Scroll inside the editor window just like a code IDE.</p>
              <p>Start typing `entry`, `middleware`, `authentication`, or `route` to get suggestions.</p>
              <p>Use `Tab` or `Enter` to accept snippets and rebuild the safe order faster.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

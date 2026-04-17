import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, Cpu, Bug, Zap } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import {
  generateAiScenario,
  type AiGeneratedScenarioResponse,
} from "@/features/ai/ai-api";

const ERROR_TYPE_OPTIONS = [
  { value: "logic", label: "Logic Error", icon: "🧩" },
  { value: "off-by-one", label: "Off-by-One", icon: "📐" },
  { value: "null-reference", label: "Null/Undefined", icon: "💀" },
  { value: "type-error", label: "Type Error", icon: "🏷️" },
  { value: "async", label: "Async/Promise", icon: "⏳" },
  { value: "scope", label: "Scope/Closure", icon: "🔒" },
  { value: "syntax", label: "Syntax Error", icon: "✏️" },
  { value: "memory", label: "Memory Leak", icon: "💧" },
  { value: "infinite-loop", label: "Infinite Loop", icon: "🔄" },
  { value: "edge-case", label: "Edge Case", icon: "🎯" },
] as const;

type Language = "typescript" | "python" | "cpp";
type Difficulty = "EASY" | "MEDIUM" | "HARD" | "EXTREME";

const LANGUAGES: { value: Language; label: string; colorClass: string }[] = [
  { value: "typescript", label: "TS", colorClass: "text-primary border-primary/40 bg-primary/10" },
  { value: "python", label: "PY", colorClass: "text-neon-yellow border-neon-yellow/40 bg-neon-yellow/10" },
  { value: "cpp", label: "C++", colorClass: "text-accent border-accent/40 bg-accent/10" },
];

const DIFFICULTIES: { value: Difficulty; label: string; colorClass: string; glow: string }[] = [
  { value: "EASY", label: "EASY", colorClass: "text-neon-green border-neon-green/40 bg-neon-green/10", glow: "shadow-neon-green/20" },
  { value: "MEDIUM", label: "MEDIUM", colorClass: "text-neon-yellow border-neon-yellow/40 bg-neon-yellow/10", glow: "shadow-neon-yellow/20" },
  { value: "HARD", label: "HARD", colorClass: "text-primary border-primary/40 bg-primary/10", glow: "shadow-primary/20" },
  { value: "EXTREME", label: "EXTREME", colorClass: "text-accent border-accent/40 bg-accent/10", glow: "shadow-accent/20" },
];

interface AiScenarioGeneratorProps {
  defaultLanguage?: Language;
  defaultDifficulty?: Difficulty;
  onScenarioGenerated: (response: AiGeneratedScenarioResponse) => void;
  onCancel: () => void;
  isInsideModal?: boolean;
}

export function AiScenarioGenerator({
  defaultLanguage = "typescript",
  defaultDifficulty = "MEDIUM",
  onScenarioGenerated,
  onCancel,
  isInsideModal = false,
}: AiScenarioGeneratorProps) {
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultDifficulty);
  const [selectedErrorTypes, setSelectedErrorTypes] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateAiScenario(token, {
        language,
        difficulty,
        errorTypes: selectedErrorTypes,
        description: description.trim() || undefined,
      });
      onScenarioGenerated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  const toggleErrorType = (val: string) => {
    setSelectedErrorTypes((prev) =>
      prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val]
    );
  };

  const Wrapper = isInsideModal ? "div" : "div";

  return (
    <Wrapper className={isInsideModal ? "" : "relative p-6 rounded-lg glass border-primary/50 shadow-[0_0_15px_rgba(48,201,232,0.1)]"}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/30">
            <Cpu className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg text-foreground tracking-wide">AI SCENARIO ENGINE</h3>
            <p className="text-[10px] font-mono tracking-[0.15em] text-muted-foreground">
              CUSTOM-TAILORED DEBUGGING CHALLENGES
            </p>
          </div>
        </div>
        {/* Decorative dash */}
        <div className="mt-3 h-[1px] bg-gradient-to-r from-primary/40 via-primary/10 to-transparent" />
      </div>

      <form onSubmit={handleGenerate} className="space-y-6">
        {/* Language Selection — Pill Toggle */}
        <div>
          <label className="block font-mono text-[10px] tracking-[0.24em] text-primary mb-3 flex items-center gap-2">
            <Bug className="w-3 h-3" />
            LANGUAGE
          </label>
          <div className="flex gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => setLanguage(lang.value)}
                className={`flex-1 relative rounded-lg border px-4 py-3 font-mono text-xs tracking-[0.15em] font-semibold transition-all overflow-hidden ${
                  language === lang.value
                    ? `${lang.colorClass} shadow-lg`
                    : "border-border/20 bg-surface-1/30 text-muted-foreground hover:border-border/40 hover:bg-surface-1/50"
                }`}
              >
                {language === lang.value && (
                  <motion.div
                    layoutId="lang-indicator"
                    className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-lg"
                    transition={{ duration: 0.2 }}
                  />
                )}
                <span className="relative">{lang.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Selection — Pill Toggle */}
        <div>
          <label className="block font-mono text-[10px] tracking-[0.24em] text-primary mb-3 flex items-center gap-2">
            <Zap className="w-3 h-3" />
            DIFFICULTY
          </label>
          <div className="flex gap-2">
            {DIFFICULTIES.map((diff) => (
              <button
                key={diff.value}
                type="button"
                onClick={() => setDifficulty(diff.value)}
                className={`flex-1 relative rounded-lg border px-3 py-3 font-mono text-[10px] tracking-[0.12em] font-semibold transition-all overflow-hidden ${
                  difficulty === diff.value
                    ? `${diff.colorClass} ${diff.glow} shadow-lg`
                    : "border-border/20 bg-surface-1/30 text-muted-foreground hover:border-border/40 hover:bg-surface-1/50"
                }`}
              >
                {difficulty === diff.value && (
                  <motion.div
                    layoutId="diff-indicator"
                    className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-lg"
                    transition={{ duration: 0.2 }}
                  />
                )}
                <span className="relative">{diff.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Types — Chip Grid */}
        <div>
          <label className="block font-mono text-[10px] tracking-[0.24em] text-primary mb-3">
            BUG TYPES
            <span className="ml-2 text-muted-foreground font-normal">(OPTIONAL)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ERROR_TYPE_OPTIONS.map((opt) => {
              const isSelected = selectedErrorTypes.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleErrorType(opt.value)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border font-mono text-[11px] transition-all ${
                    isSelected
                      ? "border-primary/50 bg-primary/10 text-primary shadow-sm shadow-primary/10"
                      : "border-border/20 bg-surface-1/20 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-surface-1/40"
                  }`}
                >
                  <span className="text-sm leading-none">{opt.icon}</span>
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(48,201,232,0.6)]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Directive */}
        <div>
          <label className="block font-mono text-[10px] tracking-[0.24em] text-primary mb-3">
            CUSTOM DIRECTIVE
            <span className="ml-2 text-muted-foreground font-normal">(OPTIONAL)</span>
          </label>
          <div className="relative">
            <textarea
              placeholder="e.g. Needs to involve a race condition when fetching user profile data..."
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 bg-surface-1/30 border border-border/20 focus:border-primary/50 rounded-lg p-3 text-sm text-foreground outline-none resize-none font-mono transition-colors placeholder:text-muted-foreground/40"
            />
            <span className="absolute bottom-2 right-3 font-mono text-[9px] text-muted-foreground/50">
              {description.length}/500
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {!isInsideModal && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-3 rounded-lg border border-border/30 bg-surface-1/30 font-mono text-xs tracking-[0.1em] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              CANCEL
            </button>
          )}
          <button
            type="submit"
            disabled={isGenerating}
            className="flex-1 group relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/20 via-primary/15 to-accent/10 border border-primary/40 px-6 py-3.5 font-mono text-xs font-bold tracking-[0.15em] text-primary transition-all hover:shadow-[0_0_30px_rgba(48,201,232,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 flex items-center justify-center gap-2.5">
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  GENERATING…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  SYNTHESIZE SCENARIO
                </>
              )}
            </span>
            {/* Sweeping light effect on hover */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
          </button>
        </div>
      </form>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-5 p-4 bg-red-950/30 border border-red-500/20 rounded-lg flex items-center justify-between"
          >
            <p className="text-red-400 text-sm font-mono">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-300/70 hover:text-red-300 font-mono text-xs ml-4 shrink-0"
            >
              DISMISS
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Wrapper>
  );
}

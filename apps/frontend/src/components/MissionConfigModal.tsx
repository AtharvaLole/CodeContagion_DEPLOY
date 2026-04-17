import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Crosshair,
  Trophy,
  Filter,
  RotateCcw,
  Zap,
  Shield,
  Cpu,
} from "lucide-react";
import GlassPanel from "@/components/GlassPanel";
import { CyberDropdown, type DropdownOption } from "@/components/CyberDropdown";
import { AiScenarioGenerator } from "@/components/AiScenarioGenerator";
import type { AiGeneratedScenarioResponse } from "@/features/ai/ai-api";

type SoloQueueType = "casual" | "ranked";

interface MissionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  /* Standard mode */
  queueType: SoloQueueType;
  onQueueTypeChange: (qt: SoloQueueType) => void;
  filterLanguage: string;
  onFilterLanguageChange: (lang: string) => void;
  filterDifficulty: string;
  onFilterDifficultyChange: (diff: string) => void;
  selectedTopicId: string;
  onSelectedTopicIdChange: (id: string) => void;
  topicOptions: Array<{ id: string; label: string }>;
  onStartRound: () => void;
  isLoading: boolean;
  /* AI mode */
  onAiScenarioGenerated: (response: AiGeneratedScenarioResponse) => void;
}

const languageOptions: DropdownOption[] = [
  { value: "All", label: "ALL LANGUAGES", colorClass: "text-foreground" },
  { value: "typescript", label: "TYPESCRIPT", colorClass: "text-primary" },
  { value: "python", label: "PYTHON", colorClass: "text-neon-yellow" },
  { value: "cpp", label: "C++", colorClass: "text-accent" },
];

const difficultyOptions: DropdownOption[] = [
  { value: "All", label: "ALL DIFFICULTIES", colorClass: "text-foreground" },
  { value: "EASY", label: "EASY", colorClass: "text-neon-green" },
  { value: "MEDIUM", label: "MEDIUM", colorClass: "text-neon-yellow" },
  { value: "HARD", label: "HARD", colorClass: "text-primary" },
  { value: "EXTREME", label: "EXTREME", colorClass: "text-accent" },
];

type ModalTab = "standard" | "ai";

export function MissionConfigModal({
  isOpen,
  onClose,
  queueType,
  onQueueTypeChange,
  filterLanguage,
  onFilterLanguageChange,
  filterDifficulty,
  onFilterDifficultyChange,
  selectedTopicId,
  onSelectedTopicIdChange,
  topicOptions,
  onStartRound,
  isLoading,
  onAiScenarioGenerated,
}: MissionConfigModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>("standard");

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  const allTopics = [{ id: "random", label: "Random Topic" }, ...topicOptions];
  const effectiveDifficultyFilter = queueType === "ranked" ? "All" : filterDifficulty;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          {/* Decorative scanline */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(48,201,232,0.15) 2px, rgba(48,201,232,0.15) 4px)",
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-primary/20 bg-[hsl(222,47%,6%)] shadow-[0_0_80px_rgba(48,201,232,0.08),0_0_2px_rgba(48,201,232,0.3)]"
          >
            {/* Top glow bar */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            {/* Header */}
            <div className="relative flex items-center justify-between px-6 py-5 border-b border-border/20">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 border border-primary/20">
                  <Crosshair className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-xl text-foreground tracking-wide">MISSION CONFIG</h2>
                  <p className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground mt-0.5">
                    CONFIGURE YOUR DEBUGGING CHALLENGE
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-border/20 bg-surface-1/40 text-muted-foreground transition-all hover:text-foreground hover:border-primary/30 hover:bg-primary/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Bar */}
            <div className="relative flex border-b border-border/20 px-6">
              {(
                [
                  { id: "standard", label: "STANDARD MODE", icon: Crosshair },
                  { id: "ai", label: "AI GENERATE", icon: Sparkles },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-3.5 font-mono text-[10px] tracking-[0.2em] transition-colors ${
                    activeTab === tab.id
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="modal-tab-indicator"
                      className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full shadow-[0_0_8px_rgba(48,201,232,0.6)]"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-180px)] p-6">
              <AnimatePresence mode="wait">
                {activeTab === "standard" ? (
                  <motion.div
                    key="standard"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6"
                  >
                    {/* Queue Type */}
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.24em] text-primary mb-3">QUEUE TYPE</p>
                      <div className="grid grid-cols-2 gap-3">
                        {(["casual", "ranked"] as SoloQueueType[]).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => onQueueTypeChange(mode)}
                            className={`group relative rounded-xl border p-4 text-left transition-all overflow-hidden ${
                              queueType === mode
                                ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/10"
                                : "border-border/30 bg-surface-1/30 hover:border-primary/30 hover:bg-surface-1/50"
                            }`}
                          >
                            {/* Card glow on active */}
                            {queueType === mode && (
                              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />
                            )}
                            <div className="relative flex items-center gap-3">
                              <div
                                className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
                                  queueType === mode
                                    ? "bg-primary/20 border-primary/40 text-primary"
                                    : "bg-surface-1/40 border-border/30 text-muted-foreground"
                                }`}
                              >
                                {mode === "casual" ? <Shield className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="font-mono text-xs tracking-[0.18em] font-semibold">
                                  {mode.toUpperCase()}
                                </p>
                                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                                  {mode === "ranked"
                                    ? "Random topic, live ELO update."
                                    : "Choose topic, practice freely."}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Filters */}
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.24em] text-primary mb-3 flex items-center gap-2">
                        <Filter className="w-3 h-3" />
                        FILTERS
                      </p>
                      <div className="flex items-center gap-3">
                        <CyberDropdown
                          label="LANG"
                          options={languageOptions}
                          value={filterLanguage}
                          onChange={onFilterLanguageChange}
                        />
                        {queueType === "casual" && (
                          <CyberDropdown
                            label="DIFF"
                            options={difficultyOptions}
                            value={effectiveDifficultyFilter}
                            onChange={onFilterDifficultyChange}
                          />
                        )}
                        {(filterLanguage !== "All" || (queueType === "casual" && filterDifficulty !== "All")) && (
                          <button
                            onClick={() => {
                              onFilterLanguageChange("All");
                              onFilterDifficultyChange("All");
                            }}
                            className="group flex items-center gap-1.5 rounded-lg border border-border/20 bg-surface-1/30 px-2.5 py-2.5 font-mono text-[10px] tracking-[0.15em] text-muted-foreground transition-all hover:border-primary/30 hover:text-primary"
                          >
                            <RotateCcw className="w-3 h-3 transition-transform group-hover:-rotate-180 duration-300" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Topic Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-mono text-[10px] tracking-[0.24em] text-primary">
                          {queueType === "ranked" ? "TOPIC MODE" : "SELECT TOPIC"}
                        </p>
                        {isLoading && (
                          <span className="font-mono text-[10px] text-muted-foreground animate-pulse">SYNCING…</span>
                        )}
                      </div>

                      {queueType === "ranked" ? (
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Zap className="w-4 h-4 text-primary" />
                            <div>
                              <p className="font-mono text-xs text-foreground">Ranked — Random Assignment</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Topic and question are randomized for fair ranking.
                              </p>
                            </div>
                          </div>
                          <span className="rounded-full border border-primary/30 bg-background/40 px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-primary">
                            RNG
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                          {allTopics.map((topic) => (
                            <button
                              key={topic.id}
                              onClick={() => onSelectedTopicIdChange(topic.id)}
                              className={`relative rounded-xl border p-3 text-left transition-all overflow-hidden ${
                                selectedTopicId === topic.id
                                  ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/10"
                                  : "border-border/20 bg-surface-1/30 hover:border-primary/30 hover:bg-surface-1/50"
                              }`}
                            >
                              <p className="font-mono text-[11px] text-foreground truncate">{topic.label}</p>
                              <p className="mt-0.5 font-mono text-[9px] text-muted-foreground tracking-[0.15em]">
                                {topic.id === "random" ? "RNG" : "TOPIC"}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Start Button */}
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          onStartRound();
                          onClose();
                        }}
                        className="w-full relative group overflow-hidden rounded-xl bg-primary/20 border border-primary/40 px-6 py-4 font-mono text-sm font-bold tracking-[0.2em] text-primary transition-all hover:bg-primary/30 hover:shadow-[0_0_30px_rgba(48,201,232,0.2)]"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-3">
                          <Crosshair className="w-5 h-5" />
                          {queueType === "ranked" ? "START RANKED ROUND" : "START ROUND"}
                        </span>
                        {/* Animated border glow */}
                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          style={{
                            background: "linear-gradient(90deg, transparent 0%, rgba(48,201,232,0.08) 50%, transparent 100%)",
                          }}
                        />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="ai"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.15 }}
                  >
                    <AiScenarioGenerator
                      onScenarioGenerated={(result) => {
                        onAiScenarioGenerated(result);
                        onClose();
                      }}
                      onCancel={onClose}
                      isInsideModal
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom glow bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MissionConfigModal;

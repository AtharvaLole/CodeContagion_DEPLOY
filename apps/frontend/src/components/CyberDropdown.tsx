import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export type DropdownOption<T extends string = string> = {
  value: T;
  label: string;
  colorClass?: string;
};

interface CyberDropdownProps<T extends string = string> {
  label: string;
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function CyberDropdown<T extends string = string>({
  label,
  options,
  value,
  onChange
}: CyberDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 font-mono text-[10px] tracking-[0.2em] transition-all ${
          open
            ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/5"
            : "border-border/30 bg-surface-1/50 hover:border-primary/30 hover:bg-surface-1/70"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-muted-foreground">{label}:</span>
          <span className={`block truncate ${selected?.colorClass ?? "text-foreground"}`}>
            {selected?.label ?? value}
          </span>
        </span>
        <ChevronDown
          className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1.5 w-full rounded-lg border border-border/40 bg-[hsl(222,40%,8%)] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left font-mono text-[10px] tracking-[0.18em] transition-colors ${
                  value === option.value
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    value === option.value
                      ? "bg-primary shadow-[0_0_6px_hsla(193,78%,55%,0.6)]"
                      : "bg-border/50"
                  }`}
                />
                <span className={option.colorClass}>{option.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CyberDropdown;

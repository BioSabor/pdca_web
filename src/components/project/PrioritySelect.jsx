import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import Popover from "../ui/Popover";
import { PRIORITY_LEVELS, getPriorityConfig } from "../../lib/priority";
import { cn } from "../../lib/utils";

// Selector de prioridad multinivel (puntos de color de PRIORITY_LEVELS).
// value: id ya normalizado ("none"|"low"|"medium"|"high"); onChange recibe el id.
export default function PrioritySelect({ value, onChange, showLabel = false, className }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef(null);
    const cfg = getPriorityConfig(value);

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label={`Prioridad: ${cfg.label}`}
                title={`Prioridad: ${cfg.label}`}
                className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-surface-2",
                    className
                )}
            >
                <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: cfg.color }}
                />
                {showLabel && (
                    <span className="text-xs text-gray-700 dark:text-gray-200">{cfg.label}</span>
                )}
                <ChevronDown className="h-3 w-3 flex-shrink-0 text-gray-400" />
            </button>
            <Popover open={open} onClose={() => setOpen(false)} anchorRef={btnRef} minWidth={160}>
                {PRIORITY_LEVELS.map((level) => (
                    <button
                        key={level.id}
                        type="button"
                        onClick={() => {
                            onChange(level.id);
                            setOpen(false);
                        }}
                        className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-surface-2 dark:text-gray-200",
                            level.id === cfg.id && "bg-surface-2/60 font-medium"
                        )}
                    >
                        <span
                            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: level.color }}
                        />
                        {level.label}
                    </button>
                ))}
            </Popover>
        </>
    );
}

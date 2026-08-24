import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import Popover from "./Popover";
import { cn } from "../../lib/utils";

// Dropdown con checkboxes múltiples (usuarios, estados, filtros...)
export default function MultiCheckDropdown({ options, selected, onChange, placeholder, className }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef(null);

    function toggle(value) {
        if (selected.includes(value)) {
            onChange(selected.filter((v) => v !== value));
        } else {
            onChange([...selected, value]);
        }
    }

    const selectedLabels = options.filter((o) => selected.includes(o.value)).map((o) => o.label);

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className={cn(
                    "flex min-h-9 min-w-[7rem] max-w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm hover:bg-surface-2 sm:min-w-[140px]",
                    className
                )}
            >
                <span className="truncate text-left">
                    {selected.length === 0
                        ? placeholder
                        : selectedLabels.length <= 2
                            ? selectedLabels.join(", ")
                            : `${selectedLabels.length} seleccionados`}
                </span>
                <ChevronDown className="h-3 w-3 flex-shrink-0 text-gray-400" />
            </button>
            <Popover open={open} onClose={() => setOpen(false)} anchorRef={btnRef} className="max-w-[calc(100vw-1rem)]">
                {options.map((opt) => (
                    <label
                        key={opt.value}
                        className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-surface-2"
                    >
                        <input
                            type="checkbox"
                            checked={selected.includes(opt.value)}
                            onChange={() => toggle(opt.value)}
                            className="h-4 w-4 rounded text-brand-600"
                        />
                        {opt.color && (
                            <span
                                className="h-3 w-3 flex-shrink-0 rounded-full"
                                style={{ backgroundColor: opt.color }}
                            ></span>
                        )}
                        <span className="text-sm text-gray-700 dark:text-gray-200">{opt.label}</span>
                    </label>
                ))}
            </Popover>
        </>
    );
}

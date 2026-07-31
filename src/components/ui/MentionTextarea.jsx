import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { normalizeText, cn } from "../../lib/utils";

// Textarea con autocompletado de menciones @usuario. Al escribir "@" muestra
// sugerencias; seleccionar inserta "@Nombre Visible". Las menciones finales se
// extraen del texto al enviar (parseMentions de commentService).
export default function MentionTextarea({
    value,
    onChange,
    users,
    placeholder,
    className,
    rows = 2,
    onSubmit,
}) {
    const textareaRef = useRef(null);
    const [mentionQuery, setMentionQuery] = useState(null); // null = cerrado
    const [highlighted, setHighlighted] = useState(0);
    const [anchorPos, setAnchorPos] = useState({ top: 0, left: 0 });

    const suggestions = useMemo(() => {
        if (mentionQuery === null) return [];
        const q = normalizeText(mentionQuery);
        return users
            .filter((u) => {
                const name = u.displayName || u.email || "";
                return normalizeText(name).includes(q);
            })
            .slice(0, 6);
    }, [mentionQuery, users]);

    function updateMentionState(text, caret) {
        const before = text.slice(0, caret);
        const match = before.match(/@([^\s@]*)$/);
        if (match) {
            setMentionQuery(match[1]);
            setHighlighted(0);
            const rect = textareaRef.current?.getBoundingClientRect();
            if (rect) setAnchorPos({ top: rect.bottom + 2, left: rect.left });
        } else {
            setMentionQuery(null);
        }
    }

    function handleChange(e) {
        onChange(e.target.value);
        updateMentionState(e.target.value, e.target.selectionStart);
    }

    function insertMention(user) {
        const el = textareaRef.current;
        const caret = el?.selectionStart ?? value.length;
        const before = value.slice(0, caret).replace(/@[^\s@]*$/, "");
        const name = user.displayName || user.email;
        const after = value.slice(caret);
        const next = `${before}@${name} ${after}`;
        onChange(next);
        setMentionQuery(null);
        requestAnimationFrame(() => {
            el?.focus();
            const pos = before.length + name.length + 2;
            el?.setSelectionRange(pos, pos);
        });
    }

    function handleKeyDown(e) {
        if (mentionQuery !== null && suggestions.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlighted((h) => (h + 1) % suggestions.length);
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlighted((h) => (h - 1 + suggestions.length) % suggestions.length);
                return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                insertMention(suggestions[highlighted]);
                return;
            }
            if (e.key === "Escape") {
                setMentionQuery(null);
                return;
            }
        }
        if (e.key === "Enter" && !e.shiftKey && onSubmit) {
            e.preventDefault();
            onSubmit();
        }
    }

    return (
        <>
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setMentionQuery(null), 150)}
                placeholder={placeholder}
                rows={rows}
                className={cn("input resize-y", className)}
            />
            {mentionQuery !== null && suggestions.length > 0 &&
                createPortal(
                    <div
                        className="z-popover max-h-52 overflow-y-auto rounded-lg border border-line bg-surface shadow-overlay"
                        style={{ position: "fixed", top: anchorPos.top, left: anchorPos.left, minWidth: 220 }}
                    >
                        {suggestions.map((u, i) => (
                            <button
                                key={u.id}
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    insertMention(u);
                                }}
                                className={cn(
                                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200",
                                    i === highlighted ? "bg-surface-2" : "hover:bg-surface-2"
                                )}
                            >
                                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                                    {(u.displayName || u.email || "?").charAt(0).toUpperCase()}
                                </span>
                                <span className="truncate">{u.displayName || u.email}</span>
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
        </>
    );
}

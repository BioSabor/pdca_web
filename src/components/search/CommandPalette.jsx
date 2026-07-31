import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search, FolderKanban, ListTodo, CalendarDays, Plus, CornerDownLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import useRealtimeProjects from "../../hooks/useRealtimeProjects";
import useRealtimeAllProjects from "../../hooks/useRealtimeAllProjects";
import useRealtimeMyActions from "../../hooks/useRealtimeMyActions";
import useRealtimeAllActions from "../../hooks/useRealtimeAllActions";
import useModalBehavior from "../../hooks/useModalBehavior";
import { normalizeText, cn } from "../../lib/utils";

export const OPEN_PALETTE_EVENT = "pdca:open-command-palette";

const QUICK_COMMANDS = [
    { id: "cmd-mytasks", label: "Ir a Mis Tareas", icon: ListTodo, to: "/my-tasks" },
    { id: "cmd-new", label: "Nuevo proyecto", icon: Plus, to: "/projects/new" },
    { id: "cmd-calendar", label: "Ir al Calendario", icon: CalendarDays, to: "/calendar" },
];

// Paleta de comandos global (Ctrl+K / Cmd+K). Las suscripciones de datos solo
// se abren mientras está abierta.
export default function CommandPalette() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlighted, setHighlighted] = useState(0);
    const panelRef = useRef(null);
    const inputRef = useRef(null);

    const isAdmin = currentUser?.role === "admin";

    // Datos solo mientras la paleta está abierta
    const { projects: myProjects } = useRealtimeProjects(open && !isAdmin ? currentUser?.uid : null);
    const { projects: allProjects } = useRealtimeAllProjects({ enabled: open && isAdmin });
    const { actions: myActions } = useRealtimeMyActions(open && !isAdmin ? currentUser?.uid : null);
    const { allActions } = useRealtimeAllActions({ enabled: open && isAdmin });

    const projects = isAdmin ? allProjects : myProjects;
    const actions = isAdmin ? allActions : myActions;

    // Atajo de teclado global + evento del botón lupa
    useEffect(() => {
        function handleKey(e) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setOpen((v) => !v);
            }
        }
        function handleOpenEvent() {
            setOpen(true);
        }
        window.addEventListener("keydown", handleKey);
        window.addEventListener(OPEN_PALETTE_EVENT, handleOpenEvent);
        return () => {
            window.removeEventListener("keydown", handleKey);
            window.removeEventListener(OPEN_PALETTE_EVENT, handleOpenEvent);
        };
    }, []);

    useEffect(() => {
        if (open) {
            setQuery("");
            setHighlighted(0);
        }
    }, [open]);

    useModalBehavior({ open, onClose: () => setOpen(false), panelRef, initialFocusRef: inputRef });

    const results = useMemo(() => {
        const q = normalizeText(query.trim());
        const projectsById = {};
        projects.forEach((p) => (projectsById[p.id] = p));

        const commandItems = QUICK_COMMANDS.filter(
            (c) => !q || normalizeText(c.label).includes(q)
        ).map((c) => ({ kind: "command", ...c }));

        if (!q) {
            // Sin query: comandos + proyectos recientes
            const recentProjects = [...projects]
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                .slice(0, 5)
                .map((p) => ({ kind: "project", id: `p-${p.id}`, project: p }));
            return { commands: commandItems, projects: recentProjects, actions: [] };
        }

        const projectMatches = projects
            .filter((p) => normalizeText(p.title).includes(q) || normalizeText(p.description).includes(q))
            .sort((a, b) => {
                const aTitle = normalizeText(a.title).includes(q) ? 0 : 1;
                const bTitle = normalizeText(b.title).includes(q) ? 0 : 1;
                return aTitle - bTitle;
            })
            .slice(0, 6)
            .map((p) => ({ kind: "project", id: `p-${p.id}`, project: p }));

        const actionMatches = actions
            .filter((a) => normalizeText(a.action).includes(q) || normalizeText(a.observations).includes(q))
            .sort((a, b) => {
                const aText = normalizeText(a.action).includes(q) ? 0 : 1;
                const bText = normalizeText(b.action).includes(q) ? 0 : 1;
                return aText - bText;
            })
            .slice(0, 8)
            .map((a) => ({
                kind: "action",
                id: `a-${a.projectId}-${a.id}`,
                action: a,
                projectTitle: projectsById[a.projectId]?.title || "",
            }));

        return { commands: commandItems, projects: projectMatches, actions: actionMatches };
    }, [query, projects, actions]);

    const flat = useMemo(
        () => [...results.commands, ...results.projects, ...results.actions],
        [results]
    );

    useEffect(() => {
        if (highlighted >= flat.length) setHighlighted(0);
    }, [flat.length, highlighted]);

    function select(item) {
        setOpen(false);
        if (item.kind === "command") navigate(item.to);
        else if (item.kind === "project") navigate(`/projects/${item.project.id}`);
        else if (item.kind === "action") {
            navigate(`/projects/${item.action.projectId}?action=${item.action.id}`);
        }
    }

    function handleKeyDown(e) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlighted((h) => (flat.length ? (h + 1) % flat.length : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted((h) => (flat.length ? (h - 1 + flat.length) % flat.length : 0));
        } else if (e.key === "Enter" && flat[highlighted]) {
            e.preventDefault();
            select(flat[highlighted]);
        }
    }

    if (!open) return null;

    let flatIndex = -1;
    const renderItem = (item, content) => {
        flatIndex++;
        const idx = flatIndex;
        return (
            <button
                key={item.id}
                type="button"
                onClick={() => select(item)}
                onMouseEnter={() => setHighlighted(idx)}
                className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left",
                    idx === highlighted ? "bg-brand-600/10 dark:bg-brand-500/15" : "hover:bg-surface-2"
                )}
            >
                {content}
                {idx === highlighted && (
                    <CornerDownLeft className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                )}
            </button>
        );
    };

    return createPortal(
        <div
            className="fixed inset-0 z-modal flex items-start justify-center bg-black/50 p-4 pt-[12dvh]"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) setOpen(false);
            }}
        >
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Búsqueda global"
                className="flex max-h-[70dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-surface shadow-overlay"
                onKeyDown={handleKeyDown}
            >
                <div className="flex items-center gap-3 border-b border-line px-4">
                    <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar proyectos y acciones…"
                        aria-label="Buscar proyectos y acciones"
                        className="h-12 w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100"
                    />
                    <kbd className="hidden flex-shrink-0 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] text-gray-500 sm:block">
                        Esc
                    </kbd>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {flat.length === 0 ? (
                        <p className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            Sin resultados para &quot;{query}&quot;
                        </p>
                    ) : (
                        <>
                            {results.commands.length > 0 && (
                                <Group label="Comandos">
                                    {results.commands.map((item) =>
                                        renderItem(
                                            item,
                                            <>
                                                <item.icon className="h-4 w-4 flex-shrink-0 text-brand-600 dark:text-brand-400" />
                                                <span className="text-sm text-gray-800 dark:text-gray-100">{item.label}</span>
                                            </>
                                        )
                                    )}
                                </Group>
                            )}
                            {results.projects.length > 0 && (
                                <Group label="Proyectos">
                                    {results.projects.map((item) =>
                                        renderItem(
                                            item,
                                            <>
                                                <FolderKanban className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm text-gray-800 dark:text-gray-100">
                                                        {item.project.title}
                                                    </span>
                                                    {item.project.description && (
                                                        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                                                            {item.project.description}
                                                        </span>
                                                    )}
                                                </span>
                                            </>
                                        )
                                    )}
                                </Group>
                            )}
                            {results.actions.length > 0 && (
                                <Group label="Acciones">
                                    {results.actions.map((item) =>
                                        renderItem(
                                            item,
                                            <>
                                                <ListTodo className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm text-gray-800 dark:text-gray-100">
                                                        {item.action.seqId ? `#${item.action.seqId} · ` : ""}
                                                        {item.action.action}
                                                    </span>
                                                    <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                                                        {item.projectTitle}
                                                    </span>
                                                </span>
                                            </>
                                        )
                                    )}
                                </Group>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

function Group({ label, children }) {
    return (
        <div className="mb-1">
            <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {label}
            </p>
            {children}
        </div>
    );
}

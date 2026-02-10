import { useMemo } from "react";
import { X } from "lucide-react";

export default function GanttModal({ isOpen, onClose, actions, projectTitle }) {
    if (!isOpen) return null;

    // Filter actions that have at least some date info to visualize
    const validActions = useMemo(() => {
        return actions.filter(a =>
            (a.startDate || a.proposedStartDate) &&
            (a.actualEndDate || a.proposedEndDate)
        ).sort((a, b) => {
            const startA = new Date(a.startDate || a.proposedStartDate);
            const startB = new Date(b.startDate || b.proposedStartDate);
            return startA - startB;
        });
    }, [actions]);

    const { minDate, maxDate, totalDays } = useMemo(() => {
        if (validActions.length === 0) return { minDate: new Date(), maxDate: new Date(), totalDays: 1 };

        let min = new Date(validActions[0].startDate || validActions[0].proposedStartDate);
        let max = new Date(validActions[0].actualEndDate || validActions[0].proposedEndDate);

        validActions.forEach(a => {
            const start = new Date(a.startDate || a.proposedStartDate);
            const end = new Date(a.actualEndDate || a.proposedEndDate);
            if (start < min) min = start;
            if (end > max) max = end;
        });

        // Add buffer
        min.setDate(min.getDate() - 2);
        max.setDate(max.getDate() + 5);

        const diffTime = Math.abs(max - min);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return { minDate: min, maxDate: max, totalDays: diffDays };
    }, [validActions]);

    function getPosition(action) {
        const start = new Date(action.startDate || action.proposedStartDate);
        const end = new Date(action.actualEndDate || action.proposedEndDate);

        const startDiff = Math.ceil((start - minDate) / (1000 * 60 * 60 * 24));
        const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1; // +1 to include the end day

        const left = (startDiff / totalDays) * 100;
        const width = (duration / totalDays) * 100;

        return { left: `${left}%`, width: `${Math.max(width, 1)}%` }; // Min width 1%
    }

    // Helper to format date for header
    function formatDate(date) {
        return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
    }

    // Generate timeline ticks (every few days depending on range)
    const ticks = useMemo(() => {
        const t = [];
        const step = totalDays > 30 ? Math.ceil(totalDays / 10) : 1;
        for (let i = 0; i < totalDays; i += step) {
            const d = new Date(minDate);
            d.setDate(d.getDate() + i);
            t.push({ label: formatDate(d), left: `${(i / totalDays) * 100}%` });
        }
        return t;
    }, [totalDays, minDate]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Cronograma: {projectTitle}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4">
                    {validActions.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">
                            No hay acciones con fechas suficientes para mostrar en el cronograma.
                            <br />Asegúrese de definir fechas de inicio y fin (propuestas o reales).
                        </div>
                    ) : (
                        <div className="relative min-w-[600px]">
                            {/* Timeline Header */}
                            <div className="flex border-b border-gray-200 pb-2 mb-2 relative h-6">
                                {ticks.map((tick, i) => (
                                    <div key={i} className="absolute text-xs text-gray-500 transform -translate-x-1/2" style={{ left: tick.left }}>
                                        {tick.label}
                                    </div>
                                ))}
                            </div>

                            {/* Grid lines */}
                            <div className="absolute inset-0 top-8 pointer-events-none">
                                {ticks.map((tick, i) => (
                                    <div key={i} className="absolute h-full border-l border-gray-100" style={{ left: tick.left }}></div>
                                ))}
                            </div>

                            {/* Bars */}
                            <div className="space-y-3 pt-2">
                                {validActions.map(action => {
                                    const { left, width } = getPosition(action);
                                    // Use status color but transparent? Or solid?
                                    // We need to map status to color again or pass it. 
                                    // For now hardcode or use a default.
                                    // In a real app we'd pass the status config map.
                                    const isDone = action.status === 'finalizado';
                                    const isDiscarded = action.status === 'descartado';
                                    const bgColor = isDone ? 'bg-green-500' : isDiscarded ? 'bg-gray-400' : 'bg-blue-500';

                                    return (
                                        <div key={action.id} className="relative group">
                                            <div className="flex items-center text-xs mb-1">
                                                <div className="w-1/4 pr-2 truncate font-medium text-gray-700" title={action.action}>
                                                    {action.action}
                                                </div>
                                                <div className="w-3/4 relative h-6 bg-gray-50 rounded">
                                                    <div
                                                        className={`absolute top-1 bottom-1 rounded shadow-sm ${bgColor} bg-opacity-80 hover:bg-opacity-100 transition cursor-pointer`}
                                                        style={{ left, width }}
                                                        title={`${action.action} (${formatDate(new Date(action.startDate || action.proposedStartDate))} - ${formatDate(new Date(action.actualEndDate || action.proposedEndDate))})`}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

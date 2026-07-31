export const PDCA_PHASES = [
    { id: "plan", label: "Plan", longLabel: "Planificar", color: "#3B82F6" },
    { id: "do", label: "Do", longLabel: "Hacer", color: "#22C55E" },
    { id: "check", label: "Check", longLabel: "Verificar", color: "#F59E0B" },
    { id: "act", label: "Act", longLabel: "Actuar", color: "#8B5CF6" },
];

export function getPhaseConfig(phaseId) {
    return PDCA_PHASES.find((p) => p.id === phaseId) || null;
}

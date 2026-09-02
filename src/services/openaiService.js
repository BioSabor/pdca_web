import { PRIORITY_LEVELS } from "../lib/priority";
import { PDCA_PHASES } from "../lib/pdca";

// ADVERTENCIA: esta key viaja embebida en el bundle del cliente (decisión de
// proyecto, sin backend — ver README, sección "Limitaciones conocidas").
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const TRANSCRIBE_MODEL = "whisper-1";
const EXTRACT_MODEL = "gpt-5.6-luna";

const PRIORITY_IDS = PRIORITY_LEVELS.map((l) => l.id).filter((id) => id !== "none");
const PHASE_IDS = PDCA_PHASES.map((p) => p.id);

class OpenAIConfigError extends Error {}

function assertConfigured() {
    if (!API_KEY) {
        throw new OpenAIConfigError(
            "Falta VITE_OPENAI_API_KEY en el .env. Revisa .env.example."
        );
    }
}

export async function transcribeAudio(blob) {
    assertConfigured();

    const form = new FormData();
    form.append("file", blob, "nota.webm");
    form.append("model", TRANSCRIBE_MODEL);
    form.append("language", "es");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${API_KEY}` },
        body: form,
    });
    if (!res.ok) {
        throw new Error(`Whisper: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    return (data.text || "").trim();
}

const EXTRACTION_SCHEMA = {
    name: "action_fields",
    strict: true,
    schema: {
        type: "object",
        additionalProperties: false,
        properties: {
            action: { type: "string" },
            assignedUserId: { type: ["string", "null"] },
            assignedUserRaw: { type: ["string", "null"] },
            priority: { type: ["string", "null"], enum: [...PRIORITY_IDS, null] },
            phase: { type: ["string", "null"], enum: [...PHASE_IDS, null] },
            proposedStartDate: { type: ["string", "null"] },
            proposedEndDate: { type: ["string", "null"] },
            observations: { type: ["string", "null"] },
        },
        required: [
            "action",
            "assignedUserId",
            "assignedUserRaw",
            "priority",
            "phase",
            "proposedStartDate",
            "proposedEndDate",
            "observations",
        ],
    },
};

function sanitizeExtraction(raw, userOptions) {
    const validUserIds = new Set(userOptions.map((o) => o.value));
    const priority = PRIORITY_IDS.includes(raw.priority) ? raw.priority : null;
    const phase = PHASE_IDS.includes(raw.phase) ? raw.phase : null;
    const assignedUserId = validUserIds.has(raw.assignedUserId) ? raw.assignedUserId : null;
    const isoDate = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

    return {
        action: (raw.action || "").trim(),
        assignedUserId,
        assignedUserRaw: assignedUserId ? null : raw.assignedUserRaw || null,
        priority,
        phase,
        proposedStartDate: isoDate(raw.proposedStartDate),
        proposedEndDate: isoDate(raw.proposedEndDate),
        observations: raw.observations || null,
    };
}

export async function extractActionFields(transcript, { userOptions, todayISO }) {
    assertConfigured();

    const usersList = userOptions.length
        ? userOptions.map((o) => `- ${o.label} (id: ${o.value})`).join("\n")
        : "(sin usuarios asignables en este proyecto)";

    const systemPrompt = `Extraes datos de una nota de voz transcrita para crear una tarea (acción) en una herramienta de gestión PDCA.
Responde SOLO con el JSON pedido, sin explicaciones.

Reglas:
- "action": descripción de la tarea (incluye el título si lo hay), redactada de forma clara y concisa a partir de la transcripción. Es el único campo que se rellenará siempre.
- "assignedUserId": si la transcripción menciona claramente a una de estas personas como responsable, usa su id EXACTO de esta lista (o null si no hay mención o no coincide con nadie):
${usersList}
- "assignedUserRaw": si se menciona un responsable pero no coincide con nadie de la lista, pon aquí el nombre tal cual se mencionó (si no, null).
- "priority": "low" | "medium" | "high" solo si la urgencia/importancia se menciona explícita o muy claramente (p. ej. "urgente" -> "high"); si no se menciona, null.
- "phase": una de "plan" | "do" | "check" | "act" del ciclo PDCA, solo si es evidente; si no, null.
- "proposedStartDate"/"proposedEndDate": fechas en formato YYYY-MM-DD, resolviendo expresiones relativas ("mañana", "el viernes", "en una semana") tomando como referencia que HOY es ${todayISO}. Si no se menciona ninguna fecha, null.
- "observations": cualquier detalle adicional que no encaje en la descripción principal; si no hay nada así, null.
- No inventes datos que no estén en la transcripción: ante la duda, usa null.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: EXTRACT_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: transcript },
            ],
            response_format: { type: "json_schema", json_schema: EXTRACTION_SCHEMA },
        }),
    });
    if (!res.ok) {
        throw new Error(`LLM: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const raw = JSON.parse(data.choices[0].message.content);
    return sanitizeExtraction(raw, userOptions);
}

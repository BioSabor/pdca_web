import { useState } from "react";

// Línea temporal de una sola serie (sin leyenda: el título la nombra).
// Línea de 2px en color de marca, rejilla recesiva, tooltip por punto.
export default function LineChart({ points, ariaLabel, height = 180 }) {
    const [hovered, setHovered] = useState(null);
    const width = 600;
    const padX = 8;
    const padTop = 12;
    const padBottom = 24;
    const max = Math.max(1, ...points.map((p) => p.value));
    const innerW = width - padX * 2;
    const innerH = height - padTop - padBottom;

    const coords = points.map((p, i) => ({
        x: padX + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2),
        y: padTop + innerH - (p.value / max) * innerH,
        ...p,
    }));

    const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
    const gridLines = [0.25, 0.5, 0.75, 1].map((f) => padTop + innerH - f * innerH);

    return (
        <div className="w-full overflow-x-auto">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label={ariaLabel}
                className="w-full min-w-[420px]"
                onMouseLeave={() => setHovered(null)}
            >
                {/* Rejilla recesiva */}
                {gridLines.map((y, i) => (
                    <line key={i} x1={padX} x2={width - padX} y1={y} y2={y} className="stroke-line" strokeWidth="1" />
                ))}
                <line
                    x1={padX} x2={width - padX}
                    y1={padTop + innerH} y2={padTop + innerH}
                    className="stroke-gray-300 dark:stroke-gray-600" strokeWidth="1"
                />

                {/* Línea de datos */}
                <path d={path} fill="none" strokeWidth="2" className="stroke-brand-600 dark:stroke-brand-500" strokeLinejoin="round" strokeLinecap="round" />

                {/* Puntos + zonas de hover amplias */}
                {coords.map((c, i) => (
                    <g key={i}>
                        <circle
                            cx={c.x} cy={c.y}
                            r={hovered === i ? 5 : 3}
                            className="fill-brand-600 stroke-surface dark:fill-brand-500"
                            strokeWidth="2"
                        />
                        <rect
                            x={c.x - innerW / points.length / 2} y={0}
                            width={innerW / points.length} height={height}
                            fill="transparent"
                            onMouseEnter={() => setHovered(i)}
                        >
                            <title>{`${c.label}: ${c.value}`}</title>
                        </rect>
                        {hovered === i && (
                            <text
                                x={Math.min(Math.max(c.x, 30), width - 30)} y={Math.max(c.y - 10, 12)}
                                textAnchor="middle"
                                className="fill-gray-700 text-[11px] font-medium dark:fill-gray-200"
                            >
                                {c.value}
                            </text>
                        )}
                        {/* Etiquetas del eje X, salteadas si hay muchas */}
                        {(points.length <= 8 || i % 2 === 0) && (
                            <text
                                x={c.x} y={height - 6}
                                textAnchor="middle"
                                className="fill-gray-400 text-[10px] dark:fill-gray-500"
                            >
                                {c.label}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </div>
    );
}

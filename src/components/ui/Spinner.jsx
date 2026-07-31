import { cn } from "../../lib/utils";

const SIZES = { sm: "h-4 w-4 border-2", md: "h-8 w-8 border-2", lg: "h-12 w-12 border-[3px]" };

export default function Spinner({ size = "md", label = "Cargando…", className }) {
    return (
        <div role="status" className={cn("flex items-center justify-center", className)}>
            <div
                className={cn(
                    "animate-spin rounded-full border-brand-600 border-t-transparent motion-reduce:animate-none",
                    SIZES[size] || SIZES.md
                )}
            />
            <span className="sr-only">{label}</span>
        </div>
    );
}

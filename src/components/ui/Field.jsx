import { cloneElement, isValidElement, useId } from "react";
import { cn } from "../../lib/utils";

// Campo de formulario accesible: genera un id y lo asocia label <-> control.
// Uso: <Field label="Título"><input className="input" ... /></Field>
// o con render prop: <Field label="Título">{(id) => <input id={id} ... />}</Field>
export default function Field({ label, hint, error, required, children, className }) {
    const id = useId();
    let control = children;
    if (typeof children === "function") {
        control = children(id);
    } else if (isValidElement(children)) {
        control = cloneElement(children, { id, "aria-invalid": error ? true : undefined });
    }
    return (
        <div className={cn("min-w-0", className)}>
            {label && (
                <label htmlFor={id} className="label">
                    {label}
                    {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
                </label>
            )}
            {control}
            {hint && !error && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
            )}
            {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}

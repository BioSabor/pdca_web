// Exportación CSV compatible con Excel es-ES: BOM UTF-8 y separador ";"
export function exportCsv(filename, headers, rows) {
    const escape = (value) => {
        const str = String(value ?? "");
        return /[";\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const lines = [headers.map(escape).join(";"), ...rows.map((row) => row.map(escape).join(";"))];
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

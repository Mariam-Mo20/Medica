export function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseDateToISO(value: string): string {
  const parts = value.split("/");
  if (parts.length === 3) {
    const dd = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      const yyyy = parts[2].length === 2 ? "20" + parts[2] : parts[2];
      return `${yyyy}-${mm.toString().padStart(2, "0")}-${dd.toString().padStart(2, "0")}`;
    }
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  }
  if (digits.length === 7) {
    return `${digits.slice(3)}-${digits.slice(2, 3).padStart(2, "0")}-${digits.slice(0, 2)}`;
  }
  if (digits.length === 6) {
    return `20${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  }
  return "";
}

export function formatISOToDisplay(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Match an already-formatted DD/MM/YYYY string so we never re-parse it with
// `new Date()` (which treats "05/08/2026" as US MM/DD and flips day/month).
const DMY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const dmy = dateStr.match(DMY);
  if (dmy) return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${dmy[3]}`;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  // A plain DD/MM/YYYY (date only, no time) — return it as-is.
  const dmy = dateStr.match(DMY);
  if (dmy) return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${dmy[3]}`;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const hoursStr = String(hours).padStart(2, '0');
  return `${day}/${month}/${year}, ${hoursStr}:${minutes} ${ampm}`;
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Hoja de compartir del sistema (WhatsApp etc.); false si no está disponible. */
export async function shareText(title: string, text: string): Promise<boolean> {
  if (typeof navigator.share !== 'function') return false;
  try {
    await navigator.share({ title, text });
    return true;
  } catch {
    return false; // cancelado por el usuario o no soportado
  }
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

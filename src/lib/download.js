// Trigger a browser download. Some embedded/sandboxed viewers block downloads
// silently, so callers also offer a copy-to-clipboard fallback.
export function downloadFile(filename, content, type = 'text/plain') {
  try {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

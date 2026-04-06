export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

export function buildApiUrl(path) {
  return `${apiBaseUrl}${path}`;
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(buildApiUrl(path), options);
  if (!res.ok) {
    let errorMessage = 'Request failed';
    try {
      const payload = await res.json();
      errorMessage = payload?.error || errorMessage;
    } catch {
      // no-op
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

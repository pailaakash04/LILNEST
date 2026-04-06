import { buildApiUrl } from './api';

async function authHeaders(user) {
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function loadHydration(user, dateKey) {
  try {
    if (!user) return 0;
    const res = await fetch(buildApiUrl(`/api/hydration?date=${dateKey}`), {
      headers: await authHeaders(user),
    });
    const data = await res.json();
    return Number(data?.total || 0);
  } catch {
    return 0;
  }
}

export async function addHydration(user, amount) {
  try {
    if (!user) return false;
    await fetch(buildApiUrl('/api/hydration'), {
      method: 'POST',
      headers: {
        ...(await authHeaders(user)),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amountMl: amount }),
    });
    return true;
  } catch {
    return false;
  }
}

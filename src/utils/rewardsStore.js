import { buildApiUrl } from './api';

const defaultSummary = {
  level: 1,
  points: 0,
  streak: 0,
  badges: [],
};

async function authHeaders(user) {
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function ensureSummary(user) {
  if (!user) return;
  await fetch(buildApiUrl('/api/rewards/summary'), {
    headers: await authHeaders(user),
  });
}

export async function getSummary(user) {
  if (!user) return { ...defaultSummary };
  const res = await fetch(buildApiUrl('/api/rewards/summary'), {
    headers: await authHeaders(user),
  });
  const data = await res.json();
  return data?.summary || { ...defaultSummary };
}

export async function addPoints(user, amount = 100) {
  if (!user) return { points: 0, level: 1 };
  const current = await getSummary(user);
  const newPoints = (current.points || 0) + amount;
  const newLevel = Math.max(1, Math.floor(newPoints / 1000) + 1);

  await fetch(buildApiUrl('/api/rewards/summary'), {
    method: 'POST',
    headers: {
      ...(await authHeaders(user)),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ points: newPoints, level: newLevel, streak: current.streak || 0, badges: current.badges || [] }),
  });

  return { points: newPoints, level: newLevel };
}

export async function getChallenges(user) {
  if (!user) return [];
  const res = await fetch(buildApiUrl('/api/rewards/challenges'), {
    headers: await authHeaders(user),
  });
  const data = await res.json();
  return data?.challenges || [];
}

export async function addChallenge(user, data) {
  if (!user) return;
  await fetch(buildApiUrl('/api/rewards/challenges'), {
    method: 'POST',
    headers: {
      ...(await authHeaders(user)),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

export async function grantBadge(user, label) {
  const current = await getSummary(user);
  const badges = Array.from(new Set([...(current.badges || []), label]));

  await fetch(buildApiUrl('/api/rewards/summary'), {
    method: 'POST',
    headers: {
      ...(await authHeaders(user)),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      points: current.points || 0,
      level: current.level || 1,
      streak: current.streak || 0,
      badges,
    }),
  });

  return badges;
}

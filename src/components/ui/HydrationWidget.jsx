import React, { useEffect, useState } from 'react';
import Button from './Button';
import { buildApiUrl } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const todayKey = () => new Date().toISOString().slice(0,10);

const HydrationWidget = ({ goalMl = 2000 }) => {
  const { user } = useAuth();
  const [date, setDate] = useState(todayKey());
  const [ml, setMl] = useState(0);
  const [remind, setRemind] = useState(false);
  const [intervalId, setIntervalId] = useState(null);

  useEffect(() => {
    setDate(todayKey());
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(buildApiUrl(`/api/hydration?date=${date}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (mounted) setMl(Number(data?.total || 0));
    };
    load();
    return () => { mounted = false; };
  }, [user, date]);

  useEffect(() => {
    if (remind) {
      const id = setInterval(() => {
        // gentle visual nudge; browsers often block audio/notifications without user gesture
        // so we just highlight the tab by toggling title briefly
        const original = document.title;
        document.title = '💧 Time to drink water — LILNEST';
        setTimeout(() => (document.title = original), 2000);
      }, 45 * 60 * 1000); // every 45 minutes
      setIntervalId(id);
      return () => clearInterval(id);
    }
    if (intervalId) clearInterval(intervalId);
  }, [remind]);

  const pct = Math.min(100, Math.round((ml / goalMl) * 100));

  const addAmount = async (amount) => {
    const next = ml + amount;
    setMl(next);
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(buildApiUrl('/api/hydration'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amountMl: amount }),
    });
  };

  const resetAmount = async () => {
    if (ml === 0) return;
    const delta = -ml;
    setMl(0);
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(buildApiUrl('/api/hydration'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amountMl: delta }),
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Hydration</div>
        <label className="text-sm flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={remind} onChange={(e)=>setRemind(e.target.checked)} />
          <span className="text-muted-foreground">Remind me</span>
        </label>
      </div>
      <div className="text-sm text-muted-foreground">Goal {goalMl} ml</div>
      <div className="mt-2 h-3 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary" style={{ width: pct + '%' }} />
      </div>
      <div className="mt-2 text-sm">
        <span className="font-semibold">{ml} ml</span>
        <span className="text-muted-foreground"> • {pct}%</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[150, 200, 250, 300].map((v) => (
          <Button key={v} size="xs" variant="secondary" onClick={() => addAmount(v)}>
            +{v} ml
          </Button>
        ))}
        <Button size="xs" variant="ghost" onClick={resetAmount}>Reset</Button>
      </div>
    </div>
  );
};

export default HydrationWidget;

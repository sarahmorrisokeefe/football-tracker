import { useState, useEffect, useRef } from 'react';

export default function LiveBadge() {
  const [count, setCount] = useState<number | null>(null);

  const fetch_ = async () => {
    try {
      const r = await fetch('/api/live');
      const data = await r.json();
      setCount(Array.isArray(data) ? data.length : 0);
    } catch { setCount(0); }
  };

  useEffect(() => {
    fetch_();
    const id = setInterval(() => {
      if (document.visibilityState !== 'hidden') fetch_();
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const n = count ?? 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 9, background: 'rgba(255,77,79,.1)', border: '1px solid rgba(255,77,79,.25)' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff4d4f', animation: 'blink 1.3s infinite', display: 'inline-block' }} />
      <span style={{ font: "700 11px/1 'JetBrains Mono',monospace", color: '#ff8486', letterSpacing: '.5px' }}>
        {n} LIVE
      </span>
    </div>
  );
}

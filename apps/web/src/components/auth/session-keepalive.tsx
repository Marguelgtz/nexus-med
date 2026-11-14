'use client';

import { useEffect } from 'react';

const MIN_RENEWAL_INTERVAL_MS = 60_000;

export function SessionKeepAlive() {
  useEffect(() => {
    let lastRequestAt = 0;
    let active = true;
    const renew = () => {
      if (!active || document.visibilityState === 'hidden' || Date.now() - lastRequestAt < MIN_RENEWAL_INTERVAL_MS) return;
      lastRequestAt = Date.now();
      void fetch('/api/auth/get-session', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      }).catch(() => undefined);
    };

    renew();
    window.addEventListener('focus', renew);
    document.addEventListener('visibilitychange', renew);
    return () => {
      active = false;
      window.removeEventListener('focus', renew);
      document.removeEventListener('visibilitychange', renew);
    };
  }, []);

  return null;
}

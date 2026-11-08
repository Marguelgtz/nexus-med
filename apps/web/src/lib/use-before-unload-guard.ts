'use client';

import { useEffect } from 'react';

/**
 * Dirty-form protection (UI_SPEC §2 / U-08): while `isDirty` is true, the
 * native `beforeunload` dialog guards closing or reloading the tab.
 * In-app navigation is intentionally NOT intercepted — leaving a dirty
 * form via an in-app link may drop unsaved values (documented prototype
 * tradeoff; the spec requires exactly this, not more).
 */
export function useBeforeUnloadGuard(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Chrome requires returnValue to be set for the native dialog to show.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}

'use client';

import { useEffect } from 'react';

const PROGRAMMATIC_NAVIGATION = 'nexus-med:before-navigation';

/** Programmatic navigation must use the same mounted dirty-form guard as links. */
export function confirmInAppNavigation(): boolean {
  return window.dispatchEvent(new Event(PROGRAMMATIC_NAVIGATION, { cancelable: true }));
}

/**
 * Protect unsaved clinical text from page unloads, in-app links, and browser
 * history navigation. The browser controls the beforeunload wording; local
 * navigation uses the supplied Spanish message. No text is persisted.
 */
export function useBeforeUnloadGuard(
  isDirty: boolean,
  message = 'Hay cambios sin guardar. Si sales, perderás la información capturada.',
): void {
  useEffect(() => {
    if (!isDirty) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const onDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = event.composedPath().find(
        (target): target is HTMLAnchorElement => target instanceof HTMLAnchorElement,
      );
      if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.href === window.location.href) {
        return;
      }

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    // A same-URL history sentinel gives us a popstate boundary before the
    // previous app route. On cancellation, consume the event and restore it.
    const currentState = window.history.state;
    const hasSentinel =
      currentState && typeof currentState === 'object' && '__nexusMedUnsavedGuard' in currentState;
    if (!hasSentinel) {
      window.history.pushState(
        { ...(currentState && typeof currentState === 'object' ? currentState : {}), __nexusMedUnsavedGuard: true },
        '',
        window.location.href,
      );
    }

    const onPopState = (event: PopStateEvent) => {
      if (!window.confirm(message)) {
        event.stopImmediatePropagation();
        window.history.go(1);
      }
    };

    const onProgrammaticNavigation = (event: Event) => {
      if (!event.defaultPrevented && !window.confirm(message)) event.preventDefault();
    };
    window.addEventListener(PROGRAMMATIC_NAVIGATION, onProgrammaticNavigation);
    window.addEventListener('beforeunload', handler);
    document.addEventListener('click', onDocumentClick, true);
    window.addEventListener('popstate', onPopState, true);

    return () => {
      window.removeEventListener(PROGRAMMATIC_NAVIGATION, onProgrammaticNavigation);
      window.removeEventListener('beforeunload', handler);
      document.removeEventListener('click', onDocumentClick, true);
      window.removeEventListener('popstate', onPopState, true);
    };
  }, [isDirty, message]);
}

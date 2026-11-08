import type { ReactNode } from 'react';

import Link from 'next/link';

// Shared display primitives (UI_SPEC §5.3). Pure server-safe rendering;
// interactive behavior (forms, confirmations) lives in slice components.

export function Badge({ tone, children }: { tone: 'archived' | 'edited'; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function ButtonLink({
  href,
  variant = 'secondary',
  children,
}: {
  href: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'ghost-danger' | 'danger';
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`btn btn-${variant}`}>
      {children}
    </Link>
  );
}

export function ErrorBanner({ message, retryHref }: { message: string; retryHref?: string }) {
  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      {retryHref ? (
        <Link href={retryHref} className="btn btn-ghost">
          Reintentar
        </Link>
      ) : null}
    </div>
  );
}

export function InfoNotice({ children }: { children: ReactNode }) {
  return <div className="notice-info">{children}</div>;
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-title">{title}</div>
      {children ? <div>{children}</div> : null}
    </div>
  );
}

export function Skeleton({ variant = 'row' }: { variant?: 'row' | 'block' }) {
  return <div className={`skeleton skeleton-${variant}`} aria-hidden />;
}

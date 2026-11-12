import Link from 'next/link';
import styles from './ui-preview-versions.module.css';

export function UIPreviewVersions({ current }: { current: 1 | 2 }) {
  return (
    <nav className={styles.versions} aria-label="Comparar diseños">
      <Link className={styles.versionLink} href="/patients">App actual ↗</Link>
      <Link className={styles.versionLink} href="/exploracion-ui" aria-current={current === 1 ? 'page' : undefined}>Propuesta 1</Link>
      <Link className={styles.versionLink} href="/exploracion-ui-2" aria-current={current === 2 ? 'page' : undefined}>Propuesta 2</Link>
    </nav>
  );
}

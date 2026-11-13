import { createLocalBackup, parseRecoveryArguments } from './local-recovery.mjs';

try {
  const options = parseRecoveryArguments(process.argv.slice(2), ['--database', '--files', '--output'], ['--services-stopped']);
  const result = await createLocalBackup({
    databasePath: options['--database'], filesDirectory: options['--files'], outputDirectory: options['--output'],
    servicesStopped: options['--services-stopped'] === true,
  });
  console.log(`Verified local backup: ${result.fileCount} attachment files; ${result.migrations} migration records. No secrets were displayed.`);
} catch {
  // SQLite/parser errors may contain row values or paths. Keep CLI failures generic.
  console.error('Local backup failed. Services must be stopped; use explicit local paths and a new destination. Check integrity, attachment completeness and permissions.');
  process.exitCode = 1;
}

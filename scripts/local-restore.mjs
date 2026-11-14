import { restoreLocalBackup, parseRecoveryArguments } from './local-recovery.mjs';

try {
  const options = parseRecoveryArguments(process.argv.slice(2), ['--backup', '--output']);
  const result = await restoreLocalBackup({ backupDirectory: options['--backup'], outputDirectory: options['--output'] });
  console.log(`Verified isolated local restore: ${result.fileCount} attachment files; ${result.migrations} migration records. Existing data was not overwritten.`);
} catch {
  console.error('Local restore failed. Only a verified local backup and a new destination are accepted; existing data and remote targets cannot be overwritten.');
  process.exitCode = 1;
}

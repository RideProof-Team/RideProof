// ---------------------------------------------------------------------------
// BackupControls.tsx — "Save a backup file" and "Restore from a backup".
// Used in Settings, and (restore only) on the Welcome screen for someone
// moving to a new phone.
// ---------------------------------------------------------------------------
import { useRef, useState } from 'react';
import { useApp } from '../AppContext';
import {
  BackupError,
  backupFileName,
  createBackup,
  loadLastBackupDate,
  parseBackup,
  restoreBackup,
  saveLastBackupDate,
} from '../lib/backup';
import { formatLongDate } from '../lib/dates';
import { downloadTextFile } from '../lib/download';
import { askConfirm, showSnackbar } from '../lib/feedback';
import { plural } from '../lib/reportStats';
import { createStorage } from '../lib/storage';
import { Icon } from './Icon';

export function BackupButton() {
  const { storage, today } = useApp();
  const [lastBackup, setLastBackup] = useState(loadLastBackupDate);

  async function save() {
    try {
      const backup = await createBackup(storage, new Date().toISOString());
      // JSON.stringify(..., null, 2) adds line breaks so the file is readable.
      downloadTextFile(backupFileName(today), JSON.stringify(backup, null, 2));
      saveLastBackupDate(today);
      setLastBackup(today);
      showSnackbar('Backup file saved. Keep it somewhere safe, like your email or cloud storage.');
    } catch (error) {
      showSnackbar(error instanceof BackupError ? error.message : 'Sorry, the backup could not be made.');
    }
  }

  return (
    <>
      <p>
        {lastBackup ? `Last backup: ${formatLongDate(lastBackup, true)}.` : 'You have not made a backup yet.'}
      </p>
      <button type="button" className="button-primary" onClick={save}>
        <Icon name="download" /> Save a backup file
      </button>
    </>
  );
}

export function RestoreButton({ label = 'Restore from a backup file' }: { label?: string }) {
  const { setProfile, refreshAll } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFileChosen(file: File | undefined) {
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      const ok = await askConfirm({
        title: 'Restore this backup?',
        message:
          `It has ${plural(backup.appointments.length, 'appointment', 'appointments')} and ` +
          `${plural(backup.rideLogs.length, 'ride record', 'ride records')}` +
          (backup.exportedAt ? `, saved on ${formatLongDate(backup.exportedAt.slice(0, 10), true)}` : '') +
          '. It will REPLACE the RideProof data on this device.',
        confirmLabel: 'Restore backup',
        danger: true,
      });
      if (!ok) return;
      // Always restore into the real database, never the demo one.
      await restoreBackup(createStorage('real'), backup);
      setProfile(backup.profile);
      refreshAll();
      showSnackbar('Backup restored.');
    } catch (error) {
      showSnackbar(error instanceof BackupError ? error.message : 'Sorry, that file could not be read.');
    } finally {
      // Clear the file box so choosing the same file again still works.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      {/* The real file picker is hidden; this button opens it. */}
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => onFileChosen(e.target.files?.[0])}
      />
      <button type="button" className="button-secondary" onClick={() => inputRef.current?.click()}>
        {label}
      </button>
    </>
  );
}

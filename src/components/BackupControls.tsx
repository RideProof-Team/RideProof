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
import { createStorage } from '../lib/storage';
import { Icon } from './Icon';
import { t, tn } from '../lib/i18n';

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
      showSnackbar(t('Backup file saved. Keep it somewhere safe, like your email or cloud storage.'));
    } catch (error) {
      showSnackbar(error instanceof BackupError ? error.message : t('Sorry, the backup could not be made.'));
    }
  }

  return (
    <>
      <p>
        {lastBackup ? t('Last backup: {date}.', { date: formatLongDate(lastBackup, true) }) : t('You have not made a backup yet.')}
      </p>
      <button type="button" className="button-primary" onClick={save}>
        <Icon name="download" /> {t('Save a backup file')}
      </button>
    </>
  );
}

export function RestoreButton({ label }: { label?: string }) {
  const { setProfile, refreshAll } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFileChosen(file: File | undefined) {
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      const counts = {
        appointments: tn(backup.appointments.length, '{n} appointment', '{n} appointments'),
        records: tn(backup.rideLogs.length, '{n} ride record', '{n} ride records'),
      };
      const ok = await askConfirm({
        title: t('Restore this backup?'),
        message: backup.exportedAt
          ? t('It has {appointments} and {records}, saved on {date}. It will REPLACE the RideConnect data on this device.', {
              ...counts,
              date: formatLongDate(backup.exportedAt.slice(0, 10), true),
            })
          : t('It has {appointments} and {records}. It will REPLACE the RideConnect data on this device.', counts),
        confirmLabel: t('Restore backup'),
        danger: true,
      });
      if (!ok) return;
      // Always restore into the real database, never the demo one.
      await restoreBackup(createStorage('real'), backup);
      setProfile(backup.profile);
      refreshAll();
      showSnackbar(t('Backup restored.'));
    } catch (error) {
      showSnackbar(error instanceof BackupError ? error.message : t('Sorry, that file could not be read.'));
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
        {label ?? t('Restore from a backup file')}
      </button>
    </>
  );
}

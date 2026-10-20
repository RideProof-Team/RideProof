// ---------------------------------------------------------------------------
// persist.ts — ask the browser to keep RideProof's data permanently.
//
// Browsers may delete a website's saved data to free up space, and Safari
// can delete it after about 7 days without a visit (unless the app was
// added to the Home Screen). Asking for "persistent storage" tells the
// browser this data matters. Some browsers say yes automatically, some
// decide on their own; either way the app keeps working.
// ---------------------------------------------------------------------------

export type PersistState = 'persisted' | 'not-persisted' | 'unsupported';

export async function requestPersistentStorage(): Promise<PersistState> {
  if (!navigator.storage?.persist) return 'unsupported';
  try {
    if (await navigator.storage.persisted()) return 'persisted';
    return (await navigator.storage.persist()) ? 'persisted' : 'not-persisted';
  } catch {
    return 'unsupported';
  }
}

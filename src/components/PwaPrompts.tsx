// ---------------------------------------------------------------------------
// PwaPrompts.tsx — "A new version is ready" and "Install RideProof".
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { applyUpdate, installApp, usePwa } from '../lib/pwa';
import { Icon } from './Icon';

const INSTALL_DISMISSED_KEY = 'rideproof-install-dismissed';

/** A bar under the header, shown on every screen when an update is ready. */
export function UpdateBanner() {
  const { updateReady } = usePwa();
  if (!updateReady) return null;
  return (
    <div className="update-banner" role="status">
      <span>A new version of RideProof is ready.</span>
      <button type="button" className="button-primary" onClick={applyUpdate}>
        Update now
      </button>
    </div>
  );
}

/** A card on Home inviting the user to install the app (Android/Chrome). */
export function InstallCard() {
  const { canInstall } = usePwa();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(INSTALL_DISMISSED_KEY) === 'yes';
    } catch {
      return false;
    }
  });
  if (!canInstall || dismissed) return null;

  function notNow() {
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, 'yes');
    } catch {
      // fine
    }
    setDismissed(true);
  }

  return (
    <section className="card card-info" aria-labelledby="install-heading">
      <h2 id="install-heading">Put RideProof on your home screen</h2>
      <p>It opens like a regular app and works without internet.</p>
      <button type="button" className="button-primary" onClick={installApp}>
        <Icon name="download" /> Install RideProof
      </button>
      <button type="button" className="link-button" onClick={notNow}>Not now</button>
    </section>
  );
}

/** Install button for the Help screen (no "Not now"). Shows only when possible. */
export function InstallButton() {
  const { canInstall } = usePwa();
  if (!canInstall) return null;
  return (
    <button type="button" className="button-primary" onClick={installApp}>
      <Icon name="download" /> Install RideProof now
    </button>
  );
}

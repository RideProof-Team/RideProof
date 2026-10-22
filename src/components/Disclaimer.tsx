// The required disclaimer, written once and reused on the Setup and Help screens.
import { t } from '../lib/i18n';

export function Disclaimer() {
  return (
    <p className="disclaimer">
      {t('RideConnect is not affiliated with any state, health plan, or ride company. Confirm rules with your state Medicaid office.')}
    </p>
  );
}

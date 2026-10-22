import { t } from '../lib/i18n';

export function Brand() {
  return <a className="rp-brand" href="#/landing" aria-label={t('RideConnect home')}><span className="rp-mark" aria-hidden="true">r<span>c</span></span>RideConnect</a>;
}

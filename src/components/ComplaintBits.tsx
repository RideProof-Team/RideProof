// ---------------------------------------------------------------------------
// ComplaintBits.tsx — small pieces shared by the complaint screens:
//   - ComplaintStatusBadge: the status in words + icon + color
//   - ContactList: the complaint contacts from the state rules file
//   - complaintRecipients: the choices for "Who did you send it to?"
// ---------------------------------------------------------------------------
import { COMPLAINT_STATUS_LABELS } from '../lib/complaints';
import { t, tx } from '../lib/i18n';
import type { ComplaintContact, StateRule } from '../lib/stateRules';
import type { ComplaintStatus, Profile } from '../types';
import { Icon, type IconName } from './Icon';

const STATUS_LOOK: Record<ComplaintStatus, { icon: IconName; className: string }> = {
  waiting: { icon: 'clock', className: 'status-warn' },
  answered: { icon: 'mail', className: 'status-neutral' },
  fixed: { icon: 'check', className: 'status-good' },
  not_fixed: { icon: 'x', className: 'status-problem' },
};

export function ComplaintStatusBadge({ status }: { status: ComplaintStatus }) {
  const look = STATUS_LOOK[status];
  return (
    <span className={`status ${look.className}`}>
      <Icon name={look.icon} size={20} />
      {t(COMPLAINT_STATUS_LABELS[status])}
    </span>
  );
}

/**
 * Who a complaint can go to: the state's contacts (from stateRules.json,
 * never made up), the ride company, and the health plan.
 */
export function complaintRecipients(profile: Profile, stateRule: StateRule | undefined): string[] {
  const names = [
    ...(stateRule?.complaintContacts.map((c) => c.name) ?? []),
    profile.rideCompanyName,
    profile.healthPlanName,
  ].filter(Boolean);
  return [...new Set(names)];
}

/** A placeholder value (e.g. "PLACEHOLDER - look up") isn't a real address. */
export function isRealEmail(email: string): boolean {
  return email.includes('@') && !email.toUpperCase().includes('PLACEHOLDER');
}

/** The state's complaint contacts, with a warning if they're placeholders. */
export function ContactList({ stateRule }: { stateRule: StateRule | undefined }) {
  if (!stateRule || stateRule.complaintContacts.length === 0) {
    return (
      <p>
        {t("RideConnect doesn't have contacts for your state yet. Your state Medicaid website, or the member services number on your Medicaid card, can tell you where to send transportation complaints.")}
      </p>
    );
  }
  return (
    <>
      {stateRule.isPlaceholder && (
        <p className="placeholder-warning">
          <Icon name="warning" />{' '}
          {t('These contacts are placeholders. Check your state Medicaid website for the right place to send complaints.')}
        </p>
      )}
      <ul className="plain-list contact-list">
        {stateRule.complaintContacts.map((c) => <ContactItem key={c.name} contact={c} />)}
      </ul>
    </>
  );
}

export function ContactItem({ contact }: { contact: ComplaintContact }) {
  const phoneIsReal = contact.phone && !contact.phone.toUpperCase().includes('PLACEHOLDER');
  return (
    <li>
      <strong>{contact.name}</strong>
      {contact.phone && (
        <>
          <br />
          {tx('Phone: {phone}', { phone: phoneIsReal ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : contact.phone })}
        </>
      )}
      {isRealEmail(contact.email) && <><br />{t('Email: {email}', { email: contact.email })}</>}
      {contact.website && (
        <>
          <br />
          <a href={contact.website} target="_blank" rel="noreferrer">{t('Website')}</a>
        </>
      )}
    </li>
  );
}

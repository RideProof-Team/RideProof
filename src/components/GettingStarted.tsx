// ---------------------------------------------------------------------------
// GettingStarted.tsx — a 3-step checklist on Home for new users:
//   1. Add appointments   2. Check in after a ride   3. Look at your report
// Each step ticks itself off when done. It disappears when all three are
// done, or when the user taps "Hide this".
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { hideIntro, introHidden, reportViewed } from '../lib/onboarding';
import { routeToHash } from '../lib/router';
import { Icon } from './Icon';

interface Props {
  hasAppointments: boolean;
  hasCheckIns: boolean;
}

export function GettingStarted({ hasAppointments, hasCheckIns }: Props) {
  const [hidden, setHidden] = useState(introHidden);
  const steps = [
    {
      done: hasAppointments,
      title: 'Add your appointments',
      detail: 'Include repeating ones, like dialysis. RideProof will remind you when to book each ride.',
      link: { href: routeToHash({ name: 'appointment-new' }), label: 'Add an appointment' },
    },
    {
      done: hasCheckIns,
      title: 'Check in after each ride',
      detail: 'Tap "Check in on today\'s ride" on this screen. It takes about a minute.',
    },
    {
      done: reportViewed(),
      title: 'See your report',
      detail: 'When rides go wrong, the report and complaint letter show the pattern.',
      link: { href: routeToHash({ name: 'report' }), label: 'Open the report' },
    },
  ];
  if (hidden || steps.every((s) => s.done)) return null;
  const next = steps.findIndex((s) => !s.done);

  return (
    <section className="card card-info" aria-labelledby="start-heading">
      <h2 id="start-heading">Getting started</h2>
      <ol className="start-steps">
        {steps.map((step, i) => (
          <li key={step.title} className={step.done ? 'done' : undefined}>
            <span className="start-mark" aria-hidden="true">
              {step.done ? <Icon name="check" size={20} /> : i + 1}
            </span>
            <div>
              <p className="start-title">
                {step.title}
                {step.done && <span className="visually-hidden"> (done)</span>}
              </p>
              {/* Only the next step shows its details, to keep it short. */}
              {i === next && (
                <>
                  <p className="start-detail">{step.detail}</p>
                  {step.link && <a href={step.link.href} className="button-secondary">{step.link.label}</a>}
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="link-button"
        onClick={() => {
          hideIntro();
          setHidden(true);
        }}
      >
        Hide this
      </button>
    </section>
  );
}

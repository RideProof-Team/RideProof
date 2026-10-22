import { useEffect, useRef, useState } from 'react';
import { navigate, type Route } from '../lib/router';
import { msg, t, tn } from '../lib/i18n';
import './demo-tour.css';

const STEP_SECONDS = 15;

// The text is English, marked with msg() and shown with t() when drawn,
// so switching the language changes the tour right away.
type TourStep = {
  route: Route;
  chapter: string;
  title: string;
  description: string;
  notice: string;
};

const STEPS: TourStep[] = [
  {
    route: { name: 'home' },
    chapter: msg('Today'),
    title: msg('Start with the ride that matters now'),
    description: msg('Rosa’s sample dashboard puts the next clinic visit, its ride status, and the most useful next action in one calm view. Tuesday’s cardiology ride still isn’t booked: Maria’s call on Thursday didn’t get through.'),
    notice: msg('“Call Sample Ride Co. to book” opens a “What to say” script built from the appointment, then asks whether the ride got booked.'),
  },
  {
    route: { name: 'appointments' },
    chapter: msg('Schedule'),
    title: msg('Keep appointments and rides together'),
    description: msg('Upcoming and repeat visits stay beside their transportation details, so a ride is less likely to become a last-minute problem.'),
    notice: msg('Open an appointment if you want to inspect it. The tour pauses before it can move you away.'),
  },
  {
    route: { name: 'wait' },
    chapter: msg('Ride timer'),
    title: msg('Measure the wait while it happens'),
    description: msg('Rosa is done with dialysis and waiting for her ride home. The timer keeps counting even if the phone locks, and suggests calling the ride company at 15 and 30 minutes.'),
    notice: msg('This sample timer runs on a simulated clock. Demo controls can jump it ahead 15 minutes.'),
  },
  {
    route: { name: 'checkin' },
    chapter: msg('Check-in'),
    title: msg('Turn a difficult ride into a clear record'),
    description: msg('A few short questions capture pickup, appointment arrival, and the return trip. Late and missing rides become dated evidence.'),
    notice: msg('This walkthrough never answers or saves the check-in for you. You remain in control of the sample form.'),
  },
  {
    route: { name: 'history' },
    chapter: msg('History'),
    title: msg('Find the ride instead of reconstructing it'),
    description: msg('Searchable ride history keeps each trip’s outcome and timing in one place, including missed pickups, delayed returns, and booking calls that didn’t work.'),
    notice: msg('Try the filters or open a record. Any interaction with the page pauses autoplay.'),
  },
  {
    route: { name: 'report' },
    chapter: msg('Report'),
    title: msg('See whether one bad ride is becoming a pattern'),
    description: msg('Counts, the total time spent waiting, failed booking calls, a weekly chart, and an accessible data table summarize what the saved sample rides show over time. “Share with my care team” turns it into a friendly one-page summary for Rosa’s doctors.'),
    notice: msg('Exports only happen when you choose them. The automatic tour does not download anything.'),
  },
  {
    route: { name: 'complaint' },
    chapter: msg('Complaint'),
    title: msg('Prepare the facts before asking for help'),
    description: msg('RideConnect organizes the sample ride records into a draft letter that can be reviewed, corrected, and completed before sharing.'),
    notice: msg('Nothing is sent automatically. A draft remains a draft until the person using RideConnect decides otherwise.'),
  },
  {
    route: { name: 'complaints' },
    chapter: msg('Follow-up'),
    title: msg('Keep track after the complaint is sent'),
    description: msg('Maria emailed a complaint to Rosa’s health plan on October 16. Two weeks later there is still no answer, so RideConnect asks “Did you hear back?” and offers a follow-up letter that mentions the reference number and every problem since.'),
    notice: msg('Try “Update status or notes” and choose Not fixed to see the next steps. Reset demo puts the complaint back.'),
  },
  {
    route: { name: 'help' },
    chapter: msg('Help'),
    title: msg('Know what to do when a ride does not arrive'),
    description: msg('Plain-language steps, service information, and install guidance keep the next move close at hand during a stressful moment.'),
    notice: msg('The walkthrough never opens a phone link or places a call.'),
  },
  {
    route: { name: 'settings' },
    chapter: msg('Settings'),
    title: msg('Keep control of the record'),
    description: msg('Profile, booking reminder, display, and backup tools keep the record working for each rider. If a state’s booking rule isn’t built in yet, the rider can enter their ride company’s own rule here.'),
    notice: msg('Nothing has been sent or changed. Finish the tour to keep exploring Rosa’s sample data.'),
  },
];

function reducedMotionPreferred() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function DemoTour({
  route,
  onClose,
  autoPlay = true,
}: {
  route: Route;
  onClose(): void;
  autoPlay?: boolean;
}) {
  const prefersReducedMotion = useRef(reducedMotionPreferred()).current;
  const [playing, setPlaying] = useState(autoPlay && !prefersReducedMotion);
  const [secondsLeft, setSecondsLeft] = useState(STEP_SECONDS);
  const routeIndex = STEPS.findIndex(step => step.route.name === route.name);
  const [lastTourIndex, setLastTourIndex] = useState(routeIndex >= 0 ? routeIndex : 0);
  const panel = useRef<HTMLElement>(null);
  const onTourPath = routeIndex >= 0;
  const index = onTourPath ? routeIndex : lastTourIndex;
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  useEffect(() => {
    if (routeIndex < 0) return;
    setLastTourIndex(routeIndex);
    setSecondsLeft(STEP_SECONDS);
  }, [routeIndex]);

  useEffect(() => {
    if (!playing || !onTourPath || last) return;
    const timer = window.setInterval(() => {
      setSecondsLeft(value => {
        if (value <= 1) {
          window.clearInterval(timer);
          navigate(STEPS[index + 1].route);
          return STEP_SECONDS;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing, index, last, onTourPath]);

  useEffect(() => {
    // Reading, scrolling, or editing the live screen must never race autoplay.
    const pauseOutside = (event: Event) => {
      if (!panel.current?.contains(event.target as Node)) setPlaying(false);
    };
    const pauseHidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('pointerdown', pauseOutside);
    document.addEventListener('keydown', pauseOutside);
    document.addEventListener('wheel', pauseOutside, { passive: true });
    document.addEventListener('visibilitychange', pauseHidden);
    return () => {
      document.removeEventListener('pointerdown', pauseOutside);
      document.removeEventListener('keydown', pauseOutside);
      document.removeEventListener('wheel', pauseOutside);
      document.removeEventListener('visibilitychange', pauseHidden);
    };
  }, []);

  function go(next: number) {
    setPlaying(false);
    setSecondsLeft(STEP_SECONDS);
    setLastTourIndex(next);
    navigate(STEPS[next].route);
  }

  const modeLabel = autoPlay ? t('Automatic demo') : t('Manual tour');
  const timing = last
    ? t('Final stop')
    : playing && onTourPath
      ? tn(secondsLeft, 'Next stop in {n} second', 'Next stop in {n} seconds')
      : tn(secondsLeft, 'Paused with {n} second left', 'Paused with {n} seconds left');
  const stopNumbers = { n: index + 1, total: STEPS.length };

  return (
    <aside className="demo-tour" aria-label={t('Guided demo')} ref={panel}>
      <div className="demo-tour-status">
        <div>
          <p className="demo-tour-mode">{modeLabel}</p>
          <p className="demo-tour-progress-label">
            {onTourPath ? t('Stop {n} of {total}', stopNumbers) : t('Tour paused')}
            <span aria-hidden="true"> · </span>
            <span>{t('Sample data only')}</span>
          </p>
        </div>
        <progress
          className="demo-tour-progress"
          role="progressbar"
          max={STEPS.length}
          value={index + 1}
          aria-valuenow={index + 1}
          aria-label={t('Tour progress: stop {n} of {total}', stopNumbers)}
        />
      </div>

      <nav className="demo-tour-chapters" aria-label={t('Demo chapters')}>
        {STEPS.map((item, chapterIndex) => (
          <button
            type="button"
            className="demo-tour-chapter"
            aria-current={chapterIndex === index ? 'step' : undefined}
            onClick={() => go(chapterIndex)}
            key={item.chapter}
          >
            {t(item.chapter)}
          </button>
        ))}
      </nav>

      <div className="demo-tour-body">
        <div className="demo-tour-copy" aria-live="polite" aria-atomic="true">
          {!onTourPath && <p className="demo-tour-detour">{t('You stepped off the tour path')}</p>}
          <h2>{onTourPath ? t(step.title) : t('Take your time on this screen')}</h2>
          <p>{onTourPath ? t(step.description) : t('The guide is holding your place at {chapter}. Explore here, then return when you are ready.', { chapter: t(step.chapter) })}</p>
          <p className="demo-tour-notice">{onTourPath ? t(step.notice) : t('Autoplay is paused, so this screen will not change underneath you.')}</p>
        </div>

        <div className="demo-tour-actions">
          {onTourPath ? (
            <div className="demo-tour-buttons">
              <button type="button" className="button-secondary" disabled={index === 0} onClick={() => go(index - 1)}>{t('Back')}</button>
              <button type="button" className="button-primary" onClick={() => last ? onClose() : go(index + 1)}>{last ? t('Finish tour') : t('Next')}</button>
            </div>
          ) : (
            <button type="button" className="button-primary" onClick={() => go(index)}>{t('Return to {chapter}', { chapter: t(step.chapter) })}</button>
          )}

          {!last && onTourPath && (
            <button type="button" className="demo-tour-play" onClick={() => setPlaying(value => !value)}>
              {playing ? t('Pause') : t('Resume')}
            </button>
          )}
          <button type="button" className="link-button demo-tour-exit" onClick={onClose}>{t('Explore sample on my own')}</button>

          {!last && onTourPath && (
            <div className="demo-tour-countdown" aria-live="off">
              <span>{timing}</span>
              <progress max={STEP_SECONDS} value={secondsLeft} aria-label={t('{n} seconds remaining', { n: secondsLeft })} />
            </div>
          )}
          {prefersReducedMotion && autoPlay && !playing && (
            <p className="demo-tour-motion-note">{t('Motion preference respected. Start the automatic tour when you are ready.')}</p>
          )}
        </div>
      </div>
    </aside>
  );
}

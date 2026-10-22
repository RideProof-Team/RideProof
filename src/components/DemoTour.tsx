import { useEffect, useRef, useState } from 'react';
import { navigate, type Route } from '../lib/router';
import './demo-tour.css';

const STEP_SECONDS = 15;

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
    chapter: 'Today',
    title: 'Start with the ride that matters now',
    description: 'Rosa’s sample dashboard puts the next clinic visit, its ride status, and the most useful next action in one calm view.',
    notice: 'Notice the appointment first, then check whether transportation is already booked.',
  },
  {
    route: { name: 'appointments' },
    chapter: 'Schedule',
    title: 'Keep appointments and rides together',
    description: 'Upcoming and repeat visits stay beside their transportation details, so a ride is less likely to become a last-minute problem.',
    notice: 'Open an appointment if you want to inspect it. The tour pauses before it can move you away.',
  },
  {
    route: { name: 'checkin' },
    chapter: 'Check-in',
    title: 'Turn a difficult ride into a clear record',
    description: 'A few short questions capture pickup, appointment arrival, and the return trip. Late and missing rides become dated evidence.',
    notice: 'This walkthrough never answers or saves the check-in for you. You remain in control of the sample form.',
  },
  {
    route: { name: 'history' },
    chapter: 'History',
    title: 'Find the ride instead of reconstructing it',
    description: 'Searchable ride history keeps each trip’s outcome and timing in one place, including missed pickups and delayed returns.',
    notice: 'Try the filters or open a record. Any interaction with the page pauses autoplay.',
  },
  {
    route: { name: 'report' },
    chapter: 'Report',
    title: 'See whether one bad ride is becoming a pattern',
    description: 'Counts, a weekly chart, and an accessible data table summarize what the saved sample rides show over time.',
    notice: 'Exports only happen when you choose them. The automatic tour does not download anything.',
  },
  {
    route: { name: 'complaint' },
    chapter: 'Complaint',
    title: 'Prepare the facts before asking for help',
    description: 'RideConnect organizes the sample ride records into a draft letter that can be reviewed, corrected, and completed before sharing.',
    notice: 'Nothing is sent automatically. A draft remains a draft until the person using RideConnect decides otherwise.',
  },
  {
    route: { name: 'help' },
    chapter: 'Help',
    title: 'Know what to do when a ride does not arrive',
    description: 'Plain-language steps, service information, and install guidance keep the next move close at hand during a stressful moment.',
    notice: 'The walkthrough never opens a phone link or places a call.',
  },
  {
    route: { name: 'settings' },
    chapter: 'Settings',
    title: 'Keep control of the record',
    description: 'Profile, display, and backup tools make the prototype adaptable while keeping its records on this device instead of a cloud account.',
    notice: 'Nothing has been sent or changed. Finish the tour to keep exploring Rosa’s sample data.',
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

  const modeLabel = autoPlay ? 'Automatic demo' : 'Manual tour';
  const timing = last
    ? 'Final stop'
    : playing && onTourPath
      ? `Next stop in ${secondsLeft} ${secondsLeft === 1 ? 'second' : 'seconds'}`
      : `Paused with ${secondsLeft} ${secondsLeft === 1 ? 'second' : 'seconds'} left`;

  return (
    <aside className="demo-tour" aria-label="Guided demo" ref={panel}>
      <div className="demo-tour-status">
        <div>
          <p className="demo-tour-mode">{modeLabel}</p>
          <p className="demo-tour-progress-label">
            {onTourPath ? `Stop ${index + 1} of ${STEPS.length}` : 'Tour paused'}
            <span aria-hidden="true"> · </span>
            <span>Sample data only</span>
          </p>
        </div>
        <progress
          className="demo-tour-progress"
          role="progressbar"
          max={STEPS.length}
          value={index + 1}
          aria-valuenow={index + 1}
          aria-label={`Tour progress: stop ${index + 1} of ${STEPS.length}`}
        />
      </div>

      <nav className="demo-tour-chapters" aria-label="Demo chapters">
        {STEPS.map((item, chapterIndex) => (
          <button
            type="button"
            className="demo-tour-chapter"
            aria-current={chapterIndex === index ? 'step' : undefined}
            onClick={() => go(chapterIndex)}
            key={item.chapter}
          >
            {item.chapter}
          </button>
        ))}
      </nav>

      <div className="demo-tour-body">
        <div className="demo-tour-copy" aria-live="polite" aria-atomic="true">
          {!onTourPath && <p className="demo-tour-detour">You stepped off the tour path</p>}
          <h2>{onTourPath ? step.title : 'Take your time on this screen'}</h2>
          <p>{onTourPath ? step.description : `The guide is holding your place at ${step.chapter}. Explore here, then return when you are ready.`}</p>
          <p className="demo-tour-notice">{onTourPath ? step.notice : 'Autoplay is paused, so this screen will not change underneath you.'}</p>
        </div>

        <div className="demo-tour-actions">
          {onTourPath ? (
            <div className="demo-tour-buttons">
              <button type="button" className="button-secondary" disabled={index === 0} onClick={() => go(index - 1)}>Back</button>
              <button type="button" className="button-primary" onClick={() => last ? onClose() : go(index + 1)}>{last ? 'Finish tour' : 'Next'}</button>
            </div>
          ) : (
            <button type="button" className="button-primary" onClick={() => go(index)}>Return to {step.chapter}</button>
          )}

          {!last && onTourPath && (
            <button type="button" className="demo-tour-play" onClick={() => setPlaying(value => !value)}>
              {playing ? 'Pause' : 'Resume'}
            </button>
          )}
          <button type="button" className="link-button demo-tour-exit" onClick={onClose}>Explore sample on my own</button>

          {!last && onTourPath && (
            <div className="demo-tour-countdown" aria-live="off">
              <span>{timing}</span>
              <progress max={STEP_SECONDS} value={secondsLeft} aria-label={`${secondsLeft} seconds remaining`} />
            </div>
          )}
          {prefersReducedMotion && autoPlay && !playing && (
            <p className="demo-tour-motion-note">Motion preference respected. Start the automatic tour when you are ready.</p>
          )}
        </div>
      </div>
    </aside>
  );
}

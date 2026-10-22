import { useEffect, useRef, useState } from 'react';
import { navigate, type Route } from '../lib/router';
import './demo-tour.css';

const STEPS: { route: Route; title: string; description: string; tryIt: string }[] = [
  { route: { name: 'home' }, title: 'Start with the next ride', description: 'This is Rosa’s sample dashboard. It brings today’s ride, upcoming appointments, and booking reminders into one place.', tryIt: 'Look for the next appointment and whether its ride is booked.' },
  { route: { name: 'appointments' }, title: 'Keep appointments together', description: 'The schedule keeps clinic visits and repeat appointments together, along with ride booking details.', tryIt: 'Open an appointment to explore its details. The tour will pause while you try it.' },
  { route: { name: 'checkin' }, title: 'Record what actually happened', description: 'Check-in asks short questions about the pickup, appointment, and return ride. A late or missing ride becomes a dated record.', tryIt: 'Try answering the questions. Any saved answers change only the sample data.' },
  { route: { name: 'history' }, title: 'Find a past ride', description: 'History keeps individual ride records, including late pickups and missed rides, so you don’t have to rely on memory.', tryIt: 'Use the search or filters to find a ride, then open its record.' },
  { route: { name: 'report' }, title: 'See the pattern', description: 'The report summarizes the saved rides with counts and a weekly chart. You can also view the numbers as a table.', tryIt: 'Compare on-time, late, and missing rides. The report can be exported for sharing.' },
  { route: { name: 'complaint' }, title: 'Prepare a complaint', description: 'RideProof turns the ride records into a draft letter. Review the details and fill in anything missing before sharing it.', tryIt: 'Read the sample draft. Nothing is sent automatically.' },
  { route: { name: 'help' }, title: 'Know the next step', description: 'Help brings together practical steps for a ride that doesn’t arrive, ride-service information, and installation instructions.', tryIt: 'Read the guidance; phone links can open your dialer, so avoid calling sample contacts.' },
  { route: { name: 'settings' }, title: 'Your records, on your device', description: 'Settings includes profile details, display preferences, and backup tools. This prototype stores records on this device, not in a cloud account.', tryIt: 'That’s the tour. Finish to keep exploring the demo, or use Exit demo to return to your own records.' },
];

export function DemoTour({ route, onClose }: { route: Route; onClose(): void }) {
  const [playing, setPlaying] = useState(true);
  const panel = useRef<HTMLElement>(null);
  const index = STEPS.findIndex(step => step.route.name === route.name);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  useEffect(() => {
    if (!playing || !step || last) return;
    const timer = window.setTimeout(() => navigate(STEPS[index + 1].route), 15000);
    return () => window.clearTimeout(timer);
  }, [playing, index, step, last]);

  useEffect(() => {
    // Reading or editing the live screen must never race the autoplay timer.
    const pauseOutside = (event: Event) => {
      if (!panel.current?.contains(event.target as Node)) setPlaying(false);
    };
    const pauseHidden = () => { if (document.hidden) setPlaying(false); };
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
    navigate(STEPS[next].route);
  }

  return <aside className="demo-tour" aria-label="Guided demo" ref={panel}>
    <div className="demo-tour-copy" aria-live="polite" aria-atomic="true">
      <p className="demo-tour-progress">{step ? `Step ${index + 1} of ${STEPS.length}` : 'Tour paused'} · Sample data only</p>
      <h2>{step?.title ?? 'Take your time exploring'}</h2>
      <p>{step?.description ?? 'You’ve opened a screen outside the tour. Return whenever you’re ready, or keep exploring on your own.'}</p>
      {step && <p className="demo-tour-tip">{step.tryIt}</p>}
    </div>
    <div className="demo-tour-controls">
      <div className="demo-tour-buttons">
        {step ? <>
          <button type="button" className="button-secondary" disabled={index === 0} onClick={() => go(index - 1)}>Back</button>
          <button type="button" className="button-primary" onClick={() => last ? onClose() : go(index + 1)}>{last ? 'Finish tour' : 'Next'}</button>
        </> : <button type="button" className="button-primary" onClick={() => go(0)}>Return to tour</button>}
      </div>
      {step && !last && <button type="button" className="link-button" onClick={() => setPlaying(value => !value)}>{playing ? 'Pause' : 'Play tour'}</button>}
      <button type="button" className="link-button" onClick={onClose}>Explore on my own</button>
      {step && !last && <p className="demo-tour-timing">{playing ? 'Next screen after 15 seconds. Interact with the page to pause.' : 'Paused. Continue at your own pace.'}</p>}
    </div>
  </aside>;
}

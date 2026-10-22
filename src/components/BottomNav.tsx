// ---------------------------------------------------------------------------
// BottomNav.tsx — the menu along the bottom of the screen, where thumbs
// reach easily on a phone.
//
// These are ordinary links (<a href="#/...">), so they work with a
// keyboard and screen readers with no extra code. aria-current="page"
// tells screen readers which item is the current screen.
// ---------------------------------------------------------------------------
import { routeToHash, type Route } from '../lib/router';
import { Icon, type IconName } from './Icon';

interface NavItem {
  label: string;
  icon: IconName;
  route: Route;
  /** Which screens count as "inside" this menu item. */
  matches: Route['name'][];
}

const ITEMS: NavItem[] = [
  { label: 'Home', icon: 'home', route: { name: 'home' }, matches: ['home', 'checkin', 'call', 'wait'] },
  {
    label: 'Schedule',
    icon: 'calendar',
    route: { name: 'appointments' },
    matches: ['appointments', 'appointment-new', 'appointment-edit'],
  },
  { label: 'History', icon: 'list', route: { name: 'history' }, matches: ['history'] },
  { label: 'Report', icon: 'chart', route: { name: 'report' }, matches: ['report', 'complaint', 'complaints', 'complaint-sent', 'care-team'] },
  { label: 'Help', icon: 'help', route: { name: 'help' }, matches: ['help', 'settings', 'profile-edit'] },
];

export function BottomNav({ current }: { current: Route }) {
  const activeIndex = ITEMS.findIndex((item) => item.matches.includes(current.name));
  return (
    <nav className="bottom-nav" aria-label="Main menu">
      <ul>
        {/* The blue bar above the current tab. Moving it with "transform"
            lets motion.css slide it smoothly from tab to tab. */}
        {activeIndex >= 0 && (
          <span
            className="nav-indicator"
            aria-hidden="true"
            style={{ width: `${100 / ITEMS.length}%`, transform: `translateX(${activeIndex * 100}%)` }}
          />
        )}
        {ITEMS.map((item) => {
          const active = item.matches.includes(current.name);
          return (
            <li key={item.label}>
              <a href={routeToHash(item.route)} aria-current={active ? 'page' : undefined}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

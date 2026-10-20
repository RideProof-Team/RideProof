// ---------------------------------------------------------------------------
// Icon.tsx — simple drawn icons (SVG), so status is shown by shape AND text,
// never by color alone. Icons are always next to a text label, so they are
// hidden from screen readers (aria-hidden) to avoid reading things twice.
// ---------------------------------------------------------------------------
export type IconName = 'check' | 'warning' | 'x' | 'clock' | 'calendar' | 'home' | 'list' | 'plus' | 'phone' | 'chart' | 'help' | 'download' | 'mail' | 'copy' | 'print';

// Each icon is a list of lines/shapes drawn on a 24x24 grid.
const PATHS: Record<IconName, string> = {
  check: 'M4 12.5l5 5L20 6.5',
  warning: 'M12 3L2 21h20L12 3zM12 10v5M12 18v.01',
  x: 'M6 6l12 12M18 6L6 18',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7v5l3 3',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  home: 'M3 11l9-8 9 8M5 9.5V21h14V9.5',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  plus: 'M12 5v14M5 12h14',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  chart: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6',
  help: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17v.01',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  print: 'M7 9V3h10v6M7 17H4V9h16v8h-3M7 14h10v7H7z',
};

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

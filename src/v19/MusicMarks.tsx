// Small marks for the music services LOAM links to, so a saved link is recognisable at a glance.
// Simplified shapes in each service's colour, used only to label links to that service.
import type { Provider } from "./links";

export function ProviderMark({ provider, size = 16 }: { provider: Provider; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true, focusable: false, className: "v19-mark" } as const;
  if (provider === "youtube") {
    return <svg {...common}><rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#FF0033" /><path d="M10 8.6v6.8l5.8-3.4z" fill="#fff" /></svg>;
  }
  if (provider === "ytmusic") {
    return <svg {...common}><circle cx="12" cy="12" r="10.5" fill="#FF0033" /><circle cx="12" cy="12" r="5.6" fill="none" stroke="#fff" strokeWidth="1.3" /><path d="M10.4 9.6v4.8l4-2.4z" fill="#fff" /></svg>;
  }
  if (provider === "spotify") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10.5" fill="#1ED760" />
        <g fill="none" stroke="#000" strokeLinecap="round"><path d="M6.6 9.2c3.7-1.1 7.6-.8 10.9.9" strokeWidth="1.9" /><path d="M7.2 12.4c3-.9 6.2-.6 8.9.8" strokeWidth="1.6" /><path d="M7.7 15.3c2.4-.6 4.8-.4 6.9.6" strokeWidth="1.3" /></g>
      </svg>
    );
  }
  if (provider === "soundcloud") {
    // An orange disc with a simplified cloud: recognisable without copying the logo.
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10.5" fill="#FF5500" />
        <path d="M7.2 15.6h9.3a2.4 2.4 0 0 0 .2-4.8 3.6 3.6 0 0 0-6.6-1.3 2.6 2.6 0 0 0-2.9 2.4 1.9 1.9 0 0 0 0 3.7z" fill="#fff" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <defs><linearGradient id="v19-am" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FA5C75" /><stop offset="1" stopColor="#FA233B" /></linearGradient></defs>
      <rect x="1.5" y="1.5" width="21" height="21" rx="5.5" fill="url(#v19-am)" />
      <path d="M15.8 6.2v8.3a2 2 0 1 1-1.3-1.9V8.8l-4.7 1v5.8a2 2 0 1 1-1.3-1.9V8.4z" fill="#fff" />
    </svg>
  );
}

# LOAM motion and final polish

Preserve the current layout, palette and typography. Motion is short, weighted and interruptible; actions never wait for decoration. No dependencies are added.

| Token | Value | Use |
| --- | --- | --- |
| micro | 120 ms | keys and switches |
| standard | 220 ms | cards and sheets |
| navigation | 240 ms | page and settings changes |
| exit | 160 ms | old view snapshot |
| shift | 12 px | navigation |
| easing | cubic-bezier(.22,1,.36,1) | weighted entrance |

Navigation uses a named content View Transition where available, with cancellable WAAPI entrance fallback. Existing React state and mounting behavior remain authoritative. Snapshots are visual only and cannot take focus. No duplicate interactive React trees. Reduced/Off navigation swaps immediately. System is the default preference; OS reduced motion overrides Full.

Buttons use physical key travel, version rows use a selected clay edge, drawers and alerts enter once, and progress uses scaleX. No idle pulse. Decorative motion stops when hidden or any game is running. Session frame sampling exists only during navigation and downgrades slow sessions without persisting or uploading data.

Scope additions explicitly requested by the owner: safe readable game folders, official cached news, supplied logo assets, production devtools disabled, and a non-RC installer. Authentication and credential flows are not changed.

Verification: existing frontend and Rust tests, focused preference/cancellation/path/news tests, TypeScript, build and Clippy. Runtime measurements and visual/accessibility checks must be reported separately from unit tests. Do not claim unmeasured 60 fps, startup parity or universal accessibility compliance.

The initial working tree is dirty. Work is on polish/motion without commits or pushes, preserving all prior edits.

Primary references consulted: https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition and https://v2.tauri.app/reference/config/ . Live news source verified: https://launchercontent.mojang.com/v2/news.json .

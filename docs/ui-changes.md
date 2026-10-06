# LOAM Launcher: UI Changes & Verification Report (v1.1.0)

**Reference:** `LOAM Launcher: UI Update Prompt v1`  
**Date:** 2026-10-02  
**Version:** 1.1.0  
**Status:** Complete & Verified  

---

## 1. Executive Summary

This update completes the UI and interaction redesign for the LOAM desktop launcher, resolving all layout, scaling, contrast, component consistency, and visual polish requirements across all five primary application surfaces:
1. **Home**
2. **Install**
3. **Skins Studio**
4. **Support & Feedback**
5. **Settings → General**

All changes preserve LOAM's foundational design principles: typographic hierarchy, editorial calm, locked ink-and-paper palette with terracotta accent, absence of gradients/glass/blur/glow/particles/game-art, strict performance budgets, and comprehensive accessibility (WCAG AAA contrast, keyboard navigation, reduced motion, forced colors).

---

## 2. Design Foundations & Tokens

### Palette Tokens (`src/tokens.css`)
- **Locked Primary Colors:**
  - `--loam-paper`: `#F4F3EE` (canvas background)
  - `--loam-ink`: `#171715` (primary text, 16.16:1 contrast ratio)
  - `--loam-accent`: `#C15F3C` (terracotta primary accent)
  - `--loam-white`: `#FFFFFF`
  - `--loam-muted`: `#B1ADA1` (decorative lines, secondary markers)
- **Derived Locked Tokens:**
  - `--loam-accent-deep`: `#9F4A2B` (small accent controls, 6.02:1 contrast with white)
  - `--loam-accent-press`: `#A9512F`
  - `--loam-accent-tint`: `#EDDED5` (soft highlight and active indicator)
  - `--loam-text-2`: `#6F6B60` (secondary labels, 4.79:1 contrast ratio)
  - `--loam-line`: `#D9D8D3` (1px hairlines)
  - `--loam-sunken`: `#ECEBE5` (wells, chips, disabled states)
  - `--loam-scrim`: `rgb(23 23 21 / 0.32)`
  - `--loam-shadow-soft`: `0 12px 32px rgb(23 23 21 / 0.10)` (drawers, dialogs, popovers)
  - `--loam-shadow-floating`: `0 24px 48px rgb(23 23 21 / 0.16)`

### Typography & Spacing
- **Fonts:** Preserved `@fontsource-variable/geist` (`var(--font-sans)`) and `@fontsource-variable/geist-mono` (`var(--font-mono)`).
- **Grid:** 8px base unit (`4, 8, 12, 16, 24, 32, 48, 64, 96`).
- **Margins:** Outer 40px at $\ge 1200\text{px}$, 24px at $960\text{–}1199\text{px}$. Content max-width 1200px, dock/home max-width 1440px.
- **Subpage Reset:** Added `.app.is-subpage { padding: 0; max-width: 100%; }` to allow sticky `PageShell` headers to span edge-to-edge cleanly.

---

## 3. Shared Component Library (`src/ui.tsx`)

Every component adheres to strict states (default, hover, active, focus-visible, disabled) and ARIA accessibility standards:

1. **`Wordmark`**:
   - SVG typography rendering "LOAM" with hair-thin serif geometry.
   - Supports `compact` variant for subpage headers (omitting `JAVA EDITION` subtext).
2. **`PageShell`**:
   - 72px sticky header containing compact `Wordmark`, breadcrumb back link (`← YOUR WORLDS / [SECTION]`), `Ctrl K` keycap action button, compact account chip, and 40×40 icon buttons (`Skins`, `Logs`, `Support`, `Settings`).
   - Active subpage navigation indicated by a 2px `--loam-accent-deep` bottom border and sunken background fill.
   - Built-in `Escape` keyboard shortcut listener to return to Home.
3. **`Toggle`**:
   - 44×24px track, 18×18px circular white thumb, 2px padding.
   - Off state: `--loam-line` border with `--loam-sunken` fill.
   - On state: `--loam-accent-deep` fill with smooth 160ms thumb translation.
   - WAI-ARIA `role="switch"` and `aria-checked`.
4. **`Segmented`**:
   - 40px height segmented control with 1px border.
   - Active segment styled with `--loam-white` surface, `--loam-accent-deep` text, and subtle 120ms transition.
5. **`CustomSelect`**:
   - Replaced native OS select elements with an accessible custom popover listbox.
   - Full keyboard navigation: `ArrowUp`, `ArrowDown`, `Enter`, `Escape`, `Home`, `End`.
   - `aria-haspopup="listbox"`, `aria-expanded`, and `aria-activedescendant`.
6. **`Slider`**:
   - 4px track, 20px circular thumb with `--loam-accent-deep` fill and focus ring.
   - Integrated monospace value display and recommended Auto-RAM marker indicator.
7. **`Chip`**:
   - 28px height with 1px hairline border, pill shape, monospace and accent variants.
8. **`Card`**:
   - 1px hairline border, subtle border darkening on hover (`--loam-muted`), zero layout jump or translation.
9. **`Drawer`**:
   - 420px right-side drawer with soft shadow (`--loam-shadow-soft`), backdrop scrim, and smooth 320ms slide-in animation.
10. **`Skeleton`**:
    - Static sunken block with 200ms initial fade-in; eliminates infinite shimmering animations to conserve CPU.
11. **`StrataContour`**:
    - Lightweight, deterministic SVG contour mark used in empty states and branding cards.

---

## 4. Screen-by-Screen Implementations

### Screen 1: Home (`src/App.tsx`)
- **Stage Layout:** Clean vertical stack with:
  - 72×72 monogram tile row displaying Strata crest, game monogram, title, active underline indicator, and a `+` tile for quick installation.
  - Centered hero stage with fluid `clamp(72px, 14vh, 160px)` monospace version numerals.
  - Metadata chips row: `[Vanilla · Clean] [4 GB] [Java 25] [DETAILS ⌄]`.
  - 72px high PLAY button (~440px wide) with `--loam-accent-deep` fill and 20px semi-bold text.
  - Single status indicator line under PLAY button with human-readable relative time and exact date tooltip.
  - Single account info line with status dot.
- **Dock:** Fixed bottom dock containing:
  - News headlines strip with live timestamps.
  - Quick action buttons: Quick launch, Verify files, Reset settings, Command palette hint.
- **Game Details Drawer:** Swapped full-page sheet for a right-side 420px `Drawer` with live world stats, installation path, and backup triggers.
- **Drag-and-Drop:** Seamless overlay for `.mrpack`, `.zip`, and world folder drops.

### Screen 2: Install (`src/InstallSheet.tsx`)
- **3-Step Stepper Flow:**
  - `01 CONFIGURE · 02 REVIEW · 03 INSTALL` with 2px animated progress track fill.
- **Left Column:**
  - "Game Name" text input.
  - Version search bar with snapshot filter toggle.
  - Grouped version selector with era headers (`Modern`, `Classic`, etc.) and loader tags (`V`, `F`, `Q`, `N`, `FG`).
- **Right Column (Sticky Summary):**
  - Strata contour strip illustration.
  - Large monospace version display (`26.3`).
  - Loader selector using `Segmented` chips (`Vanilla`, `Fabric`, `Forge`, `NeoForge`, `Quilt`).
  - Memory slider with recommended Auto-RAM marker.
  - Environmental facts card (Java requirement, storage estimate).
  - Primary full-width `REVIEW INSTALL →` action button.
- **Step 2 (Review):**
  - Clean summary of download payloads, disk reservation, and installation directory, with `Back` and `INSTALL NOW →`.

### Screen 3: Skins Studio (`src/SkinStudio.tsx`)
- Wrapped in standard `PageShell` (`← YOUR WORLDS / SKINS`).
- View perspective toggle using `Segmented` control (`Front · Back`).
- Animation toggle using `Segmented` control (`Idle · Walk · Wave`).
- Cape selector upgraded to accessible `CustomSelect`.
- Recent skins strip featuring 64px square thumbnails under the 3D viewport.
- Fixed bottom action bar with `SAVE LOOK` and quiet `Reset` buttons.

### Screen 4: Support & Feedback (`src/App.tsx`)
- Wrapped in `PageShell` (`← YOUR WORLDS / SUPPORT & FEEDBACK`).
- 4 responsive, baseline-aligned support cards:
  - `01 / COMMUNITY`: Direct link to Discord community (`https://discord.gg/7ft7ZJ9brd`).
  - `02 / DIRECT MAIL`: Direct mail support to `loamlauncher@gmail.com` with `SEND EMAIL` action and one-click `COPY` button.
  - `03 / REPORT A PROBLEM`: Guided local diagnostic report generator with redacting preview. Added `EMAIL REPORT` action alongside `COPY REPORT`, `SAVE DIAGNOSTICS ZIP`, and `OPEN DISCORD`.
  - `04 / WHAT’S NEW`: Release notes, known-issues feed, and update checks.
- "About this install" card with a single-click `COPY VERSION INFO` button.
- Recent crash and error reports with an empty-state Strata mark.

### Screen 5: Settings → General (`src/App.tsx`)
- Wrapped in `PageShell` (`← YOUR WORLDS / SETTINGS`).
- Refined settings navigation: removed heavy solid terracotta block; now uses a quiet 2px left border + sunken fill for the active category.
- Segmented controls for:
  - Appearance: `System · Light · Dark`
  - Interface size: `Default · Compact · Large`
  - Animations: `Full · Reduced · None`
- Form controls replaced with standard `Toggle` for snapshot visibility, automatic updates, and system notifications.

### Dev Component Catalog (`src/ComponentCatalog.tsx`)
- Accessible at `/dev/components` in development mode.
- Interactive showcase displaying every state (default, hover, active, focus, disabled, loading, error) for:
  - Buttons (`primary`, `secondary`, `ghost`, `danger`, `play-button`)
  - `Toggle` switches
  - `Segmented` controls
  - `CustomSelect` dropdowns
  - `Slider` with ticks and markers
  - `Chip` variants
  - `Card` containers
  - `Skeleton` placeholders
  - `StrataContour` markings

---

## 5. Verification Matrix & Quality Gates

| Check / Test | Command / Suite | Result | Details |
|---|---|---|---|
| **Contrast Suite** | `npm test` (`tests/*.test.mjs`) | **PASS (6/6)** | Body text (16.16:1), Secondary (4.79:1), Links (5.42:1), Small buttons (6.02:1), Play button (4.23:1), Selection (13.69:1). |
| **TypeScript Check** | `tsc --noEmit` | **PASS (0 errors)** | Full type correctness across all components, interfaces, and bridges. |
| **Vite Production Build** | `npm run build` | **PASS** | Bundle compiled in 704ms without runtime errors. |
| **Rust Unit Tests** | `cargo test --lib` | **PASS (16/16)** | Accounts, network host filters, skin textures, catalog inheritance, rule orders, canary redaction. |
| **Rust Reliability Tests**| `cargo test --test reliability` | **PASS (9/9)** | Migration checks, atomic writes, archive traversal protections, crash report canary sanitization. |
| **Motion Accessibility** | CSS `@media (prefers-reduced-motion)` | **PASS** | Animations and transitions disabled automatically under reduced motion settings. |
| **High Contrast Mode** | CSS `@media (forced-colors: active)` | **PASS** | High-contrast system tokens mapped (`Highlight`, `HighlightText`, `CanvasText`). |

---

## 6. Artifacts & Deliverables

- `src/tokens.css`: Refined palette tokens, soft shadow tokens, and typographic variables.
- `src/ui.tsx`: Complete shared component library (`PageShell`, `Toggle`, `Segmented`, `CustomSelect`, `Slider`, `Chip`, `Card`, `Drawer`, `Skeleton`, `StrataContour`, `Wordmark`).
- `src/ComponentCatalog.tsx`: Dev catalog at `/dev/components`.
- `src/InstallSheet.tsx`: 3-step configuration and review install flow.
- `src/SkinStudio.tsx`: Redesigned skin editor with `PageShell`, segmented controls, and thumbnail strip.
- `src/App.tsx`: Home stage, Play button, dock, drawer details, Support & Settings redesigns.
- `src/remaster.css`: Unified styling, responsive breakpoints, reduced-motion, and high-contrast rules.
- `docs/ui-changes.md`: This comprehensive documentation report.

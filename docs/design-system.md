# LOAM Design System & Tokens

LOAM embraces a quiet, Swiss-minimalist aesthetic. It feels like an authentic typographic desktop utility rather than a noisy game store.

---

## 1. Color Palette & Tokens

### Locked Brand Colors
The five core brand colors are strictly locked. All user interface elements must use either these colors or the derived tokens:

```css
:root {
  /* Locked Brand Palette */
  --loam-accent:       #C15F3C;  /* Primary action button, active state, progress fill */
  --loam-paper:        #F4F3EE;  /* Main canvas surface */
  --loam-white:        #FFFFFF;  /* Cards, sheets, popovers, input backgrounds */
  --loam-muted:        #B1ADA1;  /* Hairline borders, decorative labels, disabled states */
  --loam-ink:          #171715;  /* Primary typography */

  /* Derived Functional Tokens */
  --loam-accent-deep:  #9F4A2B;  /* Small accent text, links, error rules (≈5.4:1 on paper) */
  --loam-accent-press: #A9512F;  /* Hover / pressed button fill */
  --loam-accent-tint:  #EDDED5;  /* Progress bar track, selected row background */
  --loam-text-2:       #6F6B60;  /* Secondary text & metadata (≈4.8:1 on paper) */
  --loam-line:         #D9D8D3;  /* 1px structural dividing lines */
  --loam-sunken:       #ECEBE5;  /* Inset badges, code backgrounds, disabled button fill */
  --loam-scrim:        rgb(23 23 21 / 0.32); /* Modal backdrop overlay */
}
```

### Contrast Safety Rules
1. **Never use `--loam-muted` (`#B1ADA1`) for meaningful text**: On Paper (`#F4F3EE`), the contrast ratio is only ~2:1. Always use `--loam-text-2` (`#6F6B60`) for secondary text and metadata to meet WCAG AA (4.5:1).
2. **Accent Button Text**: White text on `--loam-accent` (`#C15F3C`) achieves ~4.2:1, which is legal only for **large typography** ($\ge 24\text{px}$ bold, such as the 72px PLAY button). For smaller buttons or inline links, use `--loam-accent-deep` (`#9F4A2B`) to guarantee $>4.5:1$ compliance.
3. **No Color-Alone States**: Never communicate status via color alone. Every error, warning, and success state must pair color with a distinct icon and descriptive label.

---

## 2. Typography Scale

Fonts are bundled locally (Geist / Inter and Geist Mono) under the SIL Open Font License. No CDN font requests are made.

| Token | Size / Line-Height | Weight | Letter-Spacing | Usage |
|---|---|---|---|---|
| **Display** | `clamp(44px, 6vw, 72px)` / 1.0 | 600 | `-0.03em` | Active game title on Home screen |
| **H1** | 32px / 36px | 600 | `-0.02em` | Main section headings (Settings, Support) |
| **H2** | 20px / 28px | 600 | Normal | Subsection headings |
| **Body** | 15px / 24px | 400 | Normal | General interface copy and dialogs |
| **Label** | 11px / 16px | 500 | `+0.12em` | UPPERCASE tags (`JAVA EDITION`, `INSTALL +`, chips) |
| **Mono** | 12px / 18px | 400/500 | Tabular numerals | Versions, checksums, logs, RAM allocation |

---

## 3. Spatial Grid & Shape

- **Base Unit**: 8px spatial grid (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`).
- **Window Dimensions**: Default window size: $1120 \times 720\text{px}$. Minimum allowed window: $960 \times 600\text{px}$.
- **Border Radii**: 
  - Buttons and controls: `2px` (sharp, precision aesthetic).
  - Cards and panels: `4px`.
  - Bottom sheets: `8px` top corners.
  - No rounded pill buttons.
- **Elevation**:
  - Surfaces use a 1px border (`--loam-line`) rather than heavy drop shadows.
  - Popovers and bottom sheets use a soft elevation shadow: `0 12px 32px rgb(23 23 21 / 0.10)`.

---

## 4. Motion Tokens

```css
:root {
  --dur-micro: 120ms; /* Hover, press, focus states */
  --dur-state: 200ms; /* Play state transitions, chip swap */
  --dur-sheet: 320ms; /* Bottom sheets and modal entries */
  --ease-loam: cubic-bezier(0.2, 0, 0, 1);
}
```

- When `prefers-reduced-motion: reduce` is enabled, all animations transition immediately with zero delay.
- Progress fills represent **real bytes**; no endless looping decorative animations on measurable downloads.

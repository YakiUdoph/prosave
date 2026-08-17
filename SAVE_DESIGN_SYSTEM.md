# SAVE Design System & Visual Direction
## Authoritative Brand Identity and Visual Layout Blueprint

This document defines the complete visual direction, brand identity, layout guidelines, color systems, and animation behaviors for **SAVE: Emergency Exit Intelligence for Web3**. It serves as the style guide for all developers working on the application frontend.

> [!WARNING]
> **VISUAL FREEZE LOCKED**: Under no circumstances should pages be broadly redesigned. Colors, card layouts, margins, typography sizes, and navigation headers must match the approved Git baseline (`save-approved-ui-baseline`).

---

## 🛡️ 1. Brand Identity & Personality

### Brand Personality
-   **Calm Authoritative**: A steady, silent guardian. It does not spam or use hyper-hype marketing. It uses precise, objective language.
-   **Hyper-Responsive**: Instantaneous, fluid, and predictable. When the user interacts, the feedback is immediate.
-   **High-Fidelity Telemetry**: Honest and transparent. It shows raw simulation logs and detailed gas breakdowns so the user feels in absolute control.

### Emotional Vibe Shift
```
[User State: Panic / Alarm] ──> [Enters SAVE] ──> [State: Muted Focus] ──> [Capital Secured: Complete Relief]
```
The interface is designed to absorb the user's stress during a market crash. It does this by transitioning from a high-alert red state (Panic Mode) to a clean, calm green state (Capital Secured) upon successful execution.

---

## 🎨 2. Unified Color System

All colors must be configured as CSS variables/Tailwind colors to support seamless state transitions.

### A. Base Color Palette (Dark Theme Core)
-   `bg-main`: Deepest Carbon Gray (`#0F0F11`) — The primary screen background.
-   `bg-card`: Muted Off-Black (`#16161A`) — Container borders and cards.
-   `border-muted`: Dark Charcoal (`#222227`) — Muted separators.
-   `text-primary`: Pure Ice White (`#F7F7F8`) — Main headers and values.
-   `text-muted`: Cool Slate (`#8E8E93`) — Explanatory labels and secondary text.

### B. Normal Mode (System Idle / Monitoring)
-   `color-accent`: Electric Teal (`#00D8F6`) — Highlights, healthy state, and active scanner.
-   `color-accent-bg`: Muted Teal Glow (`rgba(0, 216, 246, 0.05)`) — Card highlights.

### C. Panic Mode (Emergency Active)
-   `color-danger`: Critical Crimson (`#FF3B30`) — Flashing indicators, risk flags, and the main exit button.
-   `color-danger-bg`: Deep Charcoal Red (`#1F1111`) — Background wash when Panic Mode is toggled ON.
-   `color-warning`: Hazard Orange (`#FF9500`) — Medium-risk warnings, price impacts.

### D. Success State (Capital Secured)
-   `color-success`: Emerald Green (`#34C759`) — Confirmed transactions, secured funds, and final reports.
-   `color-success-bg`: Deep Emerald Wash (`#111F13`) — Full-screen success wash.

---

## 🔠 3. Typography & Monospace Details

-   **Primary Font Family**: `Inter` or `SF Pro Display`, sans-serif. Used for headers, commands, buttons, and navigation.
-   **Data Font Family**: `JetBrains Mono` or `SF Mono`, monospace. Used for balances, price figures, Protection Scores, gas fees, and simulation logs.

### Font Weights & Scale
-   **Display Volatility / Balances**: `36px` / `48px` Monospace — Extra Bold.
-   **Page Headers**: `24px` Sans-Serif — Semi-Bold.
-   **Component Headers / Scores**: `18px` Sans-Serif — Medium.
-   **Body Text**: `14px` Sans-Serif — Regular.
-   **Console Logs / Small Data**: `12px` Monospace — Regular.

---

## 📐 4. Spacing & Layout Constraints

-   **Container Max-Width**: `1200px` for main page shell.
-   **Grid Spacings**: `gap-6` (`24px`) for primary component grids; `gap-4` (`16px`) for sub-cards and detail grids.
-   **Card Padding**: Standard `p-6` (`24px`) for dashboard components; `p-5` (`20px`) for secondary metric items.
-   **Border Radius**: `rounded-xl` (`12px`) for buttons, status pills, and cards; `rounded-full` for token status icons and circular score gauges.
-   **Responsive Margins**: `px-4` on mobile devices scaling to `px-8` on larger viewports.

---

## 🎬 5. Controlled Future Enhancements

These visual enhancements are permitted to increase the premium feel of the product, but **MUST NOT** replace or disrupt the existing layouts:

### A. Translucent SAVE Logo / Brandmark
-   **Concept**: A large, subtle geometric logo (SVG vector) placed in the background behind main dashboard panels.
-   **Rules**:
    -   Must use extremely low opacity (maximum `0.02` to `0.04`).
    -   Must not decrease the contrast or legibility of any overlay text.
    -   Must not shift component margins or text flow.
    -   May respond with a very slow parallax transition on mouse hover or scroll.

### B. Intent Parsing & Reasoning Motion
-   **Concept**: When the user enters an intent and clicks "Analyze", the tags below fade in sequentially with a typing-indicator pulse.
-   **Transition**: `transition-opacity duration-300 ease-out` with staggered delays.

### C. Route Rejection Motion
-   **Concept**: During simulation, candidate paths that violate safety guardrails (e.g. high slippage) are visually crossed out or highlighted in muted crimson.
-   **Transition**: A sliding red strike-through line (`width 0.4s ease-in-out`).

### D. Protected Asset Locking
-   **Concept**: Assets designated as "protected" develop a subtle golden padlock glow or keyframe border pulse to show they are locked out of liquidation routes.
-   **Transition**: Subtle keyframe pulse on border color opacity.

### E. Liquidity Path Animation
-   **Concept**: Animate routing steps on the transaction timeline using moving dashes or active dot sweeps.
-   **Transition**: `stroke-dasharray` transition sweeps on SVG path layers.

### F. Protection Score Dial Animation
-   **Concept**: Radial dials animate from `0` to the calculated score value on mount.
-   **Transition**: SVG `stroke-dashoffset` transition with a duration of `1.2s` using an `ease-out` easing function.

### G. Execution Progress Hold
-   **Concept**: Hold-to-exit progress bar fills sequentially over 1.5 seconds. Releasing early drains the bar instantly.
-   **Transition**: Dynamic width changes bound directly to react `onMouseDown` and `onMouseUp` event state listeners.

---

## ♿ 6. Accessibility & System Preferences
-   **Reduced Motion**: Respect system motion preferences. If a user has `prefers-reduced-motion` enabled, bypass all path sweeps, radial dial counts, and horizontal scanlines instantly.
-   **Contrast**: Keep the main text color at `#F7F7F8` against `#16161A` card backgrounds to exceed WCAG AA color contrast ratios.
-   **Focus States**: All interactive text inputs must utilize a crisp focus ring with `color-accent` or `color-danger` (depending on Panic state).

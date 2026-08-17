# SAVE Design System & Visual Direction
## Framework-Agnostic Blueprint for Lovable Implementation

This document defines the complete visual direction, brand identity, layout guidelines, color systems, and animation behaviors for **SAVE: Emergency Exit Intelligence for Web3**. It serves as the direct style guide and prompts reference for building the interface in **Lovable**.

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

### Design Principles
1.  **Zero Cognitive Load**: During an emergency, the user should not have to read paragraphs. Actions are binary, large, and unmistakable.
2.  **Telemetry Over Flaunt**: Muted grays, crisp numbers, and active terminal logs build more trust than generic cartoon illustrations.
3.  **Physicality & Tactility**: Buttons have weight. The exit button feels like a physical switch under a protective glass cover.

---

## 📺 2. Visual References & Borrowing Guide

To create a premium product, we cherry-pick details from four distinct interface styles:

| Source Reference | Borrow (What to Use) | Avoid (What to Reject) |
| :--- | :--- | :--- |
| **Apple Emergency SOS** | - High-contrast system typography (SF Pro).<br>- Massive, unmistakable warning banners.<br>- Clean modal dialogs with dual choice (e.g. Confirm / Cancel). | - Lack of telemetry.<br>- Over-simplification that hides transaction speeds or gas estimates. |
| **Bloomberg Terminal** | - Dense, monospaced data grids (JetBrains/SF Mono).<br>- Up/down delta flags (red/green micro-indicators).<br>- Constant scrolling telemetry and execution logs. | - Chaotic nested menus.<br>- Cryptic keyboard commands.<br>- Extremely low contrast without padding. |
| **OKX Wallet** | - Standard dark-card border radiuses (12px - 16px).<br>- Web3 wallet connection states.<br>- Muted token symbols with small icons. | - Overloaded multi-tab subpages.<br>- Ads, promotional banners, or yield campaigns. |
| **Mission Control** | - Central status gauges (circular score indicators).<br>- Step-by-step sequential checklists.<br>- Glowing active indicators (pulsing orange/red dots). | - Cyberpunk glow that reduces readability.<br>- Fake sci-fi visual components with no function. |

---

## 🎨 3. Unified Color System

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

## 🔠 4. Typography Direction

-   **Primary Font Family**: `Inter` or `SF Pro Display`, sans-serif. Used for headers, commands, buttons, and navigation.
-   **Data Font Family**: `JetBrains Mono` or `SF Mono`, monospace. Used for balances, price figures, Protection Scores, gas fees, and simulation logs.

### Font Weights & Scale
-   **Display Volatility / Balances**: `36px` / `48px` Monospace — Extra Bold.
-   **Page Headers**: `24px` Sans-Serif — Semi-Bold.
-   **Component Headers / Scores**: `18px` Sans-Serif — Medium.
-   **Body Text**: `14px` Sans-Serif — Regular.
-   **Console Logs / Small Data**: `12px` Monospace — Regular.

---

## 🎬 5. Motion & Interaction Design

Every transition must feel snappy and intentional. Avoid slow, bouncy transitions that feel sluggish during a panic.

### 1. The Panic Mode Transition (Screen Shift)
-   **Behavior**: When the "Panic Mode" toggle is switched, the background smoothly transitions from `#0F0F11` to `#1F1111` (Carbon Red). Cards develop subtle red borders (`#FF3B30` opacity 0.2). A soft alert siren sound or haptic feedback is simulated.
-   **Transition**: `background-color 0.4s ease-out, border-color 0.4s ease-out`.

### 2. Risk Radar Scan Animation
-   **Behavior**: In the Portfolio Scanner, a light cyan horizontal line constantly sweeps down the token grid, highlighting rows as it passes.
-   **Implementation**: A gradient overlay translating on Y-axis loop (`duration: 2.5s, linear`).

### 3. The "Emergency Exit" Pulse (Interactive Button)
-   **Behavior**: The "TRIGGER EMERGENCY EXIT" button must feel alive. It has a slow, breathing red shadow glow. When hovered, the pulse speed doubles.
-   **Implementation**: CSS box-shadow animation pulsing opacity from `0.4` to `0.8`.

### 4. Holding Confirmation (Tactile Click)
-   **Behavior**: The user must click and hold the exit button for 1.5 seconds to trigger execution. During the hold, a circular progress bar fills around the button. If they release early, the progress drains.
-   **Implementation**: CSS scale shrink (`scale(0.98)`) and progress wheel filling on hold state.

### 5. Running Simulation Log Roll
-   **Behavior**: Lines of simulation output print line-by-line in the console box with a typing delay, creating a sense of live mathematical validation.
-   **Transition**: Fade-in and translate Y (`duration: 0.1s` per line).

---

## 📦 6. Core Components Specification

### Component A: Hero Status Header
-   **Vibe**: Apple Emergency SOS.
-   **Style**: Large alert bar at the very top of the page.
-   **States**:
    -   *Idle*: Muted Gray bar. "SYSTEM ONLINE: MONITORING PORTFOLIO".
    -   *Panic Mode Active*: Red pulse bar. "CRITICAL WARNING: SYSTEM ARMED. READY FOR RESCUE".

### Component B: Volatile Asset Card
-   **Vibe**: Bloomberg Terminal.
-   **Style**: Dark slate card (`bg-card`) with a left border reflecting risk.
-   **Elements**: Token icon, symbol, USD value, volatility index (e.g. `0.85`), and risk indicator badge ("CRITICAL EXIT RECOMMENDED").

### Component C: Natural Language Command Center
-   **Vibe**: Apple Search/Siri.
-   **Style**: Large input field with a thick charcoal border. When focused, the border glows red (Panic) or teal (Normal).
-   **Sample Prompt Button**: Quick tags below the input: *"Rescue 700 USDC"*, *"Rescue 1000 USDT (Protect ETH)"*.

### Component D: SAVE Protection Score Dial
-   **Vibe**: Mission Control.
-   **Style**: Central circular gauge (SVG circle) rendering the score out of 100 in the center in a large monospaced font.
-   **Breakdown Rows**: 5 rows below the dial showing micro progress lines for Liquidity, Slippage, Gas, Safety, and Market Impact.

### Component E: Revert Simulation Console
-   **Vibe**: Monospaced Unix Terminal.
-   **Style**: Embedded box with dark terminal background (`#070709`).
-   **Output**: Live logs verifying bytecode simulation, revert guards, and RPC failover logs.

---

## 💡 7. Lovable Implementation Prompt Template

When instructing **Lovable** to build the frontend, use this style template to configure the code generation:

```text
Please build the interface for SAVE (Emergency Exit Intelligence) using the following design system parameters:
1. Palette: Deep carbon backgrounds (#0F0F11), off-black cards (#16161A), charcoal dividers (#222227). Muted text is #8E8E93, primary text is #F7F7F8.
2. Typography: Use Inter for headings/labels and JetBrains Mono / SF Mono for all crypto balances, USD values, scores, and terminal logs.
3. States: Implement a "Panic Mode Active" toggle. When toggled on, the background transitions to a dark crimson tint (#1F1111), card borders glow red (#FF3B30, opacity 0.2), and the top status bar changes to a red pulsing emergency header.
4. Core Action: The main exit button must be a large red button ("TRIGGER EMERGENCY EXIT") with a pulsing red outer shadow.
5. Telemetry: Display an interactive radial gauge for the SAVE Protection Score (0-100) and an embedded terminal emulator showing transaction simulation logs.
6. Animations: Avoid bouncy transitions. Use fast, crisp fade-ins (ease-out, 200ms) to maintain a highly responsive, emergency utility feel.
```

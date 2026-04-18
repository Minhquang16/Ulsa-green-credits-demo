# Design System Specification: The Eco-Financial Editorial

This design system is a high-end framework designed to bridge the gap between financial stability and environmental consciousness. It moves away from the "generic fintech" aesthetic, opting instead for a sophisticated, editorial-inspired interface that prioritizes tonal depth, breathing room, and organic layering.

---

## 1. Creative North Star: "The Living Ledger"
The "Living Ledger" philosophy treats the UI not as a static digital tool, but as a series of premium, stacked surfaces. It balances the rigidity of financial data with the fluidity of nature. 

**Core Principles:**
*   **Intentional Asymmetry:** Break the 12-column monotony. Use staggered text alignments and varying container widths to create a high-end, magazine-like flow.
*   **Tonal Sovereignty:** Replace harsh lines with "Surface Nesting." Depth is communicated through color shifts, not structural borders.
*   **Breathing Room:** Over-index on white space to signal luxury and clarity, reducing cognitive load for complex financial tasks.

---

## 2. Color & Surface Logic

This system utilizes a sophisticated green palette that avoids "neon" pitfalls, favoring deep forest tones for high-trust elements and vibrant emeralds for action.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections.
Boundaries are created exclusively through:
1.  **Background Shifts:** Placing a `surface-container-low` component on a `surface` background.
2.  **Tonal Transitions:** Using the `surface-variant` to subtly distinguish headers from bodies.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine vellum.
*   **Base:** `surface` (#f3fcef)
*   **Level 1 (Sections):** `surface-container-low` (#edf6ea)
*   **Level 2 (Interactive Cards):** `surface-container-lowest` (#ffffff)
*   **Level 3 (Popovers/Modals):** `surface-bright` (#f3fcef) with glassmorphism.

### Signature Textures
For Hero sections and Primary CTAs, use a **Linear Gradient**:
*   *Direction:* 135deg
*   *From:* `primary` (#006e2f) 
*   *To:* `primary_container` (#22c55e)
This provides a "soul" to the green that flat hex codes cannot achieve.

---

## 3. Typography: Editorial Authority

We use a dual-sans-serif approach to distinguish between "Action" and "Narrative."

| Level | Token | Font | Size | Character |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Manrope | 3.5rem | Bold, tight tracking. For impact statements. |
| **Headline**| `headline-md` | Manrope | 1.75rem | Medium. Used for section starts. |
| **Title**   | `title-md` | Inter | 1.125rem | Semi-bold. For card titles and headers. |
| **Body**    | `body-lg` | Inter | 1.0rem | Regular. Optimized for readability. |
| **Label**   | `label-md` | Inter | 0.75rem | All-caps, 0.05em tracking. For metadata. |

**The Identity Blend:** *Manrope* (Headline) provides a modern, geometric precision, while *Inter* (Body) ensures maximum legibility for financial data.

---

## 4. Elevation & Depth: The Layering Principle

### Ambient Shadows
Avoid the "drop shadow" look. Use "Ambient Glows."
*   **Blur:** 32px to 64px.
*   **Opacity:** 4% – 8%.
*   **Color:** Use a tinted version of `on-surface` (e.g., `#161d16` at 5% opacity). This creates a natural lift as if the card is caught in soft, diffused sunlight.

### Glassmorphism
For the dark-mode Navbar and floating Action Buttons:
*   **Color:** `inverse_surface` (#2a322a) at 85% opacity.
*   **Backdrop Blur:** 12px.
*   **Effect:** This allows the green and light gray background elements to bleed through, making the UI feel integrated and premium.

---

## 5. Components

### Buttons: The "Soft-Tactile" Interaction
*   **Primary:** Gradient transition (`primary` to `primary_container`). `xl` (1.5rem) roundedness. No border.
*   **Secondary (Dark):** `inverse_surface` (#2a322a). White text. Used for persistent elements like the Navbar.
*   **Tertiary:** Text-only with `primary` color. 0.5rem padding.

### Cards: The "Ghost Border"
*   **Rule:** Forbid 100% opaque borders.
*   **Implementation:** Use `surface-container-lowest` for the card body. If accessibility requires a stroke, use `outline-variant` at 20% opacity. 
*   **Spacing:** Use the `xl` (1.5rem) roundedness scale for a modern, friendly hand-feel.

### Badges (Status Indicators)
*   **Success:** `primary_container` (#22c55e) background with `on_primary_container` (#004b1e) text.
*   **Warning:** Tertiary tones (Yellow/Orange) used sparingly.
*   **Danger:** `error_container` (#ffdad6) background with `on_error_container` (#93000a) text.
*   **Shape:** `full` (9999px) for a pill-shaped, distinct look.

### Input Fields
*   **Style:** Minimalist. No bottom line. Use `surface-container-high` as a subtle background fill.
*   **Focus State:** A 2px "Ghost Border" of `primary` at 40% opacity.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use vertical white space (from the spacing scale) to separate list items rather than horizontal lines.
*   **Do** use `primary_fixed_dim` for subtle background accents behind icons.
*   **Do** prioritize a mobile-first "Thumb-Zone" layout, placing primary actions within reach of the bottom of the screen.

### Don’t:
*   **Don’t** use pure black (#000000). Use `on_surface` (#161d16) for text to maintain a high-end, organic feel.
*   **Don’t** stack more than three levels of surface nesting.
*   **Don’t** use standard "Material Design" shadows. Always use the low-opacity, high-blur Ambient Shadow defined in Section 4.
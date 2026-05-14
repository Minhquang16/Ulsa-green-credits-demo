---
name: Lumina Axiom
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#23005c'
  on-tertiary-container: '#9466ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  surface-base: '#F8FAFC'
  surface-glass: rgba(255, 255, 255, 0.7)
  border-subtle: '#E2E8F0'
  success-emerald: '#10B981'
  warning-amber: '#F59E0B'
typography:
  headline-xl:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  stack-xs: 4px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

This design system is engineered for high-performance SaaS environments where clarity, speed, and precision are paramount. The brand personality is **composed, intelligent, and visionary**, striking a balance between technical rigor and human-centric accessibility. It targets sophisticated users who value efficiency and high-fidelity data visualization.

The aesthetic direction is a synthesis of **Minimalism** and **Glassmorphism**. It utilizes expansive white space, rigorous typography, and "surface-on-surface" layering to create a sense of organized depth. Visual interest is generated through subtle refraction effects and purposeful color accents rather than decorative flourishes. The result is an interface that feels like a precision instrument—unobtrusive when idle, yet powerful and responsive during interaction.

## Colors

The color strategy for this design system prioritizes functional hierarchy over decoration. 

- **Primary & Neutral:** We utilize a deep Slate palette for primary text and structural elements to maintain a grounded, professional atmosphere. 
- **Accents:** Secondary Blue and Tertiary Violet are reserved for high-intent actions, progress indicators, and data-driven highlights.
- **Surface Strategy:** The system relies on a multi-layered neutral scale (`surface-base`) to differentiate content zones without the need for heavy borders.
- **Semantic Logic:** Success and warning colors are calibrated for high legibility against both white and tinted background states.

## Typography

Typography is the backbone of the design system. We use **Sora** for headlines to inject a modern, geometric character that feels forward-looking. Its wide aperture and distinctive shapes provide immediate brand recognition.

For all functional text, **Hanken Grotesk** is employed. It offers exceptional legibility at small sizes and a neutral, professional tone that stays out of the user's way during deep work. 

**Application Rules:**
- Use `headline-xl` sparingly for landing hero sections.
- `body-md` is the default for all long-form content.
- `label-md` should be used for secondary navigation and category headers to provide clear structural signposts.

## Layout & Spacing

The layout is built on a **12-column fluid grid** for desktop and a **4-column grid** for mobile. We utilize an 8px base unit to ensure all components and spacing intervals are mathematically consistent.

**Responsive Behavior:**
- **Desktop (1024px+):** Fixed margins of 40px with fluid columns up to a max-width of 1280px.
- **Tablet (768px - 1023px):** Fluid margins (3% of width) and 8 columns.
- **Mobile (Up to 767px):** 16px side margins. Elements typically stack vertically unless they are small utility components (icons/pills).

**Spacing Philosophy:** Use `stack-md` for separating major content sections and `stack-sm` for grouping related items within a card or list item.

## Elevation & Depth

This design system uses **Tonal Layers** and **Backdrop Blurs** rather than heavy shadows to convey hierarchy. Depth is defined by three tiers:

1.  **Level 0 (Floor):** Uses `surface-base`. This is the background of the application where the lowest priority content resides.
2.  **Level 1 (Card/Sheet):** Pure white background with a 1px `border-subtle`. Used for standard content containers.
3.  **Level 2 (Floating/Overlay):** Uses `surface-glass` with a 12px backdrop blur and a soft, highly diffused shadow (0px 10px 30px rgba(0,0,0,0.04)). This is reserved for navigation bars, dropdowns, and modals.

This approach maintains a light, airy feel even when the interface becomes dense with data.

## Shapes

The shape language is defined as **Rounded**, utilizing a 0.5rem (8px) base radius. This softens the technical nature of the typography and creates a more approachable, modern feel.

- **Small Components:** Checkboxes and small tags use a 4px radius.
- **Standard Components:** Buttons, inputs, and cards use the 8px base radius.
- **Large Components:** Modals and large promo banners scale up to 1.5rem (24px) to emphasize their container status.

## Components

### Buttons
- **Primary:** Solid `primary_color_hex` with white text. High-contrast, no shadow, 8px corner radius.
- **Secondary:** Transparent background with `border-subtle` and `primary_color_hex` text. Subtle hover state using a 5% opacity tint of the primary color.
- **Ghost:** No border or background. Used for low-priority actions in toolbars.

### Input Fields
- **Default State:** White background, 1px `border-subtle`, 8px radius.
- **Focus State:** 1px border becomes `secondary_color_hex` with a 3px soft outer glow (ring) of the same color at 20% opacity.

### Chips & Tags
- Used for status and filtering. They feature a low-saturation background derived from their semantic color (e.g., Success Emerald at 10% opacity) with high-saturation text.

### Cards
- Cards are the primary unit of containment. They should not have shadows unless they are interactive (hoverable). On hover, a card should transition its border-color to `secondary_color_hex` and gain a Level 2 elevation shadow.

### Lists
- Clean, row-based layouts with `border-subtle` dividers. Use `body-sm` for metadata and `body-md` for primary list labels.
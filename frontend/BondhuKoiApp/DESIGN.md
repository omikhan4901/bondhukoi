# The Design System: Editorial Calm & Human-Centric Privacy

## 1. Overview & Creative North Star: "The Digital Sanctuary"
The Creative North Star for this design system is **The Digital Sanctuary**. In an era of aggressive "attention economy" UI, this system prioritizes the user's mental space. It moves beyond standard "minimalism" into a high-end editorial experience that feels curated, intentional, and quiet.

To break the "generic template" look, we utilize **Intentional Asymmetry** and **Tonal Depth**. By avoiding rigid grids and standard 1px borders, we create a layout that breathes. Elements are not "contained"; they are "situated" within a flowing, organic space. We use generous white space not as a void, but as a structural element that signals privacy and safety.

---

## 2. Colors: Tonal Atmosphere
Our palette moves away from high-contrast jarring transitions toward a sophisticated, layered atmosphere.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` (#F2F4F4) card sitting on a `surface` (#F9F9F9) background provides all the separation necessary.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers, like stacked sheets of fine, heavy-weight paper.
- **Base Layer:** `surface` (#F9F9F9)
- **Secondary Sectioning:** `surface-container-low` (#F2F4F4)
- **Interactive Elements/Cards:** `surface-container-lowest` (#FFFFFF)
- **Deep Inset/Navigation:** `surface-container-high` (#E4E9EA)

### The "Glass & Gradient" Rule
To add visual "soul," use **Glassmorphism** for floating elements (Top bars, navigation anchors). Use `surface` colors at 80% opacity with a `20px` backdrop blur. For primary CTAs, apply a subtle linear gradient from `primary` (#005BC1) to `primary_dim` (#004FAA) at a 135-degree angle to provide a premium, tactile depth that flat color cannot replicate.

---

## 3. Typography: Editorial Authority
The type system pairs the geometric clarity of **Manrope** for high-level expression with the functional legibility of **Inter** for communication.

*   **Display & Headlines (Manrope):** Use `display-lg` (3.5rem) and `headline-md` (1.75rem) to create clear entry points. These should feel like titles in a premium magazine—confident and spacious.
*   **Body & Titles (Inter):** Use `title-md` (1.125rem) for UI labels to ensure "glanceability." All body text (`body-lg`) should utilize a slightly increased line-height (1.6) to reduce visual noise and improve the "calm" vibe.
*   **Hierarchy as Brand:** Privacy is conveyed through clarity. Use `label-sm` (#5A6061) for metadata, ensuring a distinct contrast between user-generated content and system-level information.

---

## 4. Elevation & Depth: Tonal Layering
We reject heavy drop shadows in favor of **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural "lift" without visual clutter.
*   **Ambient Shadows:** When an element must float (e.g., a Compose FAB), use a shadow with a `24px` blur, `0px` spread, and an opacity of 4% using the `on_surface` (#2D3435) color. It should feel like a soft glow of light, not a dark outline.
*   **The "Ghost Border" Fallback:** If a container requires more definition for accessibility, use the `outline_variant` token at **15% opacity**. Never use 100% opaque borders.
*   **Tactile Feedback:** When pressed, an element should shift from `surface-container-lowest` to `surface-container-highest`, mimicking the physical compression of paper.

---

## 5. Components: Softness & Spacing

### Buttons
*   **Primary:** Rounded `full` (9999px), using the `primary` to `primary_dim` gradient. Padding: `1rem` vertical, `2rem` horizontal.
*   **Secondary:** `surface-container-highest` background with `on_surface` text. No border.
*   **Tertiary:** Ghost style. No background, `primary` text color, high-emphasis weight.

### Cards & Lists
*   **The Cardinal Rule:** Forbid divider lines. Use `spacing-5` (1.7rem) or `spacing-6` (2rem) to separate items. 
*   **Radius:** Cards use `xl` (1.5rem / 24px) for a soft, approachable hand-feel.
*   **Padding:** Minimum internal padding of `spacing-4` (1.4rem) to ensure content never feels "trapped."

### Input Fields
*   **Style:** `surface-container-low` background, `xl` corner radius. 
*   **Interaction:** On focus, the background shifts to `surface-container-lowest` with a "Ghost Border" of `primary` at 20% opacity.

### Signature Component: "The Privacy Veil"
A custom component for this app: A semi-transparent `surface-blur` overlay used when sensitive data is hidden. It uses a `12px` backdrop blur and `surface_variant` at 40% opacity, creating a "frosted glass" look that honors the user's privacy through beautiful design.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical spacing (e.g., larger top margins than bottom) to create an editorial flow.
*   **Do** use `on_surface_variant` (#5A6061) for secondary text to keep the interface "quiet."
*   **Do** leverage `spacing-10` and `spacing-12` for major section breaks to emphasize the "Sanctuary" vibe.

### Don't
*   **Don't** use pure black (#000000) or high-contrast borders; it breaks the "calm" immersion.
*   **Don't** use standard "Material Design" shadows. If you can clearly see where the shadow ends, it’s too dark.
*   **Don't** crowd components. If in doubt, add `spacing-4` (1.4rem) of additional padding.
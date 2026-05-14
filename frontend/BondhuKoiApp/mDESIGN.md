# Design System: Midnight Sanctuary

## 1. Overview & Creative North Star
**The Creative North Star: "The Digital Obsidian Vault"**

This design system is not merely a dark mode interface; it is a premium, private sanctuary. It moves away from the "flat" utility of standard social apps toward a high-end editorial experience that feels both impenetrable and inviting. 

We break the "template" look through **Tonal Architecture**. By rejecting harsh lines and standard grids in favor of overlapping glass surfaces and intentional asymmetry, we create a sense of physical depth. The interface should feel like high-quality obsidian—smooth, layered, and reflecting a soft, electric glow. Every interaction is designed to feel "hushed" and secure, prioritizing user privacy through sophisticated visual cues.

---

## 2. Colors & Surface Logic

The palette is anchored in deep, midnight neutrals, punctuated by a high-energy electric blue that serves as a beacon for action.

### Palette Highlights
- **Primary (`#a2c9ff`):** Used for interactive states.
- **Primary Container (`#47a1ff`):** The "Electric Signature" for high-impact CTAs.
- **Tertiary (`#2ae500`):** The "Inside" status indicator—a neon pulse signifying presence.
- **Surface & Background (`#111317`):** The foundation of the sanctuary.

### The "No-Line" Rule
To maintain a premium feel, **1px solid borders are strictly prohibited** for sectioning. Structural boundaries must be defined solely through:
1.  **Background Shifts:** Transitioning from `surface` to `surface-container-low`.
2.  **Tonal Transitions:** Using subtle shifts in the surface hierarchy to denote new content blocks.

### The "Glass & Gradient" Rule
Floating elements (modals, navigation bars, hover cards) must utilize **Glassmorphism**. Apply a semi-transparent `surface-variant` with a background blur (16px–32px). 
*   **Signature Texture:** For primary buttons and hero elements, use a linear gradient from `primary` to `primary-container` at a 135° angle to inject "soul" and depth into the interface.

---

## 3. Typography: The Editorial Manrope

We use **Manrope** exclusively. Its geometric yet humanist qualities provide the "Modern Security" tone required.

*   **Display & Headlines:** Use `display-lg` to `headline-sm` with tight tracking (-0.02em). These should feel authoritative and editorial. Use `on-surface` for maximum impact.
*   **Body & Labels:** Use `body-md` for standard reading. For secondary information, use `on-surface-variant` to create a natural hierarchy without changing font size.
*   **The Intentional Scale:** Always jump at least two levels in the type scale to define section headers (e.g., pairing a `title-sm` label with a `headline-md` header) to avoid a "generic" list appearance.

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows are too "web-standard." We achieve hierarchy through **Physical Stacking**.

*   **The Layering Principle:** 
    *   **Level 0 (Base):** `surface` (#111317).
    *   **Level 1 (Sections):** `surface-container-low` (#1a1c20).
    *   **Level 2 (Cards):** `surface-container` (#1e2024).
    *   **Level 3 (Interactive/Floating):** `surface-container-high` (#282a2e) with Glassmorphism.

*   **Ambient Shadows:** Use only for floating elements. The shadow must be large (blur: 40px+) and low-opacity (6% `on-surface`). Never use pure black shadows; they muddy the dark mode.
*   **The Ghost Border:** For high-density components where separation is vital, use `outline-variant` at **15% opacity**. This creates a "glimmer" on the edge of the 3xl corners rather than a heavy box.

---

## 5. Components

### Buttons & Interactors
*   **Primary Action:** `primary-container` background, `on-primary-fixed` text. Rounded-3xl (xl: `3rem`).
*   **External Social Links:** Instead of internal messaging icons, use branded external icons (Messenger, Instagram). These should be housed in a `surface-container-highest` circular container with a `Ghost Border`.

### Status Indicators (The Pulse)
*   **Inside:** A `tertiary` (#2ae500) circle with a 4px outer glow (drop-shadow) of the same color.
*   **Outside:** A flat `outline` (#8a919d) circle, slightly desaturated.

### Input Fields
*   **Container:** `surface-container-lowest`. 
*   **Focus State:** A 1px "Ghost Border" using `primary` at 40% opacity. No "glow" on the box itself, only a sharp, clean transition.
*   **Corners:** Always `md` (1.5rem) or `lg` (2rem) to maintain the "Soft Sanctuary" feel.

### Cards & Lists
*   **Forbid Dividers:** Do not use horizontal lines to separate list items. Use **Spacing Scale 4 (1.4rem)** or a subtle shift to `surface-container-low` on every second item to create a rhythmic, striped list.

### Contextual Floating Bar (New Component)
A bottom-docked navigation unit using `surface-container-highest` with 70% opacity and 24px background blur. Corners: `full`. This mimics high-end OS interfaces.

---

## 6. Do’s and Don’ts

### Do
*   **Do** embrace negative space. Use **Spacing Scale 12 or 16** for section padding to let the dark surfaces "breathe."
*   **Do** use overlapping elements. Let a card partially bleed over a background section to emphasize the "Glass Layer" logic.
*   **Do** use `on-surface-variant` for "hint" text to maintain the low-light sanctuary vibe.

### Don't
*   **Don't** use pure black (#000000). It kills the depth of the glassmorphism and feels "cheap."
*   **Don't** use standard 8px corners. Our identity is defined by the **xl (3rem)** and **3xl** curves.
*   **Don't** add internal chat bubbles. This app is a gateway; use the external social icons to represent communication flows.
*   **Don't** use high-contrast white text for everything. Reserve `on-surface` for headers; use `on-surface-variant` for general body copy to reduce eye strain in dark mode.
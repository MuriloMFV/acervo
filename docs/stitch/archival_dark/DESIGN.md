---
name: Archival Dark
colors:
  surface: '#11131a'
  surface-dim: '#11131a'
  surface-bright: '#373941'
  surface-container-lowest: '#0c0e15'
  surface-container-low: '#191b22'
  surface-container: '#1d1f27'
  surface-container-high: '#282a31'
  surface-container-highest: '#33343c'
  on-surface: '#e2e2ec'
  on-surface-variant: '#d4c4b0'
  inverse-surface: '#e2e2ec'
  inverse-on-surface: '#2e3038'
  outline: '#9d8f7c'
  outline-variant: '#504535'
  surface-tint: '#fabc4d'
  primary: '#ffc665'
  on-primary: '#432c00'
  primary-container: '#e5a93c'
  on-primary-container: '#5e4000'
  inverse-primary: '#7e5700'
  secondary: '#aec6ff'
  on-secondary: '#002e6b'
  secondary-container: '#026fef'
  on-secondary-container: '#fefcff'
  tertiary: '#d0c9ff'
  on-tertiary: '#2b039c'
  tertiary-container: '#b3a9ff'
  on-tertiary-container: '#412bb0'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdead'
  primary-fixed-dim: '#fabc4d'
  on-primary-fixed: '#281900'
  on-primary-fixed-variant: '#604100'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#aec6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004396'
  tertiary-fixed: '#e5deff'
  tertiary-fixed-dim: '#c7bfff'
  on-tertiary-fixed: '#180065'
  on-tertiary-fixed-variant: '#432db2'
  background: '#11131a'
  on-background: '#e2e2ec'
  surface-variant: '#33343c'
typography:
  headline-xl:
    fontFamily: Syne
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Syne
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Syne
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Syne
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Syne
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.25rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system translates the intimacy, preservation, and quiet prestige of curating a physical media archive into a tactile digital environment. The emotional experience mirrors walking into a private cinema vault or a meticulously organized personal gallery: focused, respectful of artifacts, and devoid of noisy visual clutter.

The visual style blends **Tactile Archival Minimal** with **Modern Editorial Depth**:
- **Atmospheric Darkness**: Deep obsidian and charcoal bases let original packaging artwork, spine treatments, and physical cover scans serve as the focal point.
- **Museum-grade Precision**: Metadata (aspect ratios, audio tracks, studio distributors, spine numbers, and barcode scans) is treated with typography reminiscent of gallery placards and archival index cards.
- **Subtle Physical Metaphors**: Surfaces do not mimic skeuomorphism directly; instead, they simulate the weight and shelf presence of physical items through soft rim-lighting, velvety dark elevations, and authentic poster ratios (2:3).

## Colors

The color palette is engineered specifically for deep dark mode, prioritizing chromatic restraint to showcase varied cover art without distraction.

### Base Canvas & Surfaces
- **Canvas Base (`#0C0D10`)**: The foundational void. Used for the global canvas background to preserve battery and provide high-contrast separation for media covers.
- **Surface Level 1 (`#15171E`)**: Elevated cards, shelf rails, and standard structural panels.
- **Surface Level 2 (`#1D212B`)**: Elevated overlays, bottom sheets, search inputs, and flyout menus.
- **Border Subtle (`#2A2F3D`)**: Precise 1px hairline strokes separating functional zones without harsh lines.

### Primary Accents & Archetype
- **Archival Amber (`#E5A93C` / Hover & Focus `#F3C363`)**: Denotes primary actions, collection highlights, verified vault items, and custom curation tags.
- **Ivory Neutral (`#F5F5F7`)**: High-emphasis headline text and core labels.
- **Muted Neutral (`#B4B9C7`)**: Secondary text, body paragraphs, and icon fills.
- **Slate Support (`#8E95A5`)**: Tertiary metadata, barcode values, inactive nav states, and technical cataloging labels.

### Format Semantic Tokens
Physical formats are identified via dedicated semantic accents applied to format tags, spine ribbons, and filtering pills:
- **4K UHD (`#E5A93C`)**: Warm golden tone representing reference-grade masterings.
- **Blu-ray (`#2B7FFF`)**: Crisp cobalt hue denoting high-definition physical discs.
- **DVD (`#8C7CFF`)**: Silvered violet hue referencing legacy optical media.
- **VHS (`#FF6B4A`)**: Saturated analog vermilion reflecting vintage magnetic tape.

## Typography

Typography establishes an editorial balance between cinematic titles and archival utility:
- **Headlines (`Syne`)**: Used for vault titles, section banners, director features, and collection counts. Its distinctive geometric cuts provide bespoke luxury without compromising screen readability.
- **Body & Labels (`Plus Jakarta Sans`)**: Delivers geometric legibility at small scale for extensive specifications (e.g., *Aspect Ratio 2.39:1*, *Dolby Atmos*, *Region A*, *Criterion Spine #1142*).
- **Archival Tags & Badges**: Set in `label-sm` with full uppercase tracking (`letter-spacing: 0.06em`) to echo physical disc case spines and studio stamps.

## Layout & Spacing

The layout is built around a mobile-first fluid grid optimized for visual browsing and rapid cataloging.

### Grid & Breakpoints
- **Mobile (< 640px)**: 4 columns, 12px gutters, 20px outer margin. Shelves utilize 2-column or 3-column media arrangements or horizontally overflowing carousel snaps.
- **Tablet (640px - 1024px)**: 8 columns, 16px gutters, 32px outer margin. Media browsing transitions to 4 or 5 poster columns.
- **Desktop / Wide (> 1024px)**: 12 columns, max content container width of 1200px, 24px gutters, dynamic centering margin.

### Media Card Ratios
All movie and visual media elements follow a strict **2:3 aspect ratio** (e.g., width 120px by height 180px, or width 160px by height 240px). This maintains authenticity for physical poster art and disc slipcovers.

## Elevation & Depth

Visual hierarchy uses a dark tonal ladder combined with directional shelf shadows rather than generic light drop-shadows.

1. **Level 0 (Canvas `#0C0D10`)**: The resting viewport surface.
2. **Level 1 (Shelf / Group `#15171E`)**: Outlined by a 1px border (`#2A2F3D`). Used for group cards, collection summaries, and filtered lists.
3. **Level 2 (Active Poster / Card Depth)**: Physical items sit atop the shelf with a realistic ambient depth:
   - Box-shadow: `0 8px 24px -4px rgba(0, 0, 0, 0.7), 0 2px 6px -1px rgba(0, 0, 0, 0.5)`
   - Spine edge highlight: An inset left gradient line (`inset 1px 0 0 rgba(255, 255, 255, 0.08)`) simulating plastic slipcover sheen.
4. **Level 3 (Modals / Floating Bottom Sheets `#1D212B`)**: Elevated with a dense soft shadow (`0 20px 48px rgba(0, 0, 0, 0.85)`) and a subtle top-border edge highlight (`#2A2F3D`).

## Shapes

The shape hierarchy pairs soft, ergonomic curves for interactive app containers with sharp edges for physical media artifacts:
- **Physical Media Cards**: Small border radius (`rounded-md`, 6px to 8px) to reflect the manufactured profile of Blu-ray cases, steelbooks, and VHS packaging.
- **Buttons, Chips & Inputs**: Standard balanced curve (`rounded-lg`, 8px to 12px) for clear tactile affordance.
- **Bottom Sheets & Floating Panels**: Pronounced `rounded-t-3xl` (24px to 32px) on mobile viewports for fluid gestural comfort.
- **Floating Action Center**: Circular / pill geometry (`rounded-full`) to ground the global archival action.

## Components

### Buttons
- **Primary Archival Action**: Filled `#E5A93C` with dark charcoal text (`#0C0D10`), medium weight. Slight inner shadow on press.
- **Secondary Surface Action**: Background `#1D212B`, border 1px `#2A2F3D`, text `#F5F5F7`. Hover border shifts to `#E5A93C` at 50% opacity.
- **Floating Add Button (Center Nav)**: Circular (56px) button finished in `#E5A93C` with an amber glow (`box-shadow: 0 4px 20px rgba(229, 169, 60, 0.35)`), centered in the bottom navigation bar.

### Format Badges & Chips
- Compact badges placed on cover corners or detail banners.
- Built using a 10% translucent background of the semantic format color, a matching 1px border at 40% opacity, and sharp, uppercase label typography (`label-sm`).
  - *Example (4K)*: Background `rgba(229, 169, 60, 0.12)`, border `rgba(229, 169, 60, 0.35)`, text `#E5A93C`.

### Media Cards (Poster 2:3)
- Rigid 2:3 ratio container with image lazy-loading, loaded onto background `#15171E`.
- Overlay gradient at the bottom (`rgba(12, 13, 16, 0.8)` to transparent) revealing title, release year, and format chip when in compact view.
- Subtle inner border stroke (`inset 0 0 0 1px rgba(255, 255, 255, 0.06)`) ensuring contrast against deep black artwork.

### Bottom Sheets & Drawers
- Applied for barcode scanning, quick edits, format filtering, and edition details.
- Background `#1D212B` with a top handle pill (`#2A2F3D`, 36px x 4px) and 24px top corner radius.

### Input Fields & Search
- Background `#15171E`, border 1px `#2A2F3D`, text `#F5F5F7`, placeholder `#8E95A5`.
- Active focus state: Border `#E5A93C` with 1px ambient focus ring (`rgba(229, 169, 60, 0.2)`).

### Navigation Bar
- Fixed bottom dock with frosted dark glass (`#0C0D10` with 85% opacity, `backdrop-filter: blur(16px)`), top hairline border (`#2A2F3D`).
- Symmetrical layout accommodating primary sections (Collection, Wishlist, Analytics, Settings) orbiting the elevated center Add action.
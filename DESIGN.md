# Design System: SparkTank

## Visual direction

SparkTank is a compact architectural workspace: quiet off-white field, white work surfaces, dark ink structure, and small moments of color tied to people or status. It should feel like a purpose-built strategy tool—not a generic dashboard, game HUD, or marketing page.

## Color roles

- **Canvas — `#eff1f5`:** the neutral dotted workspace behind every stage.
- **Paper — `#ffffff`:** forms, participant cards, and working panels.
- **Ink — `#0f172a`:** primary text, rules, active navigation, and decisive controls.
- **Secondary ink — `#475569`:** explanatory copy and inactive controls.
- **Quiet line — `#cbd5e1` / `#e2e8f0`:** separators, empty states, and resting borders.
- **Participant colors:** identity only. They belong on avatars and attribution, not decorative backgrounds.
- **Amber, green, red:** reserved for local/offline, connected, and destructive states.

## Typography

- **Space Grotesk:** headings, stage titles, counts, and other structural labels. Use compact tracking and strong weights.
- **Outfit:** body copy, controls, inputs, and supporting text.
- Small uppercase labels are part of the product's voice, but body copy remains sentence case and readable.
- Avoid oversized editorial type that turns the workspace into a landing page.

## Components

- **Panels:** white, 1.5–2px dark or quiet borders, rounded 8–16px, with subtle architectural offset shadows.
- **Primary buttons:** ink fill, white label, compact uppercase treatment, modest elevation.
- **Secondary buttons:** white fill with an ink rule; invert or lift slightly on hover.
- **Inputs:** white, ink outline, visible focus ring, no glow or translucent treatment.
- **Workflow gates:** keep prerequisite actions visible inside a ruled status panel. Locked gates stay neutral with a disabled action and a specific explanation; unlocked gates use the yellow signal accent and stronger offset shadow.
- **Disclosure stacks:** use full-width ruled rows with a compact icon, title, one-line remit, and chevron. Open the most decision-critical perspective by default, keep every peer perspective equally accessible, and reserve tinted emphasis for the lead row only.
- **Participant seats:** quiet at rest, lifted on hover, dark border and offset shadow when claimed. Color stays concentrated in the avatar.
- **Navigation:** a white ruled header with a compact dark underline for the current stage.

## Layout and motion

- Keep the first view centered and operational: session framing, add-name control, then roster.
- Use dotted background texture sparingly to retain the original workshop character.
- Motion should explain stage or seat changes, complete quickly, and stop. Respect reduced-motion preferences.
- At mobile widths, the stage rail remains horizontally usable, cards become one column, and actions stay in document flow rather than covering content.

## Avoid

- Purple or neon gradients, glassmorphism, WebGL atmosphere, glow effects, and cosmic language.
- Generic equal-card SaaS grids, decorative charts, and color without semantic purpose.
- Replacing the product's original light identity with a trend-driven theme.

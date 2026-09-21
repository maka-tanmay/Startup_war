# SparkTank roster and interface redesign

## What and why

Replace the fixed participant list with a user-managed roster while preserving SparkTank's original light, architectural visual identity. The roster must work both with Supabase on Vercel and local storage during local development.

## User stories

- As a session organizer, I can add each participant by name.
- As a participant, I can select my name before drafting.
- As an organizer, I can correct a name or emoji without recreating the person.
- As an organizer, I can remove a person and understand that their concepts will also be removed.
- As a returning group, I can see shared roster data after it loads without a flash of incorrect defaults.

## Functional requirements

1. Start with an empty roster when no stored or shared participants exist.
2. Reject blank and duplicate names inline.
3. Persist additions, edits, and removals to Supabase when configured, otherwise to local storage.
4. Keep the active participant object synchronized with roster updates.
5. Prevent duplicate optimistic rows when Supabase realtime echoes an insert.
6. Preserve all drafting, voting, and results behavior.

## Design requirements

1. Keep the off-white canvas, white work surfaces, ink borders, compact typography, and crisp offset shadows that made the original feel distinct.
2. Use participant colors only for identity and status; avoid decorative gradients, glass, and generic SaaS styling.
3. Keep the dotted field as quiet atmosphere without animated or WebGL backgrounds.
4. Animate navigation and seat selection with fast, interruptible motion; avoid looping attention effects.
5. Provide a roster-shaped loading state and a composed empty state.
6. Pass keyboard focus, contrast, overflow, and responsive checks.

## Verification

- TypeScript and production build complete successfully.
- Lobby flow is exercised in a browser at desktop and mobile widths.
- Add, duplicate validation, edit, select, and remove behaviors are checked.
- Final screenshots are reviewed against the direction contract.

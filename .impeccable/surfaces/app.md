# SparkTank application

## Scope and mode

Full application shell and five-stage workflow. Visitor mode: Operate.

## Audience, job, and constraints

Four friends use the app together to add themselves, draft ideas, independently review and present them, compare the human scoreboard with an LLM Council, and choose a winner. The interface must preserve Supabase/local-storage behavior, clarify first use, and work at desktop and mobile widths.

## Direction contract

**THESIS:** SparkTank is a live working board: people gather around one shared field, claim a seat, then move concepts through a visible contest. It should feel drawn, direct, and purpose-built rather than like a polished template.

**OWN-WORLD:** An off-white dotted field, white paper surfaces, dark ink rules, squared controls, and crisp offset shadows continue the original visual language. Participant colors identify people rather than decorate the interface. Yellow is reserved for small moments of attention.

**STORY:** The saved room is the first move. The group reopens an earlier room or creates a new one, four friends add their names, each person claims their identity, then the interface carries them from drafting to multi-criteria idea review, through a randomized presentation round, and into a final scoreboard. The council works quietly from saved idea data and remains sealed until the group chooses to reveal it.

**FIRST VIEWPORT:** A ruled stage rail anchors the top. Below it, a compact lobby pairs the session statement and live roster count with a paper-like name-entry console; participant seats flow beneath as a responsive worktable. The primary action remains visible after a seat is claimed.

**FORM:** Existing-world extension, ranked first for product clarity. The signature interaction is the active-seat transfer: selection light moves between roster seats through an interruptible shared-layout spring while repeated form work remains nearly instant.

**FINISH:** Preserve the product's own voice. No cosmic gradients, translucent glass, oversized marketing type, or ornamental effects that compete with the work.

## Acceptance criteria

- No preset participant names appear in a new session.
- A person can add a valid unique name directly from the lobby.
- Existing people can be renamed or removed with clear feedback.
- The selected person stays synchronized after edits and clears after removal.
- Loading, empty, validation, hover, focus, active, disabled, and reduced-motion states are present.
- All five stages share the same visual system and remain usable at 390 px and 1440 px widths.
- A titled idea starts a background council run without exposing its output; only the explicit reveal action makes the verdict visible.
- Human ranking and council recommendation stay visibly separate, with all five advisor views accessible.
- The user-facing stages are Lobby, Draft, Review, Present, and Scoreboard; do not use “Battle” as a workflow label.
- Each friend’s rating remains independently editable and contributes to a four-criterion aggregate.
- The standalone `/guide.html` page must always describe the shipped workflow rather than a future-state concept.
- The guide uses read-only live product views so its button names and layouts stay aligned with the shipped interface.
- Creating Room 2 cannot erase or mix Room 1; local and Supabase persistence are scoped by room.

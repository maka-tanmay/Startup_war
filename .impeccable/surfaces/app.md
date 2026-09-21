# SparkTank application

## Scope and mode

Full application shell and four-stage workflow. Visitor mode: Operate.

## Audience, job, and constraints

Small groups use the app together to add themselves, draft ideas, score them, and review a winner. The redesign must preserve every existing workflow and Supabase/local-storage behavior, clarify first use, and work at desktop and mobile widths.

## Direction contract

**THESIS:** SparkTank is a live working board: people gather around one shared field, claim a seat, then move concepts through a visible contest. It should feel drawn, direct, and purpose-built rather than like a polished template.

**OWN-WORLD:** An off-white dotted field, white paper surfaces, dark ink rules, squared controls, and crisp offset shadows continue the original visual language. Participant colors identify people rather than decorate the interface. Yellow is reserved for small moments of attention.

**STORY:** The roster is the first move. The group adds real names, each person claims their identity, then the interface carries them from drafting to battle to a final ranked summit without losing shared state.

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

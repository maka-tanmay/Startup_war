# Presentation council

## Intent

As soon as a titled idea is saved, SparkTank should begin an LLM Council run in the background. The recommendation stays sealed until the group explicitly clicks `Show council reviews`. The council is a second opinion and a source of contrarian pressure, not a replacement for human voting.

Reference implementation: [aiwithremy/claude-skills-llm-council](https://github.com/aiwithremy/claude-skills-llm-council)

Implementation lives in `src/components/PresentationCouncil.tsx`; the CLI orchestration lives in `server/councilRunner.mjs`. Supabase synchronization is defined in `supabase/migrations/20260921000000_presentation_council.sql`, with room ownership added by `supabase/migrations/20260921020000_rooms.sql`.

## Presentation flow

1. Add a presentation view before final results.
2. Provide a dropdown for the host to select the participant or concept currently presenting.
3. Show that concept's complete pitch in a focused, projector-friendly slide.
4. Let the host mark a presentation complete and move to the next entry.
5. Start or refresh the council automatically after the saved idea input settles; do not wait for the presentation round.
6. Keep deliberation and the completed result hidden until every presentation is complete, then unlock a single `Show council reviews` action.
7. When the group reveals it, show the council verdict, the five advisor views, and the existing human ranking together.

The dropdown is a presentation-control device, not the mechanism for choosing the winner. Its entries should show completion state, follow a neutral deterministic shuffle shared across laptops, and make the next unpresented entry easy to find. Progress and council output are keyed by the active room so a later session cannot overwrite an earlier decision.

## Council method

The council input should contain every eligible concept in the same neutral structure, plus the decision being asked: which concept is the strongest choice for this group to pursue and why?

The first version should preserve the referenced methodology:

- **Contrarian:** finds failure modes, missing evidence, and reasons the apparent winner may be wrong.
- **First Principles Thinker:** tests whether each concept solves the right underlying problem.
- **Expansionist:** looks for overlooked upside and adjacent opportunities.
- **Outsider:** identifies unclear assumptions and curse-of-knowledge problems.
- **Executor:** judges feasibility and the fastest credible path to action.
- Five independent views are anonymously peer-reviewed.
- A chairman synthesizes areas of agreement, clashes, blind spots, one recommendation, and one first action.

All advisor views must remain accessible after synthesis. Do not reduce the output to a winner name or a single score.

## Results experience

The reveal should clearly distinguish three layers:

1. **Group result** — the existing participant scores, comments, and ranking.
2. **Council recommendation** — the chairman's selected concept and rationale.
3. **Council perspectives** — collapsible advisor sections, with the Contrarian view prominent and disagreements preserved.

If the group winner and council recommendation differ, treat the disagreement as useful evidence. Show both outcomes without automatically changing the human ranking. The final decision remains with the participants.

## CLI-powered architecture

Use Tanmay's CLI as the council runner. The deployed browser must not execute a local shell command directly.

Shared-room boundary:

```text
SparkTank client
  -> deterministic queued run in Supabase
  -> host worker on Tanmay's laptop
  -> constrained read-only Codex CLI council workflow
  -> structured council result
  -> persisted session result in Supabase
  -> realtime reveal for every connected participant
```

The runner should:

- accept only structured session and concept data, never arbitrary shell text from the client;
- build the council prompt server-side;
- invoke the CLI with a fixed council command/workflow;
- request and validate structured output before saving it;
- keep CLI credentials and provider keys off the client;
- use an idempotency key so reconnects or double-clicks do not start duplicate paid runs;
- persist status as `idle`, `queued`, `running`, `complete`, or `failed`;
- retain the input snapshot and prompt/workflow version used for the result;
- expose a safe retry after failure without discarding the last successful result.

For an unconfigured local preview, Vite calls the installed CLI directly. In a shared Vercel room, the browser only queues a deterministic database record. `npm run council:worker` on Tanmay's laptop claims that record, reconstructs the exact room snapshot, rejects stale input hashes, and publishes the result. Participants never receive a shell endpoint or direct network access to the laptop.

## Suggested data shape

```ts
type PresentationProgress = {
  ideaId: string;
  presenterId: string;
  completedAt?: string;
};

type CouncilRun = {
  id: string;
  sessionId: string;
  status: 'idle' | 'queued' | 'running' | 'complete' | 'failed';
  inputHash: string;
  workflowVersion: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: {
    recommendedIdeaId: string;
    advisorViews: {
      contrarian: string;
      firstPrinciples: string;
      expansionist: string;
      outsider: string;
      executor: string;
    };
    agreement: string[];
    clashes: string[];
    blindSpots: string[];
    recommendation: string;
    firstAction: string;
  };
};
```

Progress and council runs use the active room id as their session identifier, so repeat sessions retain separate histories.

## Acceptance criteria

- The host can select any eligible presentation from a keyboard-accessible dropdown.
- Every presentation has a visible `not started`, `presenting`, or `complete` state.
- A titled idea automatically creates one background council run for its stable input snapshot, including when it is the only concept.
- Council output is not visible until every eligible idea is presented and the group explicitly clicks `Show council reviews`.
- Exactly one automatic council run is attempted for one input snapshot unless the host explicitly requests a rerun.
- Every connected participant sees the same run status and completed result.
- The result shows all five named perspectives and the chairman synthesis.
- The Contrarian view is visible without searching through raw output.
- Human scores and council conclusions are labeled separately.
- A council disagreement never silently rewrites the human ranking.
- Loading, failure, retry, stale-input, and partial-output states are designed and tested.
- No provider secret, CLI credential, or arbitrary command reaches the browser bundle.

## Decisions to make at implementation time

- Whether one participant may present multiple concepts or the session first chooses one concept per participant.
- Who has host permission to mark presentations complete and start or rerun the council.
- Which CLI command and structured-output mode will be stable in the deployment environment.
- Whether edits after a completed run invalidate it immediately or preserve it as a versioned historical result.
- Whether the council sees human scores before making its recommendation. Default to **no** so its opinion remains independent; scores can be supplied to the chairman only in a later comparison step if desired.

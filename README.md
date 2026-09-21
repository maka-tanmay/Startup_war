# SparkTank

SparkTank is a shared startup-idea session for four friends: build a roster, draft concepts, independently review them across four criteria, present them in a randomized order, and compare the human scoreboard with an independent LLM Council.

Open [`/guide.html`](guide.html) for the complete facilitator and participant walkthrough.

Each decision session is stored as its own room. The Lobby’s **Saved room** selector reopens earlier people, drafts, ratings, presentation progress, and council output; **New room** starts a separate history without erasing the previous room.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The development server exposes `/api/council` and invokes the installed Codex CLI in the background after a titled idea is saved. The result remains sealed in the interface until someone clicks `Show council reviews`.

The council follows the [LLM Council methodology](https://github.com/aiwithremy/claude-skills-llm-council): five independent advisor calls run in parallel, five anonymous peer reviews run in parallel, and a final chairman call returns a structured verdict.

## Council runner

The default runner uses `codex` from `PATH`. Set an explicit binary or model when needed:

```bash
SPARKTANK_CODEX_BIN=/Applications/ChatGPT.app/Contents/Resources/codex npm run dev
SPARKTANK_COUNCIL_MODEL=<model-id> npm run dev
```

For a UI-only test with deterministic output and no model calls:

```bash
SPARKTANK_COUNCIL_MOCK=1 npm run dev
```

To host the CLI bridge separately:

```bash
npm run council:server
```

Then set `VITE_COUNCIL_ENDPOINT` to that server's `/api/council` URL. The standalone bridge binds to `127.0.0.1` by default and only accepts the origin in `SPARKTANK_ALLOWED_ORIGIN`.

The client cannot execute a local CLI from a deployed Vercel page. A deployed app therefore needs `VITE_COUNCIL_ENDPOINT` pointed at a reachable machine or service with the Codex CLI installed and authenticated. Provider credentials remain server-side.

## Supabase

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for shared state. Without them, SparkTank uses local storage.

Apply [the presentation council migration](supabase/migrations/20260921000000_presentation_council.sql) to synchronize presentation progress and council results across connected devices. It creates:

- `presentation_progress`
- `council_runs`

Apply [the idea ratings migration](supabase/migrations/20260921010000_idea_ratings.sql) so each friend’s per-idea rating syncs independently instead of overwriting another reviewer.

Apply [the rooms migration](supabase/migrations/20260921020000_rooms.sql) to separate session history. It creates `rooms`, adds `room_id` ownership to participants and ideas, and moves existing shared data into Room 1.

Without Supabase, the same room separation is stored in the current browser. Browser-local rooms do not sync to other laptops.

## Verify

```bash
npm run build
```

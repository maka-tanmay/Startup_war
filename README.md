# SparkTank

SparkTank is a shared startup-idea session: build a roster, draft concepts, score them, present them, and compare the group's ranking with an independent LLM Council.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The development server exposes `/api/council` and invokes the installed Codex CLI when the presentation round requests a verdict.

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

The current application uses one shared session id (`spark-tank-main`) to match its existing globally shared participants and ideas. Introduce explicit session ownership before exposing the app to untrusted public groups.

## Verify

```bash
npm run build
```

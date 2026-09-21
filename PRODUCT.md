# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Four friends running a live startup-idea session together, often across four laptops and one shared presentation screen.

## Product Purpose

SparkTank gives four friends one shared place to create a roster, draft startup concepts, review the business across four criteria, present every idea in a neutral randomized order, then compare the human scoreboard with an independent LLM Council. Success means everyone can identify themselves quickly, contribute and rate ideas without confusion, hear every presentation before judgment, and leave with a credible group decision.

## Positioning

The product combines person-owned drafting with a shared idea review, randomized presentation round, human scoreboard, and independent council perspective in one lightweight real-time workflow.

## Operating Context

Each saved room moves through five stages: Lobby, Draft, Review, Present, and Scoreboard. Supabase provides cross-device room history on the deployed Vercel app; local storage keeps separate rooms in one browser when Supabase is not configured. The local council bridge uses Tanmay's authenticated Codex CLI.

## Capabilities and Constraints

- Up to four friends can be added, renamed, selected, and removed from the roster.
- A group can create a new room and later reopen any saved room without mixing its people, drafts, ratings, presentation progress, or council output.
- Each person owns their concepts; removing someone also removes their concepts after confirmation.
- Every friend can independently rate every concept on problem value, market potential, differentiation, and feasibility; the scoreboard aggregates rather than overwrites those ratings.
- Concepts move through guided drafting fields, randomized presentation order, and ranked scoreboard results.
- The host controls a presentation queue; the council begins from saved idea data in the background and remains sealed until someone explicitly reveals it.
- Five independent advisors, five anonymous peer reviews, and one chairman synthesis provide a separate recommendation without overwriting human scores.
- The existing React, Vite, Supabase, and Vercel architecture must remain intact.
- The interface must remain usable on phones and desktop browsers, with reduced-motion support.

## Brand Commitments

The product name is SparkTank. Its voice is concise, energetic, and specific. The established visual territory is a light architectural workroom: off-white dotted canvas, paper surfaces, dark rules, and compact technical typography.

## Evidence on Hand

The working product code and Supabase integration are the only evidence. Do not invent user counts, customer claims, benchmarks, or testimonials.

## Product Principles

1. Make the current stage and next action unmistakable.
2. Keep the shared roster under the group’s control; never seed people they did not add.
3. Preserve the original visual identity and use motion only to clarify progress or selection.
4. Preserve room history, ideas, and attribution across devices.
5. Prefer direct, reversible editing and explicit confirmation for destructive actions.

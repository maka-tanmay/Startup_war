# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Friends or small teams running a live startup-idea session together, often across multiple laptops.

## Product Purpose

SparkTank gives a group one shared place to create a roster, draft startup concepts, evaluate and present them, then compare the human ranking with an independent LLM Council. Success means everyone can identify themselves quickly, add ideas without confusion, hear every presentation before judgment, and reach a credible group decision in one session.

## Positioning

The product combines private-by-person drafting with a shared battle and ranked summit in one lightweight real-time workflow.

## Operating Context

Sessions move through five stages: lobby, drafting, battle, presentation and council, and results. Supabase provides cross-device synchronization on the deployed Vercel app; local storage keeps the app usable when Supabase is not configured. The local council bridge uses Tanmay's authenticated Codex CLI.

## Capabilities and Constraints

- People can be added, renamed, selected, and removed from the roster.
- Each person owns their concepts; removing someone also removes their concepts after confirmation.
- Concepts move through guided drafting fields, scored evaluation, and ranked results.
- The host controls a presentation queue; the council remains locked until every eligible concept is marked complete.
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
4. Preserve ideas and attribution across devices.
5. Prefer direct, reversible editing and explicit confirmation for destructive actions.

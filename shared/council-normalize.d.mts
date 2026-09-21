import type { CouncilConceptInput } from '../src/types/council';

export function cleanCouncilText(value: unknown, maxLength?: number): string;
export function normalizeCouncilConcept(concept?: Partial<CouncilConceptInput>): CouncilConceptInput;
export function normalizeCouncilConcepts(concepts: Array<Partial<CouncilConceptInput>>): CouncilConceptInput[];

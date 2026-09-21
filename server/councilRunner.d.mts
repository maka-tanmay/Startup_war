import type { IncomingMessage, ServerResponse } from 'node:http';

export function handleCouncilRequest(request: IncomingMessage, response: ServerResponse): Promise<void>;
export function runCouncil(payload: unknown): Promise<unknown>;

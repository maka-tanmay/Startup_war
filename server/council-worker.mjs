import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { normalizeCouncilConcepts } from '../shared/council-normalize.mjs';
import { runCouncil } from './councilRunner.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const pollMs = Math.max(500, Number.parseInt(process.env.SPARKTANK_COUNCIL_POLL_MS || '1500', 10) || 1500);
const allowedRooms = new Set((process.env.SPARKTANK_COUNCIL_ROOM_IDS || '').split(',').map(value => value.trim()).filter(Boolean));
const runOnce = process.env.SPARKTANK_COUNCIL_ONCE === '1';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local before starting the council worker.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

let stopping = false;

function presentationRank(sessionId, id) {
  let hash = 2166136261;
  for (const character of `${sessionId}:${id}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function value(row, camel, snake = camel) {
  return row[camel] ?? row[snake] ?? '';
}

async function loadConcepts(sessionId) {
  const [{ data: ideas, error: ideasError }, { data: participants, error: participantsError }] = await Promise.all([
    supabase.from('ideas').select('*').eq('room_id', sessionId),
    supabase.from('participants').select('*').eq('room_id', sessionId)
  ]);

  if (ideasError) throw new Error(`Could not load room ideas: ${ideasError.message}`);
  if (participantsError) throw new Error(`Could not load room participants: ${participantsError.message}`);

  const participantNames = new Map((participants || []).map(participant => [String(participant.id), String(participant.name || 'Unknown presenter')]));
  const eligibleIdeas = (ideas || [])
    .filter(idea => String(idea.title || '').trim())
    .sort((a, b) => presentationRank(sessionId, String(a.id)) - presentationRank(sessionId, String(b.id)) || String(a.id).localeCompare(String(b.id)));

  return normalizeCouncilConcepts(eligibleIdeas.map(idea => {
    const ownerId = String(value(idea, 'ownerId', 'owner_id'));
    return {
      id: String(idea.id),
      presenter: participantNames.get(ownerId) || 'Unknown presenter',
      title: value(idea, 'title'),
      pitch: value(idea, 'pitch'),
      problem: value(idea, 'problem'),
      targetCustomer: value(idea, 'targetCustomer', 'target_customer'),
      revenueModel: value(idea, 'revenueModel', 'revenue_model'),
      startupCost: value(idea, 'startupCost', 'startup_cost'),
      timeToLaunch: value(idea, 'timeToLaunch', 'time_to_launch'),
      marketSize: value(idea, 'marketSize', 'market_size'),
      unfairAdvantage: value(idea, 'unfairAdvantage', 'unfair_advantage'),
      biggestRisk: value(idea, 'biggestRisk', 'biggest_risk')
    };
  }));
}

async function failRun(run, error) {
  const message = error instanceof Error ? error.message : 'The host council worker failed.';
  await supabase.from('council_runs').update({ status: 'failed', error: message.slice(0, 2000) }).eq('id', run.id);
  console.error(`[council-worker] Failed ${run.id}: ${message}`);
}

async function processNextRun() {
  let query = supabase
    .from('council_runs')
    .select('*')
    .eq('status', 'queued')
    .order('started_at', { ascending: true })
    .limit(1);

  if (allowedRooms.size > 0) query = query.in('session_id', [...allowedRooms]);
  const { data: queued, error: queueError } = await query;
  if (queueError) throw new Error(`Could not read the council queue: ${queueError.message}`);
  const candidate = queued?.[0];
  if (!candidate) return false;

  const { data: claimed, error: claimError } = await supabase
    .from('council_runs')
    .update({ status: 'running', started_at: new Date().toISOString(), completed_at: null, error: null, result: null })
    .eq('id', candidate.id)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle();

  if (claimError) throw new Error(`Could not claim ${candidate.id}: ${claimError.message}`);
  if (!claimed) return true;

  console.log(`[council-worker] Running ${claimed.id} for room ${claimed.session_id}`);
  try {
    const concepts = await loadConcepts(claimed.session_id);
    if (concepts.length === 0) throw new Error('The room no longer has a titled idea to review.');

    const currentHash = createHash('sha256').update(JSON.stringify(concepts)).digest('hex');
    if (currentHash !== claimed.input_hash) {
      throw new Error('The room changed before the council began. The latest idea version will be queued automatically.');
    }

    const completed = await runCouncil({ sessionId: claimed.session_id, inputHash: claimed.input_hash, concepts });
    const { error: completeError } = await supabase.from('council_runs').update({
      status: 'complete',
      workflow_version: completed.workflowVersion,
      completed_at: completed.completedAt,
      error: null,
      result: completed.result
    }).eq('id', claimed.id).eq('status', 'running');

    if (completeError) throw new Error(`Could not publish the council result: ${completeError.message}`);
    console.log(`[council-worker] Completed ${claimed.id}`);
  } catch (error) {
    await failRun(claimed, error);
  }
  return true;
}

async function recoverInterruptedRuns() {
  const cutoff = new Date(Date.now() - 6 * 60_000).toISOString();
  let query = supabase.from('council_runs').update({
    status: 'queued',
    error: 'Recovered after the host worker stopped before finishing.'
  }).eq('status', 'running').lt('started_at', cutoff);
  if (allowedRooms.size > 0) query = query.in('session_id', [...allowedRooms]);
  const { error } = await query;
  if (error) throw new Error(`Could not recover interrupted council runs: ${error.message}`);
}

async function main() {
  await recoverInterruptedRuns();
  console.log(`[council-worker] Watching ${allowedRooms.size ? [...allowedRooms].join(', ') : 'all rooms'} every ${pollMs}ms. Press Ctrl+C to stop.`);
  do {
    try {
      const processed = await processNextRun();
      if (!processed && !runOnce) await new Promise(resolve => setTimeout(resolve, pollMs));
    } catch (error) {
      console.error(`[council-worker] ${error instanceof Error ? error.message : error}`);
      if (!runOnce) await new Promise(resolve => setTimeout(resolve, pollMs));
    }
  } while (!runOnce && !stopping);
}

process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });

main().catch(error => {
  console.error(`[council-worker] ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Check,
  ChevronDown,
  Circle,
  Eye,
  Gauge,
  Lightbulb,
  LoaderCircle,
  Play,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sparkles,
  Target,
  Telescope,
  Users,
  Zap
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { normalizeCouncilConcepts } from '../../shared/council-normalize.mjs';
import type { Idea, Participant } from '../data/mockData';
import { supabase } from '../lib/supabase';
import type {
  AdvisorKey,
  CouncilConceptInput,
  CouncilResult,
  CouncilRun,
  PresentationProgress,
  PresentationStatus
} from '../types/council';
import './presentation-council.css';

const WORKFLOW_VERSION = 'llm-council-v1';

const progressStorageKey = (sessionId: string) => `spark-tank-room:${sessionId}:presentation-progress`;
const runStorageKey = (sessionId: string) => `spark-tank-room:${sessionId}:council-run`;

function presentationRank(sessionId: string, id: string) {
  let hash = 2166136261;
  for (const character of `${sessionId}:${id}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const advisorMeta: Array<{ key: AdvisorKey; label: string; remit: string; icon: typeof ShieldAlert }> = [
  { key: 'contrarian', label: 'Contrarian', remit: 'What could make the favorite fail?', icon: ShieldAlert },
  { key: 'firstPrinciples', label: 'First Principles', remit: 'Are we solving the right problem?', icon: Lightbulb },
  { key: 'expansionist', label: 'Expansionist', remit: 'Where is the overlooked upside?', icon: Telescope },
  { key: 'outsider', label: 'Outsider', remit: 'What is unclear to fresh eyes?', icon: Eye },
  { key: 'executor', label: 'Executor', remit: 'What can we prove and ship first?', icon: Zap }
];

function readStoredProgress(sessionId: string): Record<string, PresentationProgress> {
  try {
    const scopedKey = progressStorageKey(sessionId);
    const scoped = localStorage.getItem(scopedKey);
    if (scoped) return JSON.parse(scoped);
    if (sessionId === 'room-1') {
      const legacy = localStorage.getItem('spark-tank-presentation-progress-v1');
      if (legacy) {
        localStorage.setItem(scopedKey, legacy);
        return JSON.parse(legacy);
      }
    }
    return {};
  } catch {
    return {};
  }
}

function readStoredRun(sessionId: string): CouncilRun {
  try {
    const scopedKey = runStorageKey(sessionId);
    let serialized = localStorage.getItem(scopedKey);
    if (!serialized && sessionId === 'room-1') {
      serialized = localStorage.getItem('spark-tank-council-run-v1');
      if (serialized) localStorage.setItem(scopedKey, serialized);
    }
    const stored = JSON.parse(serialized || 'null');
    if (stored?.sessionId === 'spark-tank-main' && sessionId === 'room-1') return { ...stored, sessionId };
    if (stored?.sessionId === sessionId) return stored;
  } catch {
    // Fall through to a clean local run.
  }
  return { id: '', sessionId, status: 'idle', inputHash: '', workflowVersion: WORKFLOW_VERSION };
}

function normalizeProgressRow(row: Record<string, unknown>): PresentationProgress {
  return {
    ideaId: String(row.idea_id || ''),
    presenterId: String(row.presenter_id || ''),
    status: String(row.status || 'not_started') as PresentationStatus,
    completedAt: row.completed_at ? String(row.completed_at) : undefined
  };
}

function normalizeRunRow(row: Record<string, unknown>, sessionId: string): CouncilRun {
  return {
    id: String(row.id || ''),
    sessionId: String(row.session_id || sessionId),
    status: String(row.status || 'idle') as CouncilRun['status'],
    inputHash: String(row.input_hash || ''),
    workflowVersion: String(row.workflow_version || WORKFLOW_VERSION),
    startedAt: row.started_at ? String(row.started_at) : undefined,
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
    error: row.error ? String(row.error) : undefined,
    result: row.result as CouncilResult | undefined
  };
}

async function hashInput(input: CouncilConceptInput[]) {
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

interface PresentationCouncilProps {
  sessionId: string;
  ideas: Idea[];
  participants: Participant[];
  isConfigured: boolean;
  onViewResults: () => void;
  autoRun?: boolean;
  demoMode?: boolean;
}

export default function PresentationCouncil({ sessionId, ideas, participants, isConfigured, onViewResults, autoRun = true, demoMode = false }: PresentationCouncilProps) {
  const reduceMotion = useReducedMotion();
  const eligibleIdeas = useMemo(() => ideas.filter(idea => idea.title.trim()).sort((a, b) => presentationRank(sessionId, a.id) - presentationRank(sessionId, b.id) || a.id.localeCompare(b.id)), [ideas, sessionId]);
  const [selectedIdeaId, setSelectedIdeaId] = useState(() => eligibleIdeas[0]?.id || '');
  const [progress, setProgress] = useState<Record<string, PresentationProgress>>(() => readStoredProgress(sessionId));
  const [councilRun, setCouncilRun] = useState<CouncilRun>(() => readStoredRun(sessionId));
  const [currentInputHash, setCurrentInputHash] = useState('');
  const [syncNotice, setSyncNotice] = useState('');
  const [reviewsVisible, setReviewsVisible] = useState(false);
  const autoRunTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptedHashes = useRef(new Set<string>());

  const participantById = useMemo(() => new Map(participants.map(participant => [participant.id, participant])), [participants]);
  const selectedIdea = eligibleIdeas.find(idea => idea.id === selectedIdeaId) || eligibleIdeas[0];
  const selectedOwner = selectedIdea ? participantById.get(selectedIdea.ownerId) : undefined;

  useEffect(() => {
    setSelectedIdeaId(eligibleIdeas[0]?.id || '');
    setProgress(readStoredProgress(sessionId));
    setCouncilRun(readStoredRun(sessionId));
    setReviewsVisible(false);
    setSyncNotice('');
    attemptedHashes.current.clear();
  }, [sessionId]);

  const conceptInput = useMemo<CouncilConceptInput[]>(() => normalizeCouncilConcepts(eligibleIdeas.map(idea => ({
    id: idea.id,
    presenter: participantById.get(idea.ownerId)?.name || 'Unknown presenter',
    title: idea.title,
    pitch: idea.pitch,
    problem: idea.problem,
    targetCustomer: idea.targetCustomer,
    revenueModel: idea.revenueModel,
    startupCost: idea.startupCost,
    timeToLaunch: idea.timeToLaunch,
    marketSize: idea.marketSize,
    unfairAdvantage: idea.unfairAdvantage,
    biggestRisk: idea.biggestRisk
  }))), [eligibleIdeas, participantById]);

  useEffect(() => {
    if (!selectedIdeaId && eligibleIdeas[0]) setSelectedIdeaId(eligibleIdeas[0].id);
    if (selectedIdeaId && !eligibleIdeas.some(idea => idea.id === selectedIdeaId)) setSelectedIdeaId(eligibleIdeas[0]?.id || '');
    setProgress(previous => Object.fromEntries(eligibleIdeas.map(idea => [
      idea.id,
      previous[idea.id] || { ideaId: idea.id, presenterId: idea.ownerId, status: 'not_started' }
    ])));
  }, [eligibleIdeas, selectedIdeaId]);

  useEffect(() => {
    localStorage.setItem(progressStorageKey(sessionId), JSON.stringify(progress));
  }, [progress, sessionId]);

  useEffect(() => {
    localStorage.setItem(runStorageKey(sessionId), JSON.stringify(councilRun));
  }, [councilRun, sessionId]);

  useEffect(() => {
    let cancelled = false;
    hashInput(conceptInput).then(hash => !cancelled && setCurrentInputHash(hash));
    return () => { cancelled = true; };
  }, [conceptInput]);

  useEffect(() => {
    if (!demoMode || !currentInputHash || eligibleIdeas.length === 0) return;
    const recommended = eligibleIdeas.find(idea => idea.title === 'ProofPilot') || eligibleIdeas[0];
    setProgress(Object.fromEntries(eligibleIdeas.map(idea => [idea.id, {
      ideaId: idea.id,
      presenterId: idea.ownerId,
      status: 'complete' as const,
      completedAt: '2026-09-21T12:00:00.000Z'
    }])));
    setCouncilRun({
      id: 'guide-council-run',
      sessionId,
      status: 'complete',
      inputHash: currentInputHash,
      workflowVersion: WORKFLOW_VERSION,
      completedAt: '2026-09-21T12:00:00.000Z',
      result: {
        recommendedIdeaId: recommended.id,
        recommendedIdeaTitle: recommended.title,
        advisorViews: {
          contrarian: 'The favorite still needs evidence that customers will change their current behavior.',
          firstPrinciples: 'The strongest concept targets a specific costly decision rather than a broad aspiration.',
          expansionist: 'The evidence workflow could become a reusable operating system for early product teams.',
          outsider: 'Explain the first customer moment without relying on startup vocabulary.',
          executor: 'Run a paid manual pilot before building the full workflow.'
        },
        agreement: ['Test willingness to pay before expanding the product.'],
        clashes: ['The upside is meaningful, but repeatable delivery is not yet proven.'],
        blindSpots: ['Current alternatives and switching friction need direct customer evidence.'],
        recommendation: 'Start with the concept that can produce credible customer evidence fastest.',
        firstAction: 'Recruit three target customers for a paid manual pilot.'
      }
    });
  }, [currentInputHash, demoMode, eligibleIdeas, sessionId]);

  useEffect(() => {
    if (!isConfigured) return;
    let active = true;

    const loadCouncilState = async () => {
      const [progressResponse, runResponse] = await Promise.all([
        supabase.from('presentation_progress').select('*').eq('session_id', sessionId),
        supabase.from('council_runs').select('*').eq('session_id', sessionId).order('started_at', { ascending: false }).limit(1)
      ]);

      if (!active) return;
      if (!progressResponse.error && progressResponse.data?.length) {
        setProgress(previous => ({
          ...previous,
          ...Object.fromEntries(progressResponse.data.map(row => {
            const item = normalizeProgressRow(row);
            return [item.ideaId, item];
          }))
        }));
      }
      if (!runResponse.error && runResponse.data?.[0]) setCouncilRun(normalizeRunRow(runResponse.data[0], sessionId));
    };

    loadCouncilState();
    const channel = supabase
      .channel(`council-state-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presentation_progress', filter: `session_id=eq.${sessionId}` }, payload => {
        if (payload.eventType === 'DELETE') return;
        const item = normalizeProgressRow(payload.new as Record<string, unknown>);
        setProgress(previous => ({ ...previous, [item.ideaId]: item }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'council_runs', filter: `session_id=eq.${sessionId}` }, payload => {
        if (payload.eventType !== 'DELETE') setCouncilRun(normalizeRunRow(payload.new as Record<string, unknown>, sessionId));
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [isConfigured, sessionId]);

  const completedCount = eligibleIdeas.filter(idea => progress[idea.id]?.status === 'complete').length;
  const hasCouncilInput = eligibleIdeas.length > 0;
  const allPresented = hasCouncilInput && completedCount === eligibleIdeas.length;
  const currentStatus = selectedIdea ? progress[selectedIdea.id]?.status || 'not_started' : 'not_started';
  const isStale = councilRun.status === 'complete' && Boolean(currentInputHash) && councilRun.inputHash !== currentInputHash;
  const councilReady = hasCouncilInput && Boolean(currentInputHash);
  const humanWinner = useMemo(() => [...eligibleIdeas]
    .filter(idea => idea.groupScore !== undefined)
    .sort((a, b) => (b.groupScore || 0) - (a.groupScore || 0))[0], [eligibleIdeas]);

  useEffect(() => {
    if (!allPresented) setReviewsVisible(false);
  }, [allPresented]);

  const persistProgress = async (item: PresentationProgress) => {
    setProgress(previous => ({ ...previous, [item.ideaId]: item }));
    if (!isConfigured) return;
    const { error } = await supabase.from('presentation_progress').upsert({
      session_id: sessionId,
      idea_id: item.ideaId,
      presenter_id: item.presenterId,
      status: item.status,
      completed_at: item.completedAt || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'session_id,idea_id' });
    if (error) setSyncNotice('Presentation state is saved on this device; apply the Supabase migration to sync it across laptops.');
  };

  const persistRun = async (run: CouncilRun) => {
    setCouncilRun(run);
    if (!isConfigured) return;
    const { error } = await supabase.from('council_runs').upsert({
      id: run.id,
      session_id: run.sessionId,
      status: run.status,
      input_hash: run.inputHash,
      workflow_version: run.workflowVersion,
      started_at: run.startedAt || null,
      completed_at: run.completedAt || null,
      error: run.error || null,
      result: run.result || null
    });
    if (error) setSyncNotice('Council output is saved on this device; apply the Supabase migration to sync it across laptops.');
  };

  const choosePresentation = async (ideaId: string) => {
    setSelectedIdeaId(ideaId);
    const idea = eligibleIdeas.find(candidate => candidate.id === ideaId);
    if (!idea || progress[ideaId]?.status === 'complete') return;
    await persistProgress({ ideaId, presenterId: idea.ownerId, status: 'presenting' });
  };

  const beginPresentation = async () => {
    if (!selectedIdea) return;
    await persistProgress({ ideaId: selectedIdea.id, presenterId: selectedIdea.ownerId, status: 'presenting' });
  };

  const completePresentation = async () => {
    if (!selectedIdea) return;
    await persistProgress({ ideaId: selectedIdea.id, presenterId: selectedIdea.ownerId, status: 'complete', completedAt: new Date().toISOString() });
    const next = eligibleIdeas.find(idea => idea.id !== selectedIdea.id && progress[idea.id]?.status !== 'complete');
    if (next) setSelectedIdeaId(next.id);
  };

  const runCouncil = useCallback(async (force = false) => {
    if (!councilReady) return;
    setReviewsVisible(false);
    const startedAt = new Date().toISOString();
    const baseRun: CouncilRun = {
      id: `council-${sessionId.replace(/[^a-z0-9-]/gi, '').slice(0, 16)}-${currentInputHash.slice(0, 16)}`,
      sessionId,
      status: isConfigured ? 'queued' : 'running',
      inputHash: currentInputHash,
      workflowVersion: WORKFLOW_VERSION,
      startedAt
    };
    setSyncNotice('');

    if (isConfigured) {
      setCouncilRun(baseRun);
      const { error } = await supabase.from('council_runs').upsert({
        id: baseRun.id,
        session_id: baseRun.sessionId,
        status: 'queued',
        input_hash: baseRun.inputHash,
        workflow_version: baseRun.workflowVersion,
        started_at: baseRun.startedAt,
        completed_at: null,
        error: null,
        result: null
      }, { onConflict: 'id', ignoreDuplicates: !force });

      if (error) {
        setCouncilRun({ ...baseRun, status: 'failed', error: 'The council request could not be synced to the host laptop.' });
        setSyncNotice('Council request could not be queued. Check the Supabase council migration and connection.');
        return;
      }

      const { data } = await supabase.from('council_runs').select('*').eq('id', baseRun.id).maybeSingle();
      if (data) setCouncilRun(normalizeRunRow(data, sessionId));
      return;
    }

    await persistRun(baseRun);

    try {
      const response = await fetch(import.meta.env.VITE_COUNCIL_ENDPOINT || '/api/council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, inputHash: currentInputHash, concepts: conceptInput })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'The CLI council runner did not complete.');
      await persistRun({
        ...baseRun,
        status: 'complete',
        completedAt: payload.completedAt || new Date().toISOString(),
        result: payload.result as CouncilResult
      });
    } catch (error) {
      await persistRun({
        ...baseRun,
        status: 'failed',
        error: error instanceof Error ? error.message : 'The council run failed.'
      });
    }
  }, [conceptInput, councilReady, currentInputHash, isConfigured, sessionId]);

  useEffect(() => {
    if (!autoRun || !councilReady || councilRun.status === 'running') return;
    if (councilRun.status === 'complete' && councilRun.inputHash === currentInputHash) return;
    if (attemptedHashes.current.has(currentInputHash)) return;

    if (autoRunTimer.current) clearTimeout(autoRunTimer.current);
    autoRunTimer.current = setTimeout(() => {
      autoRunTimer.current = null;
      attemptedHashes.current.add(currentInputHash);
      void runCouncil();
    }, 1600);

    return () => {
      if (autoRunTimer.current) {
        clearTimeout(autoRunTimer.current);
        autoRunTimer.current = null;
      }
    };
  }, [autoRun, councilReady, councilRun.inputHash, councilRun.status, currentInputHash, runCouncil]);

  if (eligibleIdeas.length === 0) {
    return (
      <section className="presentation-empty">
        <BrainCircuit aria-hidden="true" />
        <h2>No concepts are ready to present</h2>
        <p>Add a title to at least one draft, then return here to start the presentation round.</p>
      </section>
    );
  }

  const recommendedIdea = councilRun.result
    ? eligibleIdeas.find(idea => idea.id === councilRun.result?.recommendedIdeaId)
    : undefined;
  const recommendedOwner = recommendedIdea ? participantById.get(recommendedIdea.ownerId) : undefined;
  const resultsDisagree = Boolean(humanWinner && recommendedIdea && humanWinner.id !== recommendedIdea.id);

  return (
    <motion.section
      className="presentation-screen"
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10, filter: 'blur(5px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: 'blur(4px)' }}
      transition={{ type: 'spring', bounce: 0, duration: reduceMotion ? 0.01 : 0.42 }}
    >
      <header className="presentation-commandbar">
        <div className="presentation-title">
          <div className="presentation-title-icon"><Users /></div>
          <div><h2>Present the field</h2><p>Random order. Every idea gets the room before judgment.</p></div>
        </div>
        <div className="presentation-selector">
          <label htmlFor="presentation-idea">On stage</label>
          <div className="select-shell">
            <select id="presentation-idea" value={selectedIdea?.id || ''} onChange={event => choosePresentation(event.target.value)}>
              {eligibleIdeas.map(idea => {
                const owner = participantById.get(idea.ownerId);
                const state = progress[idea.id]?.status || 'not_started';
                return <option key={idea.id} value={idea.id}>{owner?.name || 'Unknown'} — {idea.title} ({state.replace('_', ' ')})</option>;
              })}
            </select>
            <ChevronDown aria-hidden="true" />
          </div>
        </div>
        <div className="presentation-progress" aria-label={`${completedCount} of ${eligibleIdeas.length} presentations complete`}>
          <strong>{completedCount}/{eligibleIdeas.length}</strong>
          <span>presented</span>
          <div className="progress-track"><span style={{ width: `${(completedCount / eligibleIdeas.length) * 100}%` }} /></div>
        </div>
      </header>

      <div className="presentation-stepper" aria-label="Randomized presentation order and completion">
        {eligibleIdeas.map(idea => {
          const state = progress[idea.id]?.status || 'not_started';
          const owner = participantById.get(idea.ownerId);
          return (
            <button key={idea.id} type="button" onClick={() => choosePresentation(idea.id)} className={state === 'complete' ? 'is-complete' : state === 'presenting' ? 'is-presenting' : ''} aria-current={selectedIdea?.id === idea.id ? 'step' : undefined}>
              <span>{state === 'complete' ? <Check /> : state === 'presenting' ? <Play /> : <Circle />}</span>
              <span><strong>{owner?.name || 'Unknown'}</strong><small>{idea.title}</small></span>
            </button>
          );
        })}
      </div>

      {syncNotice && <div className="council-notice" role="status"><AlertTriangle />{syncNotice}</div>}

      <div className="pitch-stage">
        <article className="pitch-canvas">
          <div className="pitch-owner">
            <span className="pitch-avatar" style={{ '--participant-color': selectedOwner?.color || '#a3a6ff' } as React.CSSProperties}>{selectedOwner?.mood || <Users />}</span>
            <div><span>{selectedOwner?.name || 'Unknown presenter'}</span><small>{selectedIdea?.category} / {currentStatus.replace('_', ' ')}</small></div>
          </div>
          <h3>{selectedIdea?.title}</h3>
          <p className="pitch-statement">{selectedIdea?.pitch || 'No core narrative has been written yet.'}</p>
          <div className="pitch-thesis-grid">
            <div><Target /><span><small>The friction</small>{selectedIdea?.problem || 'Not specified'}</span></div>
            <div><Users /><span><small>First customer</small>{selectedIdea?.targetCustomer || 'Not specified'}</span></div>
            <div><Gauge /><span><small>Revenue engine</small>{selectedIdea?.revenueModel || 'Not specified'}</span></div>
            <div><Sparkles /><span><small>Unfair advantage</small>{selectedIdea?.unfairAdvantage || 'Not specified'}</span></div>
            <div><ShieldAlert /><span><small>Biggest risk</small>{selectedIdea?.biggestRisk || 'Not specified'}</span></div>
            <div><Lightbulb /><span><small>Presenter notes</small>{selectedIdea?.notes || 'No extra notes'}</span></div>
          </div>
        </article>

        <aside className="pitch-control">
          <div>
            <span className="control-status"><span className={`status-dot status-${currentStatus}`} />{currentStatus.replace('_', ' ')}</span>
            <h3>Host controls</h3>
            <p>Track the room here. The council is already working from the saved idea data.</p>
          </div>
          <dl>
            <div><dt>Category</dt><dd>{selectedIdea?.category || 'Other'}</dd></div>
            <div><dt>Launch window</dt><dd>{selectedIdea?.timeToLaunch || 'Unknown'}</dd></div>
            <div><dt>Starting cost</dt><dd>{selectedIdea?.startupCost || 'Unknown'}</dd></div>
            <div><dt>Market size</dt><dd>{selectedIdea?.marketSize || 'Unknown'}</dd></div>
            <div><dt>Founder momentum</dt><dd>{selectedIdea?.excitement || 0}/10</dd></div>
            <div><dt>Build feasibility</dt><dd>{selectedIdea?.feasibility || 0}/10</dd></div>
          </dl>
          {currentStatus === 'not_started' && <button type="button" className="stage-action" onClick={beginPresentation}><Play /> Begin presentation</button>}
          {currentStatus === 'presenting' && <button type="button" className="stage-action" onClick={completePresentation}><Check /> Mark complete</button>}
          {currentStatus === 'complete' && <button type="button" className="stage-action stage-action-complete" onClick={() => persistProgress({ ideaId: selectedIdea!.id, presenterId: selectedIdea!.ownerId, status: 'presenting' })}><RefreshCw /> Present again</button>}
        </aside>
      </div>

      <section className={`council-gate ${councilRun.status === 'complete' && !isStale && allPresented ? 'is-unlocked' : ''}`}>
        <div className="gate-copy">
          <div className="gate-icon">{councilRun.status === 'complete' && !isStale && allPresented ? <BrainCircuit /> : <Scale />}</div>
          <div>
            <h3>{councilRun.status === 'complete' && !isStale ? (allPresented ? 'The council is ready' : 'The council review is sealed') : councilRun.status === 'failed' ? 'The council needs another try' : 'The council is working in the background'}</h3>
            <p>{councilRun.status === 'complete' && !isStale ? (allPresented ? 'Every idea was heard. You can now reveal the independent review.' : `Complete all presentations first — ${completedCount} of ${eligibleIdeas.length} are done.`) : 'It starts from the saved idea data and remains hidden while the room works.'}</p>
          </div>
        </div>
        <div className="council-actions">
          {councilRun.status === 'complete' && councilRun.result && !isStale && allPresented ? (
            <>
              <button type="button" className="council-run-button" onClick={() => setReviewsVisible(visible => !visible)}>
                <Eye /> {reviewsVisible ? 'Hide council reviews' : 'Show council reviews'}
              </button>
              {reviewsVisible && <button type="button" className="council-rerun-button" onClick={() => runCouncil(true)}><RefreshCw /> Run again</button>}
            </>
          ) : councilRun.status === 'complete' && councilRun.result && !isStale ? (
            <button type="button" className="council-run-button" disabled><Users /> {completedCount}/{eligibleIdeas.length} presented</button>
          ) : councilRun.status === 'failed' ? (
            <button type="button" className="council-run-button" disabled={!councilReady} onClick={() => runCouncil(true)}><RefreshCw /> Retry council</button>
          ) : (
            <button type="button" className="council-run-button" disabled>
              {councilRun.status === 'running' || councilReady ? <><LoaderCircle className="spin" /> Preparing council</> : <><BrainCircuit /> Add a titled idea</>}
            </button>
          )}
        </div>
      </section>

      {reviewsVisible && councilRun.status === 'running' && (
        <section className="council-loading" aria-live="polite">
          <div className="deliberation-orbit"><BrainCircuit /><span /><span /></div>
          <div><h3>The room is deliberating</h3><p>Five advisors are comparing the concepts. Next comes anonymous peer review and a chairman synthesis.</p></div>
          <div className="deliberation-steps" aria-label="Council stages"><span>Independent views</span><span>Peer review</span><span>Verdict</span></div>
        </section>
      )}

      {reviewsVisible && councilRun.status === 'failed' && (
        <section className="council-error" role="alert">
          <AlertTriangle />
          <div><h3>The council could not convene</h3><p>{councilRun.error}</p><small>{isConfigured ? <>Keep the host laptop worker running with <code>npm run council:worker</code>.</> : <>Start SparkTank with <code>npm run dev</code> so the local Codex CLI bridge is available.</>}</small></div>
          <button type="button" onClick={() => runCouncil(true)}><RefreshCw /> Retry</button>
        </section>
      )}

      {reviewsVisible && allPresented && !isStale && councilRun.status === 'complete' && councilRun.result && (
        <section className={`council-verdict ${isStale ? 'is-stale' : ''}`} aria-live="polite">
          {isStale && <div className="stale-banner"><AlertTriangle />Concepts changed after this verdict. Run the council again before deciding.</div>}
          <div className="verdict-hero">
            <div className="verdict-mark"><BadgeCheck /></div>
            <div className="verdict-copy">
              <span>Council recommendation</span>
              <h2>{councilRun.result.recommendedIdeaTitle}</h2>
              <p>{councilRun.result.recommendation}</p>
              {recommendedOwner && <div className="verdict-owner"><span style={{ '--participant-color': recommendedOwner.color } as React.CSSProperties}>{recommendedOwner.mood}</span>{recommendedOwner.name}'s concept</div>}
            </div>
            <div className="first-move"><ArrowRight /><span><small>Do this first</small>{councilRun.result.firstAction}</span></div>
          </div>

          <div className="decision-compare">
            <div><span>Group ranking</span><strong>{humanWinner?.title || 'Not scored yet'}</strong><small>{humanWinner ? `${(humanWinner.groupScore || 0).toFixed(1)} average score` : 'Complete scoring to compare'}</small></div>
            <div className="compare-axis"><Scale /><span>{resultsDisagree ? 'Useful disagreement' : humanWinner ? 'Aligned signal' : 'Independent view'}</span></div>
            <div><span>LLM Council</span><strong>{councilRun.result.recommendedIdeaTitle}</strong><small>Independent of human scores</small></div>
          </div>

          <div className="verdict-analysis">
            <div className="synthesis-column">
              <SynthesisList title="Where they agree" icon={Check} items={councilRun.result.agreement} />
              <SynthesisList title="Where they clash" icon={Scale} items={councilRun.result.clashes} />
              <SynthesisList title="Blind spots caught" icon={Eye} items={councilRun.result.blindSpots} />
            </div>
            <div className="advisor-column">
              <div className="advisor-heading"><h3>Five views, kept intact</h3><p>Open any perspective. The Contrarian leads because confidence needs resistance.</p></div>
              {advisorMeta.map(({ key, label, remit, icon: Icon }, index) => (
                <details key={key} className={`advisor-view advisor-${key}`} open={index === 0}>
                  <summary><span className="advisor-icon"><Icon /></span><span><strong>{label}</strong><small>{remit}</small></span><ChevronDown /></summary>
                  <p>{councilRun.result!.advisorViews[key]}</p>
                </details>
              ))}
            </div>
          </div>

          <div className="verdict-footer"><p>The council advises. Your group decides.</p><button type="button" onClick={onViewResults}>Open full group ranking <ArrowRight /></button></div>
        </section>
      )}
    </motion.section>
  );
}

function SynthesisList({ title, icon: Icon, items }: { title: string; icon: typeof Check; items: string[] }) {
  return (
    <section className="synthesis-list">
      <h3><Icon />{title}</h3>
      <ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul>
    </section>
  );
}

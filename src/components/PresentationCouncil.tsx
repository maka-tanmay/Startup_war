import { useEffect, useMemo, useState } from 'react';
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

const SESSION_ID = 'spark-tank-main';
const PROGRESS_STORAGE_KEY = 'spark-tank-presentation-progress-v1';
const RUN_STORAGE_KEY = 'spark-tank-council-run-v1';
const WORKFLOW_VERSION = 'llm-council-v1';

const advisorMeta: Array<{ key: AdvisorKey; label: string; remit: string; icon: typeof ShieldAlert }> = [
  { key: 'contrarian', label: 'Contrarian', remit: 'What could make the favorite fail?', icon: ShieldAlert },
  { key: 'firstPrinciples', label: 'First Principles', remit: 'Are we solving the right problem?', icon: Lightbulb },
  { key: 'expansionist', label: 'Expansionist', remit: 'Where is the overlooked upside?', icon: Telescope },
  { key: 'outsider', label: 'Outsider', remit: 'What is unclear to fresh eyes?', icon: Eye },
  { key: 'executor', label: 'Executor', remit: 'What can we prove and ship first?', icon: Zap }
];

function readStoredProgress(): Record<string, PresentationProgress> {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function readStoredRun(): CouncilRun {
  try {
    const stored = JSON.parse(localStorage.getItem(RUN_STORAGE_KEY) || 'null');
    if (stored?.sessionId === SESSION_ID) return stored;
  } catch {
    // Fall through to a clean local run.
  }
  return { id: '', sessionId: SESSION_ID, status: 'idle', inputHash: '', workflowVersion: WORKFLOW_VERSION };
}

function normalizeProgressRow(row: Record<string, unknown>): PresentationProgress {
  return {
    ideaId: String(row.idea_id || ''),
    presenterId: String(row.presenter_id || ''),
    status: String(row.status || 'not_started') as PresentationStatus,
    completedAt: row.completed_at ? String(row.completed_at) : undefined
  };
}

function normalizeRunRow(row: Record<string, unknown>): CouncilRun {
  return {
    id: String(row.id || ''),
    sessionId: String(row.session_id || SESSION_ID),
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
  ideas: Idea[];
  participants: Participant[];
  isConfigured: boolean;
  onViewResults: () => void;
}

export default function PresentationCouncil({ ideas, participants, isConfigured, onViewResults }: PresentationCouncilProps) {
  const reduceMotion = useReducedMotion();
  const eligibleIdeas = useMemo(() => ideas.filter(idea => idea.title.trim()).sort((a, b) => a.id.localeCompare(b.id)), [ideas]);
  const [selectedIdeaId, setSelectedIdeaId] = useState(() => eligibleIdeas[0]?.id || '');
  const [progress, setProgress] = useState<Record<string, PresentationProgress>>(readStoredProgress);
  const [councilRun, setCouncilRun] = useState<CouncilRun>(readStoredRun);
  const [currentInputHash, setCurrentInputHash] = useState('');
  const [syncNotice, setSyncNotice] = useState('');

  const participantById = useMemo(() => new Map(participants.map(participant => [participant.id, participant])), [participants]);
  const selectedIdea = eligibleIdeas.find(idea => idea.id === selectedIdeaId) || eligibleIdeas[0];
  const selectedOwner = selectedIdea ? participantById.get(selectedIdea.ownerId) : undefined;

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
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    localStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(councilRun));
  }, [councilRun]);

  useEffect(() => {
    let cancelled = false;
    hashInput(conceptInput).then(hash => !cancelled && setCurrentInputHash(hash));
    return () => { cancelled = true; };
  }, [conceptInput]);

  useEffect(() => {
    if (!isConfigured) return;
    let active = true;

    const loadCouncilState = async () => {
      const [progressResponse, runResponse] = await Promise.all([
        supabase.from('presentation_progress').select('*').eq('session_id', SESSION_ID),
        supabase.from('council_runs').select('*').eq('session_id', SESSION_ID).order('started_at', { ascending: false }).limit(1)
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
      if (!runResponse.error && runResponse.data?.[0]) setCouncilRun(normalizeRunRow(runResponse.data[0]));
    };

    loadCouncilState();
    const channel = supabase
      .channel(`council-state-${SESSION_ID}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presentation_progress', filter: `session_id=eq.${SESSION_ID}` }, payload => {
        if (payload.eventType === 'DELETE') return;
        const item = normalizeProgressRow(payload.new as Record<string, unknown>);
        setProgress(previous => ({ ...previous, [item.ideaId]: item }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'council_runs', filter: `session_id=eq.${SESSION_ID}` }, payload => {
        if (payload.eventType !== 'DELETE') setCouncilRun(normalizeRunRow(payload.new as Record<string, unknown>));
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [isConfigured]);

  const completedCount = eligibleIdeas.filter(idea => progress[idea.id]?.status === 'complete').length;
  const allPresented = eligibleIdeas.length > 0 && completedCount === eligibleIdeas.length;
  const hasComparisonField = eligibleIdeas.length >= 2;
  const gateUnlocked = allPresented && hasComparisonField;
  const currentStatus = selectedIdea ? progress[selectedIdea.id]?.status || 'not_started' : 'not_started';
  const isStale = councilRun.status === 'complete' && Boolean(currentInputHash) && councilRun.inputHash !== currentInputHash;
  const councilReady = gateUnlocked && Boolean(currentInputHash);
  const humanWinner = useMemo(() => [...eligibleIdeas]
    .filter(idea => idea.groupScore !== undefined)
    .sort((a, b) => (b.groupScore || 0) - (a.groupScore || 0))[0], [eligibleIdeas]);

  const persistProgress = async (item: PresentationProgress) => {
    setProgress(previous => ({ ...previous, [item.ideaId]: item }));
    if (!isConfigured) return;
    const { error } = await supabase.from('presentation_progress').upsert({
      session_id: SESSION_ID,
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

  const runCouncil = async () => {
    if (!councilReady) return;
    const startedAt = new Date().toISOString();
    const running: CouncilRun = {
      id: `council-${currentInputHash.slice(0, 16)}`,
      sessionId: SESSION_ID,
      status: 'running',
      inputHash: currentInputHash,
      workflowVersion: WORKFLOW_VERSION,
      startedAt
    };
    await persistRun(running);
    setSyncNotice('');

    try {
      const response = await fetch(import.meta.env.VITE_COUNCIL_ENDPOINT || '/api/council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: SESSION_ID, inputHash: currentInputHash, concepts: conceptInput })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'The CLI council runner did not complete.');
      await persistRun({
        ...running,
        status: 'complete',
        completedAt: payload.completedAt || new Date().toISOString(),
        result: payload.result as CouncilResult
      });
    } catch (error) {
      await persistRun({
        ...running,
        status: 'failed',
        error: error instanceof Error ? error.message : 'The council run failed.'
      });
    }
  };

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
          <div><h2>Present the field</h2><p>Every voice first. Council judgment second.</p></div>
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

      <div className="presentation-stepper" aria-label="Presentation completion">
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
          </div>
        </article>

        <aside className="pitch-control">
          <div>
            <span className="control-status"><span className={`status-dot status-${currentStatus}`} />{currentStatus.replace('_', ' ')}</span>
            <h3>Host controls</h3>
            <p>Keep the council locked until every concept has had the room.</p>
          </div>
          <dl>
            <div><dt>Launch window</dt><dd>{selectedIdea?.timeToLaunch || 'Unknown'}</dd></div>
            <div><dt>Starting cost</dt><dd>{selectedIdea?.startupCost || 'Unknown'}</dd></div>
            <div><dt>Market</dt><dd>{selectedIdea?.marketSize || 'Unknown'}</dd></div>
          </dl>
          {currentStatus === 'not_started' && <button type="button" className="stage-action" onClick={beginPresentation}><Play /> Begin presentation</button>}
          {currentStatus === 'presenting' && <button type="button" className="stage-action" onClick={completePresentation}><Check /> Mark complete</button>}
          {currentStatus === 'complete' && <button type="button" className="stage-action stage-action-complete" onClick={() => persistProgress({ ideaId: selectedIdea!.id, presenterId: selectedIdea!.ownerId, status: 'presenting' })}><RefreshCw /> Present again</button>}
        </aside>
      </div>

      <section className={`council-gate ${gateUnlocked ? 'is-unlocked' : ''}`}>
        <div className="gate-copy">
          <div className="gate-icon">{gateUnlocked ? <BrainCircuit /> : <Scale />}</div>
          <div>
            <h3>{gateUnlocked ? 'The council is unlocked' : allPresented ? 'The council needs another concept' : `${eligibleIdeas.length - completedCount} presentation${eligibleIdeas.length - completedCount === 1 ? '' : 's'} before judgment`}</h3>
            <p>{gateUnlocked ? 'Five independent advisors, anonymous peer review, then one chairman verdict.' : allPresented ? 'Add one more titled concept so the council has a real decision to compare.' : 'The result stays hidden so later presenters are not anchored by an early favorite.'}</p>
          </div>
        </div>
        <button type="button" className="council-run-button" disabled={!councilReady || councilRun.status === 'running'} onClick={runCouncil}>
          {councilRun.status === 'running' ? <><LoaderCircle className="spin" /> Council deliberating</> : councilRun.status === 'complete' && !isStale ? <><RefreshCw /> Run council again</> : <><BrainCircuit /> Run LLM Council</>}
        </button>
      </section>

      {councilRun.status === 'running' && (
        <section className="council-loading" aria-live="polite">
          <div className="deliberation-orbit"><BrainCircuit /><span /><span /></div>
          <div><h3>The room is deliberating</h3><p>Five advisors are comparing the concepts. Next comes anonymous peer review and a chairman synthesis.</p></div>
          <div className="deliberation-steps" aria-label="Council stages"><span>Independent views</span><span>Peer review</span><span>Verdict</span></div>
        </section>
      )}

      {councilRun.status === 'failed' && (
        <section className="council-error" role="alert">
          <AlertTriangle />
          <div><h3>The council could not convene</h3><p>{councilRun.error}</p><small>Start SparkTank with <code>npm run dev</code> so the local Codex CLI bridge is available.</small></div>
          <button type="button" onClick={runCouncil}><RefreshCw /> Retry</button>
        </section>
      )}

      {gateUnlocked && councilRun.status === 'complete' && councilRun.result && (
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

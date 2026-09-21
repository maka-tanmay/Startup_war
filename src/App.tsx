import React, { lazy, Suspense, useState, useMemo, useEffect } from 'react';
import { Participant, Idea, IdeaRating, marketSizes } from './data/mockData';
import { guideIdeas, guideParticipants, guideRatings } from './data/guideDemo';
import type { RoomSummary } from './types/room';
import { supabase } from './lib/supabase';
import { Rocket, Users, ChevronRight, Star, Trophy, Target, DollarSign, Clock, CheckCircle2, ChevronLeft, Zap, Sparkles, BrainCircuit, TrendingUp, Search, ShieldAlert, BadgeCheck, Coins, LayoutGrid, ArrowRight, MousePointer2, MessageSquare, Info, X, Lightbulb, BarChart3, Workflow, Plus, Trash2, Database, Save, RotateCcw, Wifi, WifiOff, Globe, AlertTriangle, ExternalLink, Terminal, UserPlus, Pencil, CircleHelp } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const PresentationCouncil = lazy(() => import('./components/PresentationCouncil'));

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Screen = 'LOBBY' | 'BRAINSTORM' | 'VOTE' | 'PRESENT' | 'SUMMARY';

const DEFAULT_ROOM_ID = 'room-1';
const ROOMS_STORAGE_KEY = 'spark-tank-rooms-v1';
const ACTIVE_ROOM_STORAGE_KEY = 'spark-tank-active-room-v1';
const MAX_FRIENDS = 4;
const participantColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
const participantMoods = ['🔥', '🚀', '💡', '✨', '🎯', '⚡', '🌱'];

const roomStorageKey = (roomId: string, collection: 'ideas' | 'participants' | 'ratings') => `spark-tank-room:${roomId}:${collection}`;

function defaultRoom(): RoomSummary {
  const timestamp = new Date().toISOString();
  return { id: DEFAULT_ROOM_ID, name: 'Room 1', createdAt: timestamp, updatedAt: timestamp, participantCount: 0, ideaCount: 0 };
}

function normalizeRoomRow(row: Record<string, unknown>): RoomSummary {
  return {
    id: String(row.id || DEFAULT_ROOM_ID),
    name: String(row.name || 'Untitled room'),
    createdAt: String(row.created_at || row.createdAt || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.updatedAt || new Date().toISOString()),
    participantCount: Number(row.participant_count || row.participantCount || 0),
    ideaCount: Number(row.idea_count || row.ideaCount || 0)
  };
}

function normalizeRatingRow(row: Record<string, unknown>, fallbackSessionId = DEFAULT_ROOM_ID): IdeaRating {
  return {
    sessionId: String(row.session_id || row.sessionId || fallbackSessionId),
    ideaId: String(row.idea_id || row.ideaId || ''),
    participantId: String(row.participant_id || row.participantId || ''),
    problem: Number(row.problem || 0),
    market: Number(row.market || 0),
    differentiation: Number(row.differentiation || 0),
    feasibility: Number(row.feasibility || 0),
    comment: row.comment ? String(row.comment) : undefined,
    updatedAt: String(row.updated_at || row.updatedAt || new Date().toISOString())
  };
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function getGuideStage(): Screen {
  const stage = new URLSearchParams(window.location.search).get('stage');
  if (stage === 'draft') return 'BRAINSTORM';
  if (stage === 'review') return 'VOTE';
  if (stage === 'present') return 'PRESENT';
  if (stage === 'scores') return 'SUMMARY';
  return 'LOBBY';
}

// --- SEPARATE HEADER COMPONENT ---
const Header = ({ currentScreen, setCurrentScreen, activeParticipant, dbConnected, isConfigured }: any) => {
  const navItems = [
    { id: 'LOBBY', label: 'Lobby', shortLabel: 'Lobby' },
    { id: 'BRAINSTORM', label: 'Drafting', shortLabel: 'Draft' },
    { id: 'VOTE', label: 'Review', shortLabel: 'Review' },
    { id: 'PRESENT', label: 'Present', shortLabel: 'Present' },
    { id: 'SUMMARY', label: 'Scoreboard', shortLabel: 'Scores' }
  ];

  return (
    <header className="app-header">
      <button type="button" className="brand-lockup" onClick={() => setCurrentScreen('LOBBY')} aria-label="Open roster">
        <div className="brand-mark">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="brand-copy">
          <h1>SparkTank</h1>
          <p>Live idea room</p>
        </div>
      </button>

      <nav className="stage-nav" aria-label="Session stages">
        {navItems.map((item, index) => (
          <button
            key={item.id}
            onClick={() => setCurrentScreen(item.id as Screen)}
            className={cn("stage-link", currentScreen === item.id && "is-active")}
            aria-current={currentScreen === item.id ? 'step' : undefined}
          >
            <span className="stage-index">{index + 1}</span>
            <span className="stage-label"><span className="stage-label-long">{item.label}</span><span className="stage-label-short">{item.shortLabel}</span></span>
            {currentScreen === item.id && (
              <motion.div
                layoutId="active-stage"
                className="stage-highlight"
                transition={{ type: 'spring', bounce: 0, duration: 0.28 }}
              />
            )}
          </button>
        ))}
      </nav>

      <div className="header-session">
        <a className="guide-link" href="/guide.html" aria-label="Open how-to guide"><CircleHelp /><span>How to use</span></a>
        <div className={cn("sync-indicator", isConfigured && dbConnected ? "is-online" : "is-local")} title={isConfigured ? (dbConnected ? 'Shared sync is active' : 'Shared sync is offline') : 'Using local storage'}>
          <span className="sync-dot" />
          <span>{isConfigured ? (dbConnected ? 'Live' : 'Offline') : 'Local'}</span>
        </div>
        {activeParticipant && (
          <div className="active-person">
            <div className="active-person-copy">
              <span>{activeParticipant.name}</span>
              <small>Active</small>
            </div>
            <div className="active-person-avatar" style={{ '--participant-color': activeParticipant.color } as React.CSSProperties}>{activeParticipant.mood}</div>
          </div>
        )}
      </div>
    </header>
  );
};

export default function App() {
  const guideMode = new URLSearchParams(window.location.search).get('guide') === '1';
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => guideMode ? getGuideStage() : 'LOBBY');
  const [activeParticipant, setActiveParticipant] = useState<Participant | null>(() => guideMode ? guideParticipants[0] : null);
  const [ideas, setIdeas] = useState<Idea[]>(() => guideMode ? guideIdeas : []);
  const [participants, setParticipants] = useState<Participant[]>(() => guideMode ? guideParticipants : []);
  const [ratings, setRatings] = useState<IdeaRating[]>(() => guideMode ? guideRatings : []);
  const [rooms, setRooms] = useState<RoomSummary[]>(() => guideMode ? [{ ...defaultRoom(), id: 'guide-room', name: 'Room 1', participantCount: 4, ideaCount: 2 }] : [defaultRoom()]);
  const [activeRoomId, setActiveRoomId] = useState(() => guideMode ? 'guide-room' : localStorage.getItem(ACTIVE_ROOM_STORAGE_KEY) || DEFAULT_ROOM_ID);
  const [votingIndex, setVotingIndex] = useState(0);
  const [dbConnected, setDbConnected] = useState(false);
  const [isConfigured, setIsConfigured] = useState(() => !guideMode && Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'YOUR_SUPABASE_URL'));
  const [hasLoadedData, setHasLoadedData] = useState(false);

  const activeRoom = rooms.find(room => room.id === activeRoomId) || rooms[0];

  // Detect shared mode. The guide uses stable demo data and never writes to storage.
  useEffect(() => {
    if (guideMode) {
      setHasLoadedData(true);
      return;
    }
    const isMock = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'YOUR_SUPABASE_URL';
    setIsConfigured(!isMock);
  }, [guideMode]);

  // Load one room at a time in local preview mode. Legacy data becomes Room 1.
  useEffect(() => {
    if (guideMode || isConfigured) return;
    setHasLoadedData(false);

    let storedRooms = readJson<RoomSummary[]>(ROOMS_STORAGE_KEY, []);
    if (storedRooms.length === 0) storedRooms = [defaultRoom()];

    const scopedIdeasKey = roomStorageKey(activeRoomId, 'ideas');
    const scopedParticipantsKey = roomStorageKey(activeRoomId, 'participants');
    const scopedRatingsKey = roomStorageKey(activeRoomId, 'ratings');
    if (activeRoomId === DEFAULT_ROOM_ID && !localStorage.getItem(scopedIdeasKey)) {
      const legacyIdeas = readJson<Idea[]>('spark-tank-ideas-local', []);
      const legacyParticipants = readJson<Participant[]>('spark-tank-participants-local', []);
      const legacyRatings = readJson<IdeaRating[]>('spark-tank-ratings-local', []);
      localStorage.setItem(scopedIdeasKey, JSON.stringify(legacyIdeas));
      localStorage.setItem(scopedParticipantsKey, JSON.stringify(legacyParticipants));
      localStorage.setItem(scopedRatingsKey, JSON.stringify(legacyRatings.map(rating => ({ ...rating, sessionId: DEFAULT_ROOM_ID }))));
    }

    const nextIdeas = readJson<Idea[]>(scopedIdeasKey, []);
    const nextParticipants = readJson<Participant[]>(scopedParticipantsKey, []);
    const nextRatings = readJson<IdeaRating[]>(scopedRatingsKey, []).map(rating => ({ ...rating, sessionId: activeRoomId }));
    const roomExists = storedRooms.some(room => room.id === activeRoomId);
    if (!roomExists) {
      storedRooms = [...storedRooms, { ...defaultRoom(), id: activeRoomId, name: `Room ${storedRooms.length + 1}` }];
    }
    const nextRooms = storedRooms.map(room => room.id === activeRoomId
      ? { ...room, participantCount: nextParticipants.length, ideaCount: nextIdeas.length }
      : room);

    setRooms(nextRooms);
    setIdeas(nextIdeas);
    setParticipants(nextParticipants);
    setRatings(nextRatings);
    setHasLoadedData(true);
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(nextRooms));
  }, [activeRoomId, guideMode, isConfigured]);

  // --- SUPABASE SYNC ENGINE ---
  useEffect(() => {
    if (!isConfigured || guideMode) return;
    setHasLoadedData(false);

    const fetchData = async () => {
      try {
        const [{ data: roomsData, error: roomsError }, { data: ideasData }, { data: partsData }, { data: ratingsData, error: ratingsError }] = await Promise.all([
          supabase.from('rooms').select('*').order('created_at', { ascending: true }),
          supabase.from('ideas').select('*').eq('room_id', activeRoomId),
          supabase.from('participants').select('*').eq('room_id', activeRoomId),
          supabase.from('idea_ratings').select('*').eq('session_id', activeRoomId)
        ]);

        if (!roomsError) {
          let nextRooms = (roomsData || []).map(row => normalizeRoomRow(row));
          if (nextRooms.length === 0) {
            const room = defaultRoom();
            await supabase.from('rooms').upsert({ id: room.id, name: room.name, participant_count: 0, idea_count: 0, created_at: room.createdAt, updated_at: room.updatedAt });
            nextRooms = [room];
          }
          setRooms(nextRooms);
        }
        setIdeas(ideasData || []);
        setParticipants((partsData || []).sort((a, b) => a.id.localeCompare(b.id)));
        if (!ratingsError) setRatings((ratingsData || []).map(row => normalizeRatingRow(row, activeRoomId)));
        setDbConnected(true);
      } catch (err) {
        setDbConnected(false);
      } finally {
        setHasLoadedData(true);
      }
    };

    fetchData();

    // Ideas Subscription
    const ideasChannel = supabase
      .channel(`ideas-changes-${activeRoomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ideas', filter: `room_id=eq.${activeRoomId}` }, (payload) => {
        if (payload.eventType === 'INSERT') setIdeas(prev => prev.some(idea => idea.id === payload.new.id) ? prev : [...prev, payload.new as Idea]);
        else if (payload.eventType === 'UPDATE') setIdeas(prev => prev.map(id => id.id === payload.new.id ? payload.new as Idea : id));
        else if (payload.eventType === 'DELETE') setIdeas(prev => prev.filter(id => id.id !== payload.old.id));
      })
      .subscribe();

    // Participants Subscription
    const partsChannel = supabase
      .channel(`parts-changes-${activeRoomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${activeRoomId}` }, (payload) => {
        if (payload.eventType === 'INSERT') setParticipants(prev => prev.some(participant => participant.id === payload.new.id) ? prev : [...prev, payload.new as Participant].sort((a, b) => a.id.localeCompare(b.id)));
        else if (payload.eventType === 'UPDATE') setParticipants(prev => prev.map(p => p.id === payload.new.id ? payload.new as Participant : p).sort((a, b) => a.id.localeCompare(b.id)));
        else if (payload.eventType === 'DELETE') setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    const ratingsChannel = supabase
      .channel(`idea-ratings-changes-${activeRoomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'idea_ratings', filter: `session_id=eq.${activeRoomId}` }, payload => {
        if (payload.eventType === 'DELETE') {
          setRatings(previous => previous.filter(rating => !(rating.ideaId === payload.old.idea_id && rating.participantId === payload.old.participant_id)));
          return;
        }
        const next = normalizeRatingRow(payload.new as Record<string, unknown>, activeRoomId);
        setRatings(previous => [...previous.filter(rating => !(rating.ideaId === next.ideaId && rating.participantId === next.participantId)), next]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ideasChannel);
      supabase.removeChannel(partsChannel);
      supabase.removeChannel(ratingsChannel);
    };
  }, [activeRoomId, guideMode, isConfigured]);

  // Persist the current room and update its history card.
  useEffect(() => {
    if (guideMode || !hasLoadedData) return;
    const updatedAt = new Date().toISOString();
    const nextRooms = rooms.map(room => room.id === activeRoomId
      ? { ...room, participantCount: participants.length, ideaCount: ideas.length, updatedAt }
      : room);
    setRooms(previous => previous.map(room => room.id === activeRoomId
      ? { ...room, participantCount: participants.length, ideaCount: ideas.length, updatedAt }
      : room));

    if (!isConfigured) {
      localStorage.setItem(roomStorageKey(activeRoomId, 'ideas'), JSON.stringify(ideas));
      localStorage.setItem(roomStorageKey(activeRoomId, 'participants'), JSON.stringify(participants));
      localStorage.setItem(roomStorageKey(activeRoomId, 'ratings'), JSON.stringify(ratings));
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(nextRooms));
      return;
    }
    void supabase.from('rooms').update({ participant_count: participants.length, idea_count: ideas.length, updated_at: updatedAt }).eq('id', activeRoomId);
  }, [ideas, participants, ratings, activeRoomId, guideMode, isConfigured, hasLoadedData]);

  useEffect(() => {
    if (!activeParticipant) return;
    const latestParticipant = participants.find(participant => participant.id === activeParticipant.id);
    if (!latestParticipant) setActiveParticipant(null);
    else if (latestParticipant !== activeParticipant) setActiveParticipant(latestParticipant);
  }, [participants, activeParticipant?.id]);

  const switchRoom = (roomId: string) => {
    if (roomId === activeRoomId) return;
    setHasLoadedData(false);
    setActiveParticipant(null);
    setVotingIndex(0);
    setCurrentScreen('LOBBY');
    setActiveRoomId(roomId);
    localStorage.setItem(ACTIVE_ROOM_STORAGE_KEY, roomId);
  };

  const createRoom = async () => {
    const now = new Date().toISOString();
    const room: RoomSummary = {
      id: `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: `Room ${rooms.length + 1}`,
      createdAt: now,
      updatedAt: now,
      participantCount: 0,
      ideaCount: 0
    };

    if (isConfigured) {
      const { error } = await supabase.from('rooms').insert({
        id: room.id,
        name: room.name,
        participant_count: 0,
        idea_count: 0,
        created_at: room.createdAt,
        updated_at: room.updatedAt
      });
      if (error) {
        window.alert('Could not create the room. Apply the rooms migration, then try again.');
        return;
      }
    } else {
      localStorage.setItem(roomStorageKey(room.id, 'ideas'), '[]');
      localStorage.setItem(roomStorageKey(room.id, 'participants'), '[]');
      localStorage.setItem(roomStorageKey(room.id, 'ratings'), '[]');
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify([...rooms, room]));
    }

    setRooms(previous => [...previous, room]);
    switchRoom(room.id);
  };

  const addMember = async (name: string) => {
    const rosterIndex = participants.length;
    const newMember: Participant = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      color: participantColors[rosterIndex % participantColors.length],
      mood: participantMoods[rosterIndex % participantMoods.length],
      ideasLogged: 0
    };

    setParticipants(prev => [...prev, newMember]);
    if (isConfigured) {
      await supabase.from('participants').insert([{ ...newMember, room_id: activeRoomId }]);
    }
  };

  const updateMember = async (updated: Participant) => {
    setParticipants(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (isConfigured) {
      await supabase.from('participants').update(updated).eq('id', updated.id).eq('room_id', activeRoomId);
    }
  };

  const removeMember = async (member: Participant) => {
    const memberIdeas = ideas.filter(idea => idea.ownerId === member.id);
    const message = memberIdeas.length > 0
      ? `Remove ${member.name} and their ${memberIdeas.length} concept${memberIdeas.length === 1 ? '' : 's'}? This cannot be undone.`
      : `Remove ${member.name} from this session?`;

    if (!window.confirm(message)) return;

    if (isConfigured) {
      if (memberIdeas.length > 0) {
        await supabase.from('idea_ratings').delete().eq('session_id', activeRoomId).in('idea_id', memberIdeas.map(idea => idea.id));
        const { error: ideasError } = await supabase.from('ideas').delete().eq('ownerId', member.id).eq('room_id', activeRoomId);
        if (ideasError) {
          window.alert(`Could not remove ${member.name}'s concepts. Please try again.`);
          return;
        }
      }
      await supabase.from('idea_ratings').delete().eq('session_id', activeRoomId).eq('participant_id', member.id);
      const { error: memberError } = await supabase.from('participants').delete().eq('id', member.id).eq('room_id', activeRoomId);
      if (memberError) {
        window.alert(`Could not remove ${member.name}. Please try again.`);
        return;
      }
    }

    setIdeas(prev => prev.filter(idea => idea.ownerId !== member.id));
    setParticipants(prev => prev.filter(participant => participant.id !== member.id));
    setRatings(prev => prev.filter(rating => rating.participantId !== member.id && !memberIdeas.some(idea => idea.id === rating.ideaId)));
    if (activeParticipant?.id === member.id) setActiveParticipant(null);
  };

  const addIdea = async (ownerId: string) => {
    const newIdea: Idea = {
      id: Math.random().toString(36).substr(2, 9),
      ownerId,
      title: '',
      pitch: '',
      category: 'Tech',
      problem: '',
      targetCustomer: '',
      revenueModel: '',
      startupCost: '',
      timeToLaunch: '',
      marketSize: 'Medium',
      unfairAdvantage: '',
      biggestRisk: '',
      notes: '',
      excitement: 5,
      feasibility: 5
    };
    
    setIdeas(prev => [...prev, newIdea]);
    if (isConfigured) {
      await supabase.from('ideas').insert([{ ...newIdea, room_id: activeRoomId }]);
    }
  };

  const removeIdea = async (id: string) => {
    setIdeas(prev => prev.filter(i => i.id !== id));
    setRatings(prev => prev.filter(rating => rating.ideaId !== id));
    if (isConfigured) {
      await supabase.from('idea_ratings').delete().eq('session_id', activeRoomId).eq('idea_id', id);
      await supabase.from('ideas').delete().eq('id', id).eq('room_id', activeRoomId);
    }
  };

  const updateIdea = async (updatedIdea: Idea) => {
    setIdeas(prev => prev.map(id => id.id === updatedIdea.id ? updatedIdea : id));
    if (isConfigured) {
      await supabase.from('ideas').update(updatedIdea).eq('id', updatedIdea.id).eq('room_id', activeRoomId);
    }
  };

  const handleDetailedVote = async (ideaId: string, scores: Omit<IdeaRating, 'sessionId' | 'ideaId' | 'participantId' | 'comment' | 'updatedAt'>, commentText: string) => {
    if (!activeParticipant) return;
    const rating: IdeaRating = {
      sessionId: activeRoomId,
      ideaId,
      participantId: activeParticipant.id,
      ...scores,
      comment: commentText.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    setRatings(previous => [...previous.filter(item => !(item.ideaId === ideaId && item.participantId === activeParticipant.id)), rating]);

    if (isConfigured) {
      await supabase.from('idea_ratings').upsert({
        session_id: rating.sessionId,
        idea_id: rating.ideaId,
        participant_id: rating.participantId,
        problem: rating.problem,
        market: rating.market,
        differentiation: rating.differentiation,
        feasibility: rating.feasibility,
        comment: rating.comment || null,
        updated_at: rating.updatedAt
      }, { onConflict: 'session_id,idea_id,participant_id' });
    }
    
    setVotingIndex(prev => (prev + 1) % reviewIdeas.length);
  };

  const clearSession = async () => {
    if (window.confirm(`Clear the ideas, ratings, and presentation results in ${activeRoom?.name || 'this room'}? Your other rooms and this roster will stay saved.`)) {
      if (isConfigured) {
        await Promise.all([
          supabase.from('ideas').delete().eq('room_id', activeRoomId),
          supabase.from('idea_ratings').delete().eq('session_id', activeRoomId),
          supabase.from('presentation_progress').delete().eq('session_id', activeRoomId),
          supabase.from('council_runs').delete().eq('session_id', activeRoomId)
        ]);
      } else {
        setIdeas([]);
      }
      localStorage.removeItem(`spark-tank-room:${activeRoomId}:presentation-progress`);
      localStorage.removeItem(`spark-tank-room:${activeRoomId}:council-run`);
      localStorage.removeItem(roomStorageKey(activeRoomId, 'ratings'));
      setRatings([]);
      setVotingIndex(0);
      setCurrentScreen('LOBBY');
    }
  };

  const reviewIdeas = useMemo(() => [...ideas]
    .filter(idea => idea.title)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(idea => {
      const ideaRatings = ratings.filter(rating => rating.ideaId === idea.id);
      if (ideaRatings.length === 0) return { ...idea, ratingCount: 0 };
      const average = (field: 'problem' | 'market' | 'differentiation' | 'feasibility') => ideaRatings.reduce((sum, rating) => sum + rating[field], 0) / ideaRatings.length;
      const scores = {
        problem: average('problem'),
        market: average('market'),
        differentiation: average('differentiation'),
        feasibility: average('feasibility')
      };
      return {
        ...idea,
        scores,
        ratingCount: ideaRatings.length,
        groupScore: (scores.problem + scores.market + scores.differentiation + scores.feasibility) / 4,
        comments: ideaRatings.filter(rating => rating.comment).map(rating => ({ text: rating.comment!, authorId: rating.participantId }))
      };
    }), [ideas, ratings]);

  return (
    <div className={cn("app-shell", guideMode && "guide-capture")}>
      <a href="#main-content" className="skip-link">Skip to workspace</a>
      <div className="bg-pattern-dots" aria-hidden="true" />
      <Header currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} activeParticipant={activeParticipant} dbConnected={dbConnected} isConfigured={isConfigured} />

      {!isConfigured && currentScreen === 'LOBBY' && (
        <div className="local-notice" role="status">
          <WifiOff className="w-4 h-4" />
          <span>Local preview — the deployed app can sync shared rooms.</span>
        </div>
      )}

      <main id="main-content" className="app-main">
        <AnimatePresence mode="wait">
          {currentScreen === 'LOBBY' && (
            <Lobby key="lobby" rooms={rooms} activeRoomId={activeRoomId} onSwitchRoom={switchRoom} onCreateRoom={createRoom} onStart={() => activeParticipant && setCurrentScreen('BRAINSTORM')} activeParticipant={activeParticipant} onClaimSeat={setActiveParticipant} onReset={clearSession} hasData={ideas.length > 0} ideaCount={ideas.length} participants={participants} onAddMember={addMember} onUpdateMember={updateMember} onRemoveMember={removeMember} isLoading={!hasLoadedData} />
          )}
          {currentScreen === 'BRAINSTORM' && (
            <Brainstorm key="brainstorm" activeParticipant={activeParticipant} ideas={ideas.filter(i => i.ownerId === activeParticipant?.id)} onUpdateIdea={updateIdea} onAddIdea={addIdea} onRemoveIdea={removeIdea} />
          )}
          {currentScreen === 'VOTE' && (
            <Vote key="vote" ideas={reviewIdeas} currentIndex={votingIndex} onVote={handleDetailedVote} onNext={() => setVotingIndex(prev => (prev + 1) % reviewIdeas.length)} onPrev={() => setVotingIndex(prev => (prev - 1 + reviewIdeas.length) % reviewIdeas.length)} participants={participants} ratings={ratings} activeParticipant={activeParticipant} />
          )}
          {currentScreen === 'SUMMARY' && (
            <Summary key="summary" ideas={reviewIdeas} participants={participants} />
          )}
        </AnimatePresence>

        <div className={cn("council-surface", currentScreen !== 'PRESENT' && "is-background")} aria-hidden={currentScreen !== 'PRESENT'}>
          <Suspense fallback={currentScreen === 'PRESENT' ? <section className="presentation-empty" role="status"><BrainCircuit /><h2>Opening the decision room</h2><p>Loading the presentation controls and council workspace.</p></section> : null}>
            <PresentationCouncil key={activeRoomId} sessionId={activeRoomId} ideas={reviewIdeas} participants={participants} isConfigured={isConfigured} autoRun={!guideMode} demoMode={guideMode} onViewResults={() => setCurrentScreen('SUMMARY')} />
          </Suspense>
        </div>
      </main>

      <footer className="app-footer">
        <div><Database className="w-3.5 h-3.5" /><span>{isConfigured ? 'Shared room' : 'Local room'}</span></div>
        <span>SparkTank / 1.5</span>
      </footer>
    </div>
  );
}

// --- LOBBY SCREEN ---

function Lobby({ rooms, activeRoomId, onSwitchRoom, onCreateRoom, onStart, activeParticipant, onClaimSeat, onReset, hasData, ideaCount, participants, onAddMember, onUpdateMember, onRemoveMember, isLoading }: any) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');
  const [editName, setEditName] = useState('');
  const [editMood, setEditMood] = useState('');
  const [editError, setEditError] = useState('');
  const reduceMotion = useReducedMotion();

  const submitNewMember = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = newName.trim();

    if (!trimmedName) {
      setNameError('Enter a name first.');
      return;
    }
    if (participants.length >= MAX_FRIENDS) {
      setNameError('This session is full: four friends are already in.');
      return;
    }
    if (participants.some((participant: Participant) => participant.name.toLowerCase() === trimmedName.toLowerCase())) {
      setNameError('That person is already in the roster.');
      return;
    }

    await onAddMember(trimmedName);
    setNewName('');
    setNameError('');
  };

  const openEditor = (participant: Participant) => {
    setEditingId(participant.id);
    setEditName(participant.name);
    setEditMood(participant.mood);
    setEditError('');
  };

  const saveMember = async (participant: Participant) => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError('Name cannot be empty.');
      return;
    }
    if (participants.some((candidate: Participant) => candidate.id !== participant.id && candidate.name.toLowerCase() === trimmedName.toLowerCase())) {
      setEditError('That name is already in the roster.');
      return;
    }
    await onUpdateMember({ ...participant, name: trimmedName, mood: editMood.trim() || participant.mood });
    setEditingId(null);
    setEditError('');
  };

  return (
    <motion.section
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, filter: 'blur(3px)' }}
      transition={{ type: 'spring', bounce: 0, duration: reduceMotion ? 0.01 : 0.36 }}
      className="lobby-screen"
    >
      <div className="room-bar" aria-label="Saved rooms">
        <div className="room-picker">
          <label htmlFor="active-room">Saved room</label>
          <div className="room-select-shell">
            <select id="active-room" value={activeRoomId} onChange={(event) => onSwitchRoom(event.target.value)}>
              {rooms.map((room: RoomSummary) => (
                <option key={room.id} value={room.id}>{room.name} · {room.participantCount} friends · {room.ideaCount} ideas</option>
              ))}
            </select>
            <ChevronRight aria-hidden="true" />
          </div>
        </div>
        <p>Each room keeps its own friends, drafts, ratings, presentations, and council result.</p>
        <button type="button" className="new-room-button" onClick={onCreateRoom}><Plus className="w-4 h-4" /> New room</button>
      </div>

      <div className="lobby-hero">
        <div className="lobby-intro">
          <p className="lobby-kicker">{hasData ? 'Session restored' : 'Start a session'}</p>
          <h2>Set Your<br/><span>Roster</span></h2>
          <p>Add the four friends, then choose your own seat to start drafting.</p>
          <div className="session-readout" aria-label="Session summary">
            <div><strong>{participants.length}</strong><span>{participants.length === 1 ? 'person' : 'people'}</span></div>
            <div><strong>{ideaCount}</strong><span>{ideaCount === 1 ? 'concept' : 'concepts'}</span></div>
            <div><strong>5</strong><span>stages</span></div>
          </div>
        </div>

        <form onSubmit={submitNewMember} className="roster-console">
          <div className="console-heading">
            <div className="console-icon"><UserPlus className="w-5 h-5" /></div>
            <div>
              <h3>Add someone to the room</h3>
              <p>Four friends share one room and one final scoreboard.</p>
            </div>
          </div>
          <label htmlFor="participant-name">Participant name</label>
          <div className={cn("name-entry", nameError && "has-error")}>
            <input
              id="participant-name"
              type="text"
              value={newName}
              maxLength={40}
              disabled={participants.length >= MAX_FRIENDS}
              onChange={(event) => {
                setNewName(event.target.value);
                if (nameError) setNameError('');
              }}
              placeholder="e.g. Maya"
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? 'participant-name-error' : 'participant-name-help'}
            />
            <button type="submit" aria-label="Add person" disabled={participants.length >= MAX_FRIENDS}><ArrowRight className="w-5 h-5" /></button>
          </div>
          {nameError
            ? <p id="participant-name-error" className="field-message error-message"><AlertTriangle className="w-3.5 h-3.5" />{nameError}</p>
            : <p id="participant-name-help" className="field-message">{participants.length >= MAX_FRIENDS ? 'All four seats are filled.' : 'Press Enter to add another friend.'}</p>
          }
        </form>
      </div>

      <div className="roster-section">
        <div className="roster-heading">
          <div>
            <h3>Who’s in?</h3>
            <p>{activeParticipant ? `${activeParticipant.name} is ready to draft.` : 'Select your name when the roster is ready.'}</p>
          </div>
          <span className="roster-count">{participants.length} / {MAX_FRIENDS}</span>
        </div>

        {isLoading ? (
          <div className="roster-grid" aria-label="Loading roster" aria-busy="true">
            {[0, 1, 2].map(index => <div key={index} className="seat-skeleton"><span /><span /><span /></div>)}
          </div>
        ) : participants.length === 0 ? (
          <div className="roster-empty">
            <div className="empty-orbit"><Users className="w-7 h-7" /></div>
            <div><h3>The table is open</h3><p>Add the first person above. No preset names, no cleanup.</p></div>
          </div>
        ) : (
          <div className="roster-grid">
            <AnimatePresence initial={false}>
              {participants.map((participant: Participant, index: number) => {
                const isActive = activeParticipant?.id === participant.id;
                return (
                  <motion.article
                    layout
                    key={participant.id}
                    initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, filter: 'blur(3px)' }}
                    transition={{ type: 'spring', bounce: 0, duration: reduceMotion ? 0.01 : Math.min(0.24 + index * 0.025, 0.38) }}
                    className={cn("roster-seat", isActive && "is-active")}
                    onClick={() => editingId !== participant.id && onClaimSeat(participant)}
                  >
                    {isActive && <motion.div layoutId="active-seat" className="active-seat-light" transition={{ type: 'spring', bounce: 0, duration: 0.28 }} />}
                    <div className="seat-topline">
                      <div className="seat-avatar" style={{ '--participant-color': participant.color } as React.CSSProperties}>{participant.mood}</div>
                      <div className="seat-actions">
                        <button type="button" aria-label={`Edit ${participant.name}`} onClick={(event) => { event.stopPropagation(); openEditor(participant); }}><Pencil className="w-3.5 h-3.5" /></button>
                        <button type="button" aria-label={`Remove ${participant.name}`} onClick={(event) => { event.stopPropagation(); onRemoveMember(participant); }}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    {editingId === participant.id ? (
                      <div className="seat-editor" onClick={(event) => event.stopPropagation()}>
                        <input autoFocus value={editName} maxLength={40} aria-label="Participant name" onChange={(event) => { setEditName(event.target.value); setEditError(''); }} onKeyDown={(event) => event.key === 'Enter' && saveMember(participant)} />
                        <div className="mood-row"><input value={editMood} maxLength={4} aria-label="Participant emoji" onChange={(event) => setEditMood(event.target.value)} /><button type="button" onClick={() => saveMember(participant)}><Save className="w-3.5 h-3.5" /> Save</button></div>
                        {editError && <p className="edit-error">{editError}</p>}
                      </div>
                    ) : (
                      <div className="seat-copy"><h4>{participant.name}</h4><p>{isActive ? 'Your seat' : 'Tap to claim'}</p></div>
                    )}
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="session-actions">
        <div className="selection-summary">
          {activeParticipant ? <><span className="selection-avatar" style={{ '--participant-color': activeParticipant.color } as React.CSSProperties}>{activeParticipant.mood}</span><p><strong>{activeParticipant.name}</strong><small>Ready to enter the drafting room</small></p></> : <p><strong>Claim a seat to continue</strong><small>Your ideas will be attributed to this person.</small></p>}
        </div>
        <div className="session-buttons">
          {hasData && <button type="button" onClick={onReset} className="text-action danger-action"><RotateCcw className="w-4 h-4" /> Reset ideas</button>}
          <button type="button" onClick={onStart} disabled={!activeParticipant} className="btn-primary">Enter drafting <ArrowRight className="w-4 h-4" /></button>
        </div>
      </div>
    </motion.section>
  );
}

// --- OTHER SCREENS (Updated to use dynamic participants) ---

function Brainstorm({ activeParticipant, ideas, onUpdateIdea, onAddIdea, onRemoveIdea }: any) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeStep, setActiveStep] = useState(1);
  const currentIdea = ideas[activeIndex];

  const handleInputChange = (field: string, value: any) => {
    onUpdateIdea({ ...currentIdea, [field]: value });
  };

  if (!activeParticipant) {
    return (
      <div className="panel-solid min-h-[420px] p-10 flex flex-col items-center justify-center text-center gap-4">
        <Users className="w-10 h-10 text-slate-400" />
        <div>
          <h2 className="font-heading text-2xl font-bold text-slate-900">Claim a seat first</h2>
          <p className="mt-2 text-sm text-slate-500">Return to the roster and select your name before drafting.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-3">
        <div className="bg-slate-100/50 p-6 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a] sticky top-24 space-y-6">
           <div className="flex justify-between items-center">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Vault</h3>
             <button onClick={() => onAddIdea(activeParticipant.id)} className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center hover:scale-110 transition-transform"><Plus className="w-4 h-4" /></button>
           </div>
           <div className="space-y-2">
            {ideas.map((idea: any, i: number) => (
              <motion.div key={idea.id} onClick={() => {setActiveIndex(i); setActiveStep(1);}} className={cn("flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all border-2 group", i === activeIndex ? "bg-white border-slate-900 shadow-[3px_3px_0_0_#0f172a]" : "bg-white/40 border-transparent text-slate-400 hover:text-slate-900")}>
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded flex items-center justify-center text-[10px] font-black", i === activeIndex ? "bg-slate-900 text-white" : "bg-slate-200")}>{i + 1}</div>
                  <span className="text-[11px] font-black uppercase truncate max-w-[100px]">{idea.title || `Concept ${i+1}`}</span>
                </div>
                {i === activeIndex && (
                  <button onClick={(e) => { e.stopPropagation(); onRemoveIdea(idea.id); if (activeIndex > 0) setActiveIndex(activeIndex - 1); }} className="opacity-0 group-hover:opacity-100 text-red-500 hover:scale-110 transition-all"><Trash2 className="w-4 h-4" /></button>
                )}
              </motion.div>
            ))}
            {ideas.length === 0 && (
              <div className="py-12 text-center space-y-4">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No concepts drafted</p>
                <button onClick={() => onAddIdea(activeParticipant.id)} className="btn-secondary w-full text-[9px]">Add New Concept</button>
              </div>
            )}
           </div>
        </div>
      </div>
      <div className="lg:col-span-9">
        <div className="panel-solid p-10 space-y-10 flex flex-col min-h-[600px] bg-white">
          {!currentIdea ? (
            <div className="flex-grow flex flex-col items-center justify-center space-y-8 text-center">
               <div className="w-20 h-20 rounded-3xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-5xl grayscale opacity-50">💡</div>
               <div className="space-y-3">
                 <h4 className="text-2xl font-heading uppercase text-slate-900">Global Strategic Blueprint</h4>
                 <p className="text-slate-400 text-sm max-w-sm mx-auto">Start by adding a new concept. It will instantly sync to all laptops.</p>
               </div>
               <button onClick={() => onAddIdea(activeParticipant.id)} className="btn-primary">Create Shared Concept</button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                 <div className="space-y-1"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Phase 0{activeStep}</p><h4 className="text-xl font-heading uppercase text-slate-900">Strategic Engineering</h4></div>
                 <div className="flex gap-2">{[1,2,3,4,5].map(step => (<div key={step} className={cn("w-2 h-2 rounded-full transition-all duration-300", step <= activeStep ? "bg-slate-900 w-8" : "bg-slate-100")} />))}</div>
              </div>
              <div className="flex-grow pt-2">
                <AnimatePresence mode="wait">
                  <motion.div key={activeStep} initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }} className="space-y-8">
                    {activeStep === 1 && (
                      <div className="space-y-6">
                        <div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Identity</label><input type="text" value={currentIdea.title} onChange={(e) => handleInputChange('title', e.target.value)} className="w-full bg-transparent border-none text-4xl font-heading focus:outline-none placeholder:text-slate-100 uppercase tracking-tighter text-slate-900" placeholder="Brand Name" /></div>
                        <div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Core Narrative</label><textarea value={currentIdea.pitch} onChange={(e) => handleInputChange('pitch', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg p-5 text-lg font-light min-h-[140px] resize-none focus:border-slate-900 outline-none text-slate-800" placeholder="Summarize innovation..." /></div>
                      </div>
                    )}
                    {activeStep === 2 && (
                      <div className="space-y-6">
                        <div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Market Friction</label><textarea value={currentIdea.problem} onChange={(e) => handleInputChange('problem', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg p-5 text-base min-h-[140px] resize-none focus:border-slate-900 outline-none" placeholder="What problem are you solving?" /></div>
                        <div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Segment</label><input type="text" value={currentIdea.targetCustomer} onChange={(e) => handleInputChange('targetCustomer', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg p-5 text-base focus:border-slate-900 outline-none" /></div>
                      </div>
                    )}
                    {activeStep === 3 && (
                       <div className="space-y-6">
                         <div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Revenue Engine</label><textarea value={currentIdea.revenueModel} onChange={(e) => handleInputChange('revenueModel', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg p-5 text-base min-h-[140px] resize-none focus:border-slate-900 outline-none" placeholder="How does this make money?" /></div>
                         <div className="space-y-2"><label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Unfair Advantage</label><textarea value={currentIdea.unfairAdvantage} onChange={(e) => handleInputChange('unfairAdvantage', e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg p-5 text-base min-h-[100px] resize-none focus:border-slate-900 outline-none" placeholder="What is your moat?" /></div>
                       </div>
                    )}
                    {activeStep === 4 && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-5">
                          <div className="p-5 border-2 border-slate-900 rounded-lg space-y-2 bg-slate-50 shadow-[3px_3px_0_0_#0f172a]"><label className="text-[8px] font-black uppercase tracking-widest text-slate-400">CapEx</label><input type="text" value={currentIdea.startupCost} onChange={(e) => handleInputChange('startupCost', e.target.value)} className="w-full bg-transparent border-none text-xl font-heading focus:outline-none" /></div>
                          <div className="p-5 border-2 border-slate-900 rounded-lg space-y-2 bg-slate-50 shadow-[3px_3px_0_0_#0f172a]"><label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Timeline</label><input type="text" value={currentIdea.timeToLaunch} onChange={(e) => handleInputChange('timeToLaunch', e.target.value)} className="w-full bg-transparent border-none text-xl font-heading focus:outline-none" /></div>
                          <div className="p-5 border-2 border-slate-900 rounded-lg space-y-2 bg-slate-50 shadow-[3px_3px_0_0_#0f172a]"><label className="text-[8px] font-black uppercase tracking-widest text-slate-400">TAM</label><select value={currentIdea.marketSize} onChange={(e) => handleInputChange('marketSize', e.target.value)} className="w-full bg-transparent border-none text-xl font-heading focus:outline-none appearance-none">{marketSizes.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                        </div>
                      </div>
                    )}
                    {activeStep === 5 && (
                      <div className="space-y-8">
                        <div className="p-8 border-2 border-slate-900 rounded-xl bg-slate-50 shadow-[6px_6px_0_0_#0f172a] flex items-center gap-8">
                          <div className="w-12 h-12 bg-slate-900 rounded flex items-center justify-center text-3xl shadow-lg">{currentIdea.excitement >= 8 ? '🔥' : '💡'}</div>
                          <div className="flex-grow space-y-3">
                            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400"><span>Founder Momentum</span><span className="text-xl text-slate-900 font-heading">{currentIdea.excitement}/10</span></div>
                            <input type="range" min="1" max="10" value={currentIdea.excitement} onChange={(e) => handleInputChange('excitement', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-900" />
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="flex justify-between items-center pt-8 border-t border-slate-100 mt-auto">
                <button onClick={() => activeStep > 1 ? setActiveStep(prev => prev - 1) : setActiveIndex(prev => (prev - 1 + ideas.length) % ideas.length)} className="btn-secondary"><ChevronLeft className="w-3.5 h-3.5" /> Revert</button>
                <button onClick={() => activeStep < 5 ? setActiveStep(prev => prev + 1) : (setActiveIndex(prev => (prev + 1) % ideas.length), setActiveStep(1))} className="btn-primary">{activeStep === 5 ? 'Commit' : 'Next'} <ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Vote({ ideas, currentIndex, onVote, onNext, onPrev, participants, ratings, activeParticipant }: any) {
  const currentIdea = ideas[currentIndex];
  const owner = participants.find((p: any) => p.id === currentIdea?.ownerId);
  const [localScores, setLocalScores] = useState({ problem: 3, market: 3, differentiation: 3, feasibility: 3 });
  const [comment, setComment] = useState("");
  const currentRating = ratings.find((rating: IdeaRating) => rating.ideaId === currentIdea?.id && rating.participantId === activeParticipant?.id);

  const updateLocalScore = (param: string, val: number) => setLocalScores(prev => ({ ...prev, [param]: val }));

  useEffect(() => {
    setLocalScores(currentRating ? {
      problem: currentRating.problem,
      market: currentRating.market,
      differentiation: currentRating.differentiation,
      feasibility: currentRating.feasibility
    } : { problem: 3, market: 3, differentiation: 3, feasibility: 3 });
    setComment(currentRating?.comment || "");
  }, [currentIdea?.id, activeParticipant?.id, currentRating?.updatedAt]);

  if (!currentIdea) return (
    <div className="py-40 text-center space-y-6">
       <BarChart3 className="w-14 h-14 mx-auto text-slate-300" />
       <div className="space-y-2">
         <h4 className="text-2xl font-heading uppercase text-slate-900">Review is waiting for ideas</h4>
         <p className="text-slate-500 text-sm">Give at least one draft a title, then return here to score the business.</p>
       </div>
    </div>
  );

  const criteria = [
    { id: 'problem', label: 'Problem value', icon: Target, desc: 'Is the pain real and urgent?' },
    { id: 'market', label: 'Market potential', icon: TrendingUp, desc: 'Can this reach worthwhile demand?' },
    { id: 'differentiation', label: 'Differentiation', icon: Sparkles, desc: 'Does the idea have a defendable edge?' },
    { id: 'feasibility', label: 'Feasibility', icon: Workflow, desc: 'Can a small team launch and learn?' }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center space-y-10 py-2">
      <div className="text-center space-y-3">
        <h2 className="text-4xl md:text-5xl font-heading uppercase text-slate-900">Review the <span className="text-slate-400">ideas</span></h2>
        <p className="text-slate-500 text-sm">Score the business—not the speaker. Each friend submits one rating per idea.</p>
      </div>
      <div className="w-full flex items-start justify-center gap-8 max-w-7xl">
         <button onClick={onPrev} className="mt-40 w-12 h-12 rounded-lg border-2 border-slate-900 bg-white flex items-center justify-center shadow-[4px_4px_0_0_#0f172a] active:scale-95 shrink-0"><ChevronLeft className="w-5 h-5" /></button>
         <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
               <motion.div key={currentIdea.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="panel-solid p-8 bg-white space-y-8 shadow-[12px_12px_0_0_rgba(15,23,42,0.05)]">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg border-2 border-slate-900 flex items-center justify-center text-2xl" style={{ backgroundColor: owner?.color }}>{owner?.mood}</div>
                        <div><p className="text-[8px] font-black uppercase text-slate-400">Drafted by</p><h4 className="text-sm font-bold uppercase text-slate-900 leading-none">{owner?.name}</h4></div>
                     </div>
                     <span className="px-3 py-1 bg-slate-50 border border-slate-200 rounded text-[9px] font-bold uppercase">{currentIdea.category}</span>
                  </div>
                  <div className="space-y-6"><h3 className="text-4xl font-heading uppercase text-slate-900 leading-none">{currentIdea.title}</h3><p className="text-xl font-light text-slate-600 leading-snug">{currentIdea.pitch}</p></div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1"><p className="text-[8px] font-black uppercase text-slate-400">Problem</p><p className="text-xs text-slate-700 leading-relaxed">{currentIdea.problem || 'Not specified'}</p></div>
                     <div className="space-y-1"><p className="text-[8px] font-black uppercase text-slate-400">Revenue model</p><p className="text-xs text-slate-700 leading-relaxed">{currentIdea.revenueModel || 'Not specified'}</p></div>
                     <div className="space-y-1"><p className="text-[8px] font-black uppercase text-slate-400">First customer</p><p className="text-xs font-bold text-slate-900">{currentIdea.targetCustomer || 'Not specified'}</p></div>
                     <div className="space-y-1"><p className="text-[8px] font-black uppercase text-slate-400">Unfair Advantage</p><p className="text-xs text-slate-700 leading-relaxed">{currentIdea.unfairAdvantage}</p></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                     <div className="p-3 bg-slate-50 rounded-lg border border-slate-100"><p className="text-[7px] font-black uppercase text-slate-400">Starting cost</p><p className="text-sm font-bold">{currentIdea.startupCost || 'Unknown'}</p></div>
                     <div className="p-3 bg-slate-50 rounded-lg border border-slate-100"><p className="text-[7px] font-black uppercase text-slate-400">Launch window</p><p className="text-sm font-bold">{currentIdea.timeToLaunch || 'Unknown'}</p></div>
                     <div className="p-3 bg-slate-50 rounded-lg border border-slate-100"><p className="text-[7px] font-black uppercase text-slate-400">Market size</p><p className="text-sm font-bold">{currentIdea.marketSize}</p></div>
                  </div>
               </motion.div>
            </div>
            <div className="lg:col-span-5 space-y-6">
               <div className="panel-solid p-8 bg-white space-y-8 border-slate-300">
                  <div className="flex items-start justify-between gap-4">
                    <div><h4 className="text-sm font-black uppercase tracking-wide text-slate-900 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Idea scorecard</h4><p className="mt-1 text-xs text-slate-500">{currentIdea.ratingCount || 0} of {participants.length} friends rated</p></div>
                    <span className="px-2 py-1 border border-slate-300 text-[9px] font-black uppercase">{activeParticipant?.name || 'Choose a seat'}</span>
                  </div>
                  {criteria.map(param => (
                    <div key={param.id} className="space-y-3">
                       <div className="flex justify-between items-end"><div><p className="text-[11px] font-bold uppercase text-slate-900 flex items-center gap-2">{React.createElement(param.icon, { className: 'w-3.5 h-3.5' })}{param.label}</p><p className="text-[10px] text-slate-500">{param.desc}</p></div><span className="text-lg font-heading text-slate-900">{(localScores as any)[param.id]}/5</span></div>
                       <div className="flex gap-2">{[1,2,3,4,5].map(v => (<button type="button" aria-label={`${param.label}: ${v} out of 5`} key={v} onClick={() => updateLocalScore(param.id, v)} className={cn("flex-1 h-10 rounded border-2 transition-all font-heading text-sm", (localScores as any)[param.id] === v ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200 hover:border-slate-500 text-slate-500")}>{v}</button>))}</div>
                    </div>
                  ))}
                  <div className="pt-4 space-y-3">
                     <label className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2"><MessageSquare className="w-3 h-3" /> Why did you score it this way? (optional)</label>
                     <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg p-4 text-xs min-h-[80px] resize-none focus:border-slate-900 outline-none transition-all" placeholder="Name the strongest evidence or biggest concern." />
                  </div>
                  <button onClick={() => onVote(currentIdea.id, localScores, comment)} disabled={!activeParticipant} className="w-full btn-primary h-12 text-[11px]">{currentRating ? 'Update rating' : 'Save rating'} <ChevronRight className="w-4 h-4" /></button>
               </div>
            </div>
         </div>
         <button onClick={onNext} className="mt-40 w-12 h-12 rounded-lg border-2 border-slate-900 bg-white flex items-center justify-center shadow-[4px_4px_0_0_#0f172a] active:scale-95 shrink-0"><ChevronRight className="w-5 h-5" /></button>
      </div>
    </motion.div>
  );
}

function Summary({ ideas, participants }: any) {
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const rankedIdeas = useMemo(() => {
    return [...ideas].filter(i => i.groupScore !== undefined).sort((a, b) => (b.groupScore || 0) - (a.groupScore || 0));
  }, [ideas]);
  const top3 = rankedIdeas.slice(0, 3);

  if (rankedIdeas.length === 0) return (
    <div className="py-40 text-center space-y-6">
       <Trophy className="w-14 h-14 mx-auto text-slate-300" />
       <div className="space-y-2">
         <h4 className="text-2xl font-heading uppercase text-slate-900">The scoreboard is waiting</h4>
         <p className="text-slate-500 text-sm">Each friend should rate the ideas in Review before the ranking appears.</p>
       </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-24 py-4">
      <div className="text-center space-y-4">
        <h2 className="text-5xl md:text-7xl font-heading uppercase text-slate-900">Final <span className="text-slate-400">scoreboard</span></h2>
        <p className="text-base text-slate-500">Human ratings averaged across problem value, market, differentiation, and feasibility.</p>
      </div>
      <div className="flex flex-col lg:flex-row items-end justify-center gap-8 pt-8 max-w-5xl mx-auto">
         {top3[1] && (
           <div className="flex-1 w-full max-w-[280px]">
             <div className="panel-solid p-8 relative flex flex-col items-center space-y-6 bg-white border-b-4 border-slate-900 shadow-xl rounded-2xl">
               <div className="absolute -top-8 w-12 h-12 bg-white border-2 border-slate-900 rounded-lg flex items-center justify-center font-heading text-slate-900 shadow-lg text-xl">02</div>
               <div className="text-center pt-2">
                 <h4 className="text-xl font-heading uppercase text-slate-900">{top3[1].title}</h4>
                 <p className="text-[9px] font-bold text-slate-400 uppercase">{participants.find((p: any) => p.id === top3[1].ownerId)?.name}</p>
               </div>
               <div className="text-4xl font-heading text-slate-800">{(top3[1].groupScore || 0).toFixed(1)}</div>
             </div>
           </div>
         )}
         {top3[0] && (
           <div className="flex-1 w-full max-w-[340px] z-10 lg:-translate-y-8">
             <div className="panel-solid p-12 relative flex flex-col items-center space-y-8 bg-white border-b-[12px] border-slate-900 shadow-2xl rounded-3xl">
               <div className="absolute -top-10 w-16 h-16 bg-[#0f172a] rounded flex items-center justify-center shadow-xl"><Trophy className="w-8 h-8 text-white" /></div>
               <div className="text-center pt-6">
                 <h4 className="text-3xl font-heading uppercase text-slate-900 leading-none">{top3[0].title}</h4>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Top-rated idea</p>
               </div>
               <div className="text-6xl font-heading text-slate-900">{(top3[0].groupScore || 0).toFixed(1)}</div>
             </div>
           </div>
         )}
         {top3[2] && (
           <div className="flex-1 w-full max-w-[280px]">
             <div className="panel-solid p-8 relative flex flex-col items-center space-y-6 bg-white border-b-4 border-slate-200 shadow-xl rounded-2xl">
               <div className="absolute -top-8 w-12 h-12 bg-white border-2 border-slate-200 rounded-lg flex items-center justify-center font-heading text-slate-200 shadow-lg text-xl">03</div>
               <div className="text-center pt-2">
                 <h4 className="text-xl font-heading uppercase text-slate-900">{top3[2].title}</h4>
                 <p className="text-[9px] font-bold text-slate-400 uppercase">{participants.find((p: any) => p.id === top3[2].ownerId)?.name}</p>
               </div>
               <div className="text-4xl font-heading text-slate-800">{(top3[2].groupScore || 0).toFixed(1)}</div>
             </div>
           </div>
         )}
      </div>
      <div className="space-y-12">
         <div className="flex justify-between items-end border-b-2 border-slate-900 pb-4 px-4">
           <div className="flex items-center gap-4"><h3 className="text-2xl font-heading uppercase text-slate-900">Group scoreboard</h3><span className="px-3 py-1 bg-slate-900 text-white rounded text-[8px] font-black uppercase tracking-widest">Human scores</span></div>
           <p className="text-[10px] font-bold uppercase text-slate-500">Click an idea for details and comments</p>
         </div>
         <div className="overflow-x-auto rounded-xl border-2 border-slate-900 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-slate-900 bg-slate-50">
                  <th className="p-6">Rank</th>
                  <th className="p-6">Idea</th>
                  <th className="p-6">Presenter</th>
                  <th className="p-4 text-center">Ratings</th>
                  <th className="p-4 text-center">Problem</th>
                  <th className="p-4 text-center">Market</th>
                  <th className="p-4 text-center">Edge</th>
                  <th className="p-4 text-center">Feasibility</th>
                  <th className="p-6 text-right">Overall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rankedIdeas.map((idea, r) => (
                  <tr key={idea.id} onClick={() => setSelectedIdea(idea)} className="group hover:bg-slate-50 transition-all cursor-pointer">
                    <td className="p-6"><span className="text-4xl font-heading text-slate-100 group-hover:text-slate-900 transition-colors">{(r + 1).toString().padStart(2, '0')}</span></td>
                    <td className="p-6">
                       <h5 className="text-base font-black uppercase text-slate-900 leading-none mb-1">{idea.title}</h5>
                       <p className="text-xs font-light text-slate-500 line-clamp-1">{idea.pitch}</p>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded border-2 border-slate-900 flex items-center justify-center shadow-[2px_2px_0_0_#0f172a]" style={{ backgroundColor: participants.find((p: any) => p.id === idea.ownerId)?.color }}>{participants.find((p: any) => p.id === idea.ownerId)?.mood}</div>
                        <span className="font-black uppercase text-[9px] tracking-tight">{participants.find((p: any) => p.id === idea.ownerId)?.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center"><span className="font-heading text-base">{idea.ratingCount || 0}/{participants.length}</span></td>
                    <td className="p-4 text-center"><span className="font-heading text-base">{idea.scores?.problem?.toFixed(1) || '—'}</span></td>
                    <td className="p-4 text-center"><span className="font-heading text-base">{idea.scores?.market?.toFixed(1) || '—'}</span></td>
                    <td className="p-4 text-center"><span className="font-heading text-base">{idea.scores?.differentiation?.toFixed(1) || '—'}</span></td>
                    <td className="p-4 text-center"><span className="font-heading text-base">{idea.scores?.feasibility?.toFixed(1) || '—'}</span></td>
                    <td className="p-6 text-right"><span className="text-3xl font-heading text-slate-900">{(idea.groupScore || 0).toFixed(1)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
         </div>
      </div>
      <AnimatePresence>
        {selectedIdea && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border-4 border-slate-900 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-[30px_30px_0_0_rgba(15,23,42,0.1)] flex flex-col">
              <div className="p-10 border-b-2 border-slate-900 flex justify-between items-start bg-slate-50">
                <div className="space-y-4">
                  <div className="flex items-center gap-3"><span className="px-3 py-1 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest">Idea review</span><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedIdea.ratingCount || 0} ratings</span></div>
                  <h3 className="text-5xl font-heading uppercase text-slate-900 leading-none">{selectedIdea.title}</h3>
                </div>
                <button onClick={() => setSelectedIdea(null)} className="w-12 h-12 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-[4px_4px_0_0_#0f172a]"><X className="w-6 h-6" /></button>
              </div>
              <div className="flex-grow overflow-y-auto p-12 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">One-line pitch</label><p className="text-xl font-light leading-relaxed text-slate-700">{selectedIdea.pitch}</p></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Problem</label><p className="text-sm leading-relaxed text-slate-600">{selectedIdea.problem}</p></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Revenue Model</label><p className="text-sm leading-relaxed text-slate-600">{selectedIdea.revenueModel}</p></div>
                  </div>
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a]"><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Moat</p><p className="text-sm font-bold text-slate-900">{selectedIdea.unfairAdvantage}</p></div>
                      <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a]"><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Target</p><p className="text-sm font-bold text-slate-900">{selectedIdea.targetCustomer}</p></div>
                      <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a]"><p className="text-[9px] font-black uppercase text-slate-400 mb-1">CapEx</p><p className="text-sm font-bold text-slate-900">{selectedIdea.startupCost}</p></div>
                      <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0_0_#0f172a]"><p className="text-[9px] font-black uppercase text-slate-400 mb-1">Launch</p><p className="text-sm font-bold text-slate-900">{selectedIdea.timeToLaunch}</p></div>
                    </div>
                  </div>
                </div>
                <div className="pt-12 border-t-2 border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-12">
                   <div className="md:col-span-5 space-y-6">
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Strategic Performance</h4>
                      <div className="space-y-4">
                        {selectedIdea.scores && Object.entries(selectedIdea.scores).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                             <span className="text-[10px] font-black uppercase text-slate-500">{k}</span>
                             <div className="flex gap-1">
                               {[1,2,3,4,5].map(dot => <div key={dot} className={cn("w-2 h-2 rounded-full", dot <= (v as number) ? "bg-slate-900" : "bg-slate-200")} />)}
                             </div>
                             <span className="font-heading text-lg">{v as number}/5</span>
                          </div>
                        ))}
                      </div>
                   </div>
                   <div className="md:col-span-7 space-y-6">
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Strategist Feedback Log</h4>
                      <div className="space-y-4">
                         {selectedIdea.comments && selectedIdea.comments.length > 0 ? (
                           selectedIdea.comments.map((c, i) => {
                             const author = participants.find((p: any) => p.id === c.authorId);
                             return (
                               <div key={i} className="space-y-2">
                                  <div className="flex items-center gap-2">
                                     <div className="w-5 h-5 rounded border border-slate-900 flex items-center justify-center text-[10px]" style={{ backgroundColor: author?.color }}>{author?.mood}</div>
                                     <span className="text-[9px] font-black uppercase text-slate-900">{author?.name}</span>
                                  </div>
                                  <div className="p-4 bg-slate-900 text-white rounded-2xl text-xs leading-relaxed italic">"{c.text}"</div>
                               </div>
                             );
                           })
                         ) : (
                           <p className="text-xs text-slate-400 italic">No attributed comments recorded.</p>
                         )}
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

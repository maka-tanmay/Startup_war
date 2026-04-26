import React, { useState, useMemo, useEffect } from 'react';
import { Participant, Idea, initialIdeas, categories, marketSizes } from './data/mockData';
import { supabase } from './lib/supabase';
import { Rocket, Users, ChevronRight, Star, Trophy, Target, DollarSign, Clock, CheckCircle2, ChevronLeft, Zap, Sparkles, BrainCircuit, TrendingUp, Search, ShieldAlert, BadgeCheck, Coins, LayoutGrid, ArrowRight, MousePointer2, MessageSquare, Info, X, Lightbulb, BarChart3, Workflow, Plus, Trash2, Database, Save, RotateCcw, Wifi, WifiOff, Globe, AlertTriangle, ExternalLink, Terminal, UserPlus, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Screen = 'LOBBY' | 'BRAINSTORM' | 'VOTE' | 'SUMMARY';

// --- SEPARATE HEADER COMPONENT ---
const Header = ({ currentScreen, setCurrentScreen, activeParticipant, dbConnected, isConfigured }: any) => {
  const navItems = [
    { id: 'LOBBY', label: 'Lobby' },
    { id: 'BRAINSTORM', label: 'Drafting' },
    { id: 'VOTE', label: 'Battle' },
    { id: 'SUMMARY', label: 'Results' }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-white border-b-2 border-slate-900 h-16 flex items-center justify-between px-12 shadow-sm">
      <div className="flex items-center gap-3 cursor-pointer group shrink-0" onClick={() => setCurrentScreen('LOBBY')}>
        <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center transition-transform group-hover:rotate-6">
          <Rocket className="w-5 h-5 text-white" />
        </div>
        <div className="hidden sm:flex flex-col">
          <h1 className="text-base font-heading uppercase tracking-tighter leading-none">SparkTank</h1>
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Global Engine</p>
        </div>
      </div>

      <nav className="flex items-center h-full gap-8">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentScreen(item.id as Screen)}
            className={cn(
              "relative h-full px-2 flex items-center text-[12px] font-bold uppercase tracking-widest transition-colors",
              currentScreen === item.id ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
            )}
          >
            {item.label}
            {currentScreen === item.id && (
              <motion.div
                layoutId="header-underline"
                className="absolute bottom-[-2px] left-0 right-0 h-[4px] bg-slate-900 rounded-full z-50"
                transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              />
            )}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-4 shrink-0 min-w-[200px] justify-end">
        {!isConfigured ? (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border-2 border-amber-100 bg-amber-50 text-amber-600">
             <AlertTriangle className="w-3 h-3" />
             <span className="text-[8px] font-black uppercase tracking-widest">Setup Required</span>
          </div>
        ) : (
          <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full border-2 transition-all", dbConnected ? "border-green-100 bg-green-50 text-green-600" : "border-red-100 bg-red-50 text-red-600")}>
             {dbConnected ? <Globe className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
             <span className="text-[8px] font-black uppercase tracking-widest">{dbConnected ? "Sync Active" : "Sync Offline"}</span>
          </div>
        )}
        {activeParticipant && (
          <div className="flex items-center gap-3 pl-5 border-l border-slate-100">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-[10px] font-bold uppercase tracking-tight text-slate-900">{activeParticipant.name}</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Node</span>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl border-2 border-slate-900 shadow-[3px_3px_0_0_#0f172a]" style={{ backgroundColor: activeParticipant.color }}>{activeParticipant.mood}</div>
          </div>
        )}
      </div>
    </header>
  );
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('LOBBY');
  const [activeParticipant, setActiveParticipant] = useState<Participant | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [votingIndex, setVotingIndex] = useState(0);
  const [dbConnected, setDbConnected] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // Check if Supabase is configured
  useEffect(() => {
    const isMock = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'YOUR_SUPABASE_URL';
    setIsConfigured(!isMock);
    
    if (isMock) {
      const savedIdeas = localStorage.getItem('spark-tank-ideas-local');
      if (savedIdeas) setIdeas(JSON.parse(savedIdeas));
      const savedParts = localStorage.getItem('spark-tank-participants-local');
      if (savedParts) setParticipants(JSON.parse(savedParts));
      else setParticipants([
        { id: '1', name: 'Tanmay', color: '#ef4444', ideasLogged: 0, mood: '🔥' },
        { id: '2', name: 'Taher', color: '#3b82f6', ideasLogged: 0, mood: '🤔' },
        { id: '3', name: 'Siddhesh', color: '#10b981', ideasLogged: 0, mood: '🚀' },
        { id: '4', name: 'Hasnain', color: '#f59e0b', ideasLogged: 0, mood: '💡' },
        { id: '5', name: 'Ahmed', color: '#8b5cf6', ideasLogged: 0, mood: '🌈' },
      ]);
    }
  }, []);

  // --- SUPABASE SYNC ENGINE ---
  useEffect(() => {
    if (!isConfigured) return;

    const fetchData = async () => {
      try {
        const { data: ideasData } = await supabase.from('ideas').select('*');
        const { data: partsData } = await supabase.from('participants').select('*');
        
        setIdeas(ideasData || []);
        if (partsData && partsData.length > 0) {
           setParticipants(partsData.sort((a, b) => a.id.localeCompare(b.id)));
        } else {
           // Initialize default participants if table is empty
           const defaults = [
            { id: '1', name: 'Tanmay', color: '#ef4444', ideasLogged: 0, mood: '🔥' },
            { id: '2', name: 'Taher', color: '#3b82f6', ideasLogged: 0, mood: '🤔' },
            { id: '3', name: 'Siddhesh', color: '#10b981', ideasLogged: 0, mood: '🚀' },
            { id: '4', name: 'Hasnain', color: '#f59e0b', ideasLogged: 0, mood: '💡' },
            { id: '5', name: 'Ahmed', color: '#8b5cf6', ideasLogged: 0, mood: '🌈' },
          ];
          await supabase.from('participants').insert(defaults);
          setParticipants(defaults);
        }
        setDbConnected(true);
      } catch (err) {
        setDbConnected(false);
      }
    };

    fetchData();

    // Ideas Subscription
    const ideasChannel = supabase
      .channel('ideas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ideas' }, (payload) => {
        if (payload.eventType === 'INSERT') setIdeas(prev => [...prev, payload.new as Idea]);
        else if (payload.eventType === 'UPDATE') setIdeas(prev => prev.map(id => id.id === payload.new.id ? payload.new as Idea : id));
        else if (payload.eventType === 'DELETE') setIdeas(prev => prev.filter(id => id.id !== payload.old.id));
      })
      .subscribe();

    // Participants Subscription
    const partsChannel = supabase
      .channel('parts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, (payload) => {
        if (payload.eventType === 'INSERT') setParticipants(prev => [...prev, payload.new as Participant].sort((a, b) => a.id.localeCompare(b.id)));
        else if (payload.eventType === 'UPDATE') setParticipants(prev => prev.map(p => p.id === payload.new.id ? payload.new as Participant : p).sort((a, b) => a.id.localeCompare(b.id)));
        else if (payload.eventType === 'DELETE') setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ideasChannel);
      supabase.removeChannel(partsChannel);
    };
  }, [isConfigured]);

  // Persist local if not configured
  useEffect(() => {
    if (!isConfigured) {
      localStorage.setItem('spark-tank-ideas-local', JSON.stringify(ideas));
      localStorage.setItem('spark-tank-participants-local', JSON.stringify(participants));
    }
  }, [ideas, participants, isConfigured]);

  const addMember = async () => {
    const newMember: Participant = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Guest ${participants.length + 1}`,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      mood: '✨',
      ideasLogged: 0
    };

    setParticipants(prev => [...prev, newMember]);
    if (isConfigured) {
      await supabase.from('participants').insert([newMember]);
    }
  };

  const updateMember = async (updated: Participant) => {
    setParticipants(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (isConfigured) {
      await supabase.from('participants').update(updated).eq('id', updated.id);
    }
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
      await supabase.from('ideas').insert([newIdea]);
    }
  };

  const removeIdea = async (id: string) => {
    setIdeas(prev => prev.filter(i => i.id !== id));
    if (isConfigured) {
      await supabase.from('ideas').delete().eq('id', id);
    }
  };

  const updateIdea = async (updatedIdea: Idea) => {
    setIdeas(prev => prev.map(id => id.id === updatedIdea.id ? updatedIdea : id));
    if (isConfigured) {
      await supabase.from('ideas').update(updatedIdea).eq('id', updatedIdea.id);
    }
  };

  const handleDetailedVote = async (ideaId: string, scores: any, commentText: string) => {
    if (!activeParticipant) return;
    const ideaToUpdate = ideas.find(i => i.id === ideaId);
    if (!ideaToUpdate) return;

    const total = (scores.innovation + scores.viability + scores.execution) / 3;
    const newComment = commentText ? { text: commentText, authorId: activeParticipant.id } : null;
    
    const updatedIdea = {
      ...ideaToUpdate,
      scores,
      groupScore: total,
      comments: newComment ? [...(ideaToUpdate.comments || []), newComment] : (ideaToUpdate.comments || [])
    };

    if (isConfigured) {
      await supabase.from('ideas').update(updatedIdea).eq('id', ideaId);
    } else {
      updateIdea(updatedIdea);
    }
    
    setVotingIndex(prev => (prev + 1) % battleIdeas.length);
  };

  const clearSession = async () => {
    if (window.confirm("CRITICAL: This will permanently delete all shared data. Proceed?")) {
      if (isConfigured) {
        await supabase.from('ideas').delete().neq('id', '0');
      } else {
        setIdeas([]);
      }
      setVotingIndex(0);
      setCurrentScreen('LOBBY');
    }
  };

  const battleIdeas = useMemo(() => {
    return [...ideas].filter(i => i.title).sort((a, b) => a.id.localeCompare(b.id));
  }, [ideas]);

  return (
    <div className="min-h-screen bg-[#eff1f5] text-[#0f172a] font-outfit relative selection:bg-slate-900 selection:text-white">
      <div className="bg-pattern-dots" />
      <Header currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} activeParticipant={activeParticipant} dbConnected={dbConnected} isConfigured={isConfigured} />

      {!isConfigured && currentScreen === 'LOBBY' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-8">
           <div className="bg-amber-50 border-2 border-amber-900 p-6 rounded-2xl shadow-xl flex gap-6 items-center animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="w-12 h-12 bg-amber-900 rounded-xl flex items-center justify-center shrink-0 shadow-lg"><Terminal className="w-6 h-6 text-white" /></div>
              <div className="flex-grow space-y-1">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-900">Multiplayer Setup Pending</h4>
                 <p className="text-xs text-amber-700 leading-tight">Sync is offline. Configuration required in <code className="bg-amber-100 px-1 rounded">supabase.ts</code>.</p>
              </div>
              <div className="flex flex-col gap-2">
                 <a href="https://supabase.com" target="_blank" className="px-4 py-2 bg-amber-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 hover:bg-black transition-colors"><ExternalLink className="w-3 h-3" /> Get Keys</a>
              </div>
           </div>
        </div>
      )}

      <main className="pt-24 pb-20 px-8 max-w-6xl mx-auto relative z-10">
        <AnimatePresence mode="wait">
          {currentScreen === 'LOBBY' && (
            <Lobby key="lobby" onStart={() => activeParticipant && setCurrentScreen('BRAINSTORM')} activeParticipant={activeParticipant} onClaimSeat={setActiveParticipant} onReset={clearSession} hasData={ideas.length > 0} participants={participants} onAddMember={addMember} onUpdateMember={updateMember} />
          )}
          {currentScreen === 'BRAINSTORM' && (
            <Brainstorm key="brainstorm" activeParticipant={activeParticipant} ideas={ideas.filter(i => i.ownerId === activeParticipant?.id)} onUpdateIdea={updateIdea} onAddIdea={addIdea} onRemoveIdea={removeIdea} />
          )}
          {currentScreen === 'VOTE' && (
            <Vote key="vote" ideas={battleIdeas} currentIndex={votingIndex} onVote={handleDetailedVote} onNext={() => setVotingIndex(prev => (prev + 1) % battleIdeas.length)} onPrev={() => setVotingIndex(prev => (prev - 1 + battleIdeas.length) % battleIdeas.length)} participants={participants} />
          )}
          {currentScreen === 'SUMMARY' && (
            <Summary key="summary" ideas={ideas} participants={participants} />
          )}
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-6 left-8 flex items-center gap-6 opacity-40 pointer-events-auto">
        <div className="flex items-center gap-2">
           <Database className={cn("w-3 h-3", isConfigured ? "text-blue-600" : "text-amber-600")} />
           <span className="text-[8px] font-black uppercase tracking-widest">{isConfigured ? "Supabase Multi-Device Engine" : "Local-Only Mode"}</span>
        </div>
        <div className="w-px h-2 bg-slate-300" />
        <span className="text-[8px] font-black uppercase tracking-widest">V1.3.0-EXTENDED</span>
      </footer>
    </div>
  );
}

// --- LOBBY SCREEN ---

function Lobby({ onStart, activeParticipant, onClaimSeat, onReset, hasData, participants, onAddMember, onUpdateMember }: any) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center space-y-12 py-4">
      <div className="text-center space-y-6 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 border-2 border-slate-900 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-900 bg-white shadow-[3px_3px_0_0_#0f172a]">
           {hasData ? <Globe className="w-3 h-3" /> : <Rocket className="w-3 h-3" />} {hasData ? "Strategic Session Restored" : "Initialize Global Protocol"}
        </div>
        <h2 className="text-5xl md:text-6xl font-heading leading-tight uppercase tracking-tighter text-slate-900">Sync Your <br/> <span className="text-slate-300">Ambition</span></h2>
        <p className="text-lg text-slate-500 max-w-xl mx-auto font-light">Choose your node to access the shared strategic vault.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-6 w-full max-w-5xl">
        {participants.map((p: any) => (
          <motion.div key={p.id} whileHover={{ y: -3 }} onClick={() => onClaimSeat(p)} className={cn("p-8 min-w-[180px] flex-1 flex flex-col items-center space-y-6 relative cursor-pointer group rounded-xl border-2 transition-all bg-white", activeParticipant?.id === p.id ? "border-slate-900 shadow-[8px_8px_0_0_#0f172a]" : "border-slate-100 hover:border-slate-300 shadow-sm")}>
             <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl border-2 border-slate-900 bg-slate-50 shadow-[4px_4px_0_0_#0f172a] relative">
               {p.mood}
               <button onClick={(e) => { e.stopPropagation(); setEditingId(editingId === p.id ? null : p.id); }} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-slate-900 hover:text-white transition-all"><Palette className="w-3 h-3" /></button>
             </div>
             
             {editingId === p.id ? (
               <div className="flex flex-col gap-2 w-full animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
                 <input autoFocus type="text" value={p.name} onChange={(e) => onUpdateMember({...p, name: e.target.value})} className="w-full text-[10px] font-bold uppercase bg-slate-50 border-2 border-slate-900 p-1 text-center outline-none rounded" onBlur={() => setEditingId(null)} />
                 <input type="text" value={p.mood} onChange={(e) => onUpdateMember({...p, mood: e.target.value})} className="w-full text-[12px] bg-slate-50 border-2 border-slate-900 p-1 text-center outline-none rounded" />
               </div>
             ) : (
               <div className="text-center">
                <h3 className="text-base font-bold uppercase tracking-tight text-slate-900">{p.name}</h3>
                <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-1">Node Active</p>
               </div>
             )}

             <div className={cn("w-full py-3 text-[8px] font-black uppercase tracking-widest border-2 transition-all rounded-lg text-center", activeParticipant?.id === p.id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-300 border-slate-100 group-hover:border-slate-900 group-hover:text-slate-900")}>{activeParticipant?.id === p.id ? "Active" : "Sync"}</div>
          </motion.div>
        ))}
        
        {/* ADD MEMBER BUTTON */}
        <motion.div whileHover={{ y: -3 }} onClick={onAddMember} className="p-8 min-w-[180px] flex-1 flex flex-col items-center justify-center space-y-4 cursor-pointer group rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-900 transition-all bg-white/40">
           <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 group-hover:border-slate-900 flex items-center justify-center transition-all group-hover:scale-110">
             <UserPlus className="w-6 h-6 text-slate-300 group-hover:text-slate-900" />
           </div>
           <div className="text-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900">Add Friend</h3>
              <p className="text-[8px] text-slate-300 uppercase tracking-widest mt-1">New Node</p>
           </div>
        </motion.div>
      </div>
      <div className="pt-6 flex items-center gap-6">
        <button onClick={onStart} disabled={!activeParticipant} className="btn-primary">Initialize Workspace <ArrowRight className="w-4 h-4" /></button>
        {hasData && (
          <button onClick={onReset} className="btn-secondary flex items-center gap-2 text-red-500 border-red-100 hover:bg-red-500 hover:text-white">
            <RotateCcw className="w-4 h-4" /> Reset Global Session
          </button>
        )}
      </div>
    </motion.div>
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

function Vote({ ideas, currentIndex, onVote, onNext, onPrev, participants }: any) {
  const currentIdea = ideas[currentIndex];
  const owner = participants.find((p: any) => p.id === currentIdea?.ownerId);
  const [localScores, setLocalScores] = useState({ innovation: 3, viability: 3, execution: 3 });
  const [comment, setComment] = useState("");

  const updateLocalScore = (param: string, val: number) => setLocalScores(prev => ({ ...prev, [param]: val }));

  useEffect(() => {
    setLocalScores({ innovation: 3, viability: 3, execution: 3 });
    setComment("");
  }, [currentIndex]);

  if (!currentIdea) return (
    <div className="py-40 text-center space-y-6">
       <div className="text-6xl grayscale opacity-30">⚔️</div>
       <div className="space-y-2">
         <h4 className="text-2xl font-heading uppercase text-slate-900">Global Battle Locked</h4>
         <p className="text-slate-400 text-sm">Draft concepts across all laptops to begin the evaluation phase.</p>
       </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center space-y-10 py-2">
      <div className="text-center space-y-3">
        <h2 className="text-4xl md:text-5xl font-heading uppercase text-slate-900">Battle <span className="text-slate-300">Arena</span></h2>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Global Real-time Evaluation</p>
      </div>
      <div className="w-full flex items-start justify-center gap-8 max-w-7xl">
         <button onClick={onPrev} className="mt-40 w-12 h-12 rounded-lg border-2 border-slate-900 bg-white flex items-center justify-center shadow-[4px_4px_0_0_#0f172a] active:scale-95 shrink-0"><ChevronLeft className="w-5 h-5" /></button>
         <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
               <motion.div key={currentIdea.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="panel-solid p-8 bg-white space-y-8 shadow-[12px_12px_0_0_rgba(15,23,42,0.05)]">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg border-2 border-slate-900 flex items-center justify-center text-2xl" style={{ backgroundColor: owner?.color }}>{owner?.mood}</div>
                        <div><p className="text-[8px] font-black uppercase text-slate-300">Origin Node</p><h4 className="text-sm font-bold uppercase text-slate-900 leading-none">{owner?.name}</h4></div>
                     </div>
                     <span className="px-3 py-1 bg-slate-50 border border-slate-200 rounded text-[9px] font-bold uppercase">{currentIdea.category}</span>
                  </div>
                  <div className="space-y-6"><h3 className="text-4xl font-heading uppercase text-slate-900 leading-none">{currentIdea.title}</h3><p className="text-xl font-light text-slate-600 leading-snug">{currentIdea.pitch}</p></div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1"><p className="text-[8px] font-black uppercase text-slate-400">Market Friction</p><p className="text-xs text-slate-700 leading-relaxed">{currentIdea.problem}</p></div>
                     <div className="space-y-1"><p className="text-[8px] font-black uppercase text-slate-400">Revenue Engine</p><p className="text-xs text-slate-700 leading-relaxed">{currentIdea.revenueModel}</p></div>
                     <div className="space-y-1"><p className="text-[8px] font-black uppercase text-slate-400">Target Persona</p><p className="text-xs font-bold text-slate-900">{currentIdea.targetCustomer}</p></div>
                     <div className="space-y-1"><p className="text-[8px] font-black uppercase text-slate-400">Unfair Advantage</p><p className="text-xs text-slate-700 leading-relaxed">{currentIdea.unfairAdvantage}</p></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                     <div className="p-3 bg-slate-50 rounded-lg border border-slate-100"><p className="text-[7px] font-black uppercase text-slate-400">CapEx</p><p className="text-sm font-bold">{currentIdea.startupCost}</p></div>
                     <div className="p-3 bg-slate-50 rounded-lg border border-slate-100"><p className="text-[7px] font-black uppercase text-slate-400">Timeline</p><p className="text-sm font-bold">{currentIdea.timeToLaunch}</p></div>
                     <div className="p-3 bg-slate-50 rounded-lg border border-slate-100"><p className="text-[7px] font-black uppercase text-slate-400">TAM</p><p className="text-sm font-bold">{currentIdea.marketSize}</p></div>
                  </div>
               </motion.div>
            </div>
            <div className="lg:col-span-5 space-y-6">
               <div className="panel-solid p-8 bg-white space-y-8 border-slate-300">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2"><Sparkles className="w-3 h-3" /> Grading Protocol</h4>
                  {[{ id: 'innovation', label: 'Innovation', icon: Lightbulb, desc: 'Uniqueness & Creativity' }, { id: 'viability', label: 'Viability', icon: BarChart3, desc: 'Revenue & Market Fit' }, { id: 'execution', label: 'Execution', icon: Workflow, desc: 'Feasibility & Complexity' }].map(param => (
                    <div key={param.id} className="space-y-3">
                       <div className="flex justify-between items-end"><div><p className="text-[11px] font-bold uppercase text-slate-900">{param.label}</p><p className="text-[8px] text-slate-400 uppercase font-black">{param.desc}</p></div><span className="text-lg font-heading text-slate-900">{(localScores as any)[param.id]}/5</span></div>
                       <div className="flex gap-2">{[1,2,3,4,5].map(v => (<button key={v} onClick={() => updateLocalScore(param.id, v)} className={cn("flex-1 h-10 rounded border-2 transition-all font-heading text-sm", (localScores as any)[param.id] === v ? "bg-slate-900 border-slate-900 text-white" : "border-slate-100 hover:border-slate-300 text-slate-300")}>{v}</button>))}</div>
                    </div>
                  ))}
                  <div className="pt-4 space-y-3">
                     <label className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-2"><MessageSquare className="w-3 h-3" /> Strategist Comments (Optional)</label>
                     <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg p-4 text-xs min-h-[80px] resize-none focus:border-slate-900 outline-none transition-all" placeholder="Add specific strategic feedback..." />
                  </div>
                  <button onClick={() => onVote(currentIdea.id, localScores, comment)} className="w-full btn-primary h-12 text-[11px]">Commit Grade <ChevronRight className="w-4 h-4" /></button>
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
       <div className="text-6xl grayscale opacity-30">🏆</div>
       <div className="space-y-2">
         <h4 className="text-2xl font-heading uppercase text-slate-900">Summit Hub Unlocked</h4>
         <p className="text-slate-400 text-sm">Finish evaluating concepts in the Battle Arena to generate the global audit.</p>
       </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-24 py-4">
      <div className="text-center space-y-4">
        <h2 className="text-5xl md:text-7xl font-heading uppercase text-slate-900">The <span className="text-slate-300">Summit</span></h2>
        <p className="text-lg text-slate-400 font-light uppercase tracking-widest">Global Strategic Engineering Final Audit</p>
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
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Supreme Concept</p>
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
           <div className="flex items-center gap-4"><h3 className="text-2xl font-heading uppercase text-slate-900">Shared Session Audit</h3><span className="px-3 py-1 bg-slate-900 text-white rounded text-[8px] font-black uppercase tracking-widest">Global Sync</span></div>
           <p className="text-[10px] font-bold uppercase text-slate-400">Updates instantly across all laptops</p>
         </div>
         <div className="overflow-x-auto rounded-xl border-2 border-slate-900 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-slate-900 bg-slate-50">
                  <th className="p-6">Rank</th>
                  <th className="p-6">Concept Identity</th>
                  <th className="p-6">Origin Node</th>
                  <th className="p-6 text-right">Avg Grade</th>
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
                  <div className="flex items-center gap-3"><span className="px-3 py-1 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest">Blueprint V1.2-MULTI</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {selectedIdea.id}</span></div>
                  <h3 className="text-5xl font-heading uppercase text-slate-900 leading-none">{selectedIdea.title}</h3>
                </div>
                <button onClick={() => setSelectedIdea(null)} className="w-12 h-12 rounded-xl bg-white border-2 border-slate-900 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-[4px_4px_0_0_#0f172a]"><X className="w-6 h-6" /></button>
              </div>
              <div className="flex-grow overflow-y-auto p-12 space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">The Core Narrative</label><p className="text-xl font-light leading-relaxed text-slate-700">{selectedIdea.pitch}</p></div>
                    <div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Market Inefficiency</label><p className="text-sm leading-relaxed text-slate-600">{selectedIdea.problem}</p></div>
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

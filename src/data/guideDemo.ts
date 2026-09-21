import type { Idea, IdeaRating, Participant } from './mockData';

export const guideParticipants: Participant[] = [
  { id: 'guide-alex', name: 'Alex', color: '#ef4444', mood: '🔥', ideasLogged: 1 },
  { id: 'guide-maya', name: 'Maya', color: '#3b82f6', mood: '🚀', ideasLogged: 1 },
  { id: 'guide-sam', name: 'Sam', color: '#10b981', mood: '💡', ideasLogged: 0 },
  { id: 'guide-noor', name: 'Noor', color: '#f59e0b', mood: '✨', ideasLogged: 0 }
];

export const guideIdeas: Idea[] = [
  {
    id: 'guide-signal-loop', ownerId: 'guide-alex', title: 'SignalLoop', category: 'Tech',
    pitch: 'A fast customer-feedback loop for small product teams.',
    problem: 'Small teams ship before they understand why customers hesitate.',
    targetCustomer: 'Seed-stage product teams', revenueModel: 'Monthly SaaS subscription',
    startupCost: '€2,000', timeToLaunch: '6 weeks', marketSize: 'Large',
    unfairAdvantage: 'Structured interview evidence connected to roadmap decisions',
    biggestRisk: 'Teams may resist adding another research workflow', notes: 'Demo the decision log after the live interview.',
    excitement: 8, feasibility: 7
  },
  {
    id: 'guide-proof-pilot', ownerId: 'guide-maya', title: 'ProofPilot', category: 'Service',
    pitch: 'A guided validation sprint for first-time founders.',
    problem: 'New founders build too much before testing the risky assumption.',
    targetCustomer: 'First-time founders', revenueModel: 'Fixed-price sprint plus membership',
    startupCost: '€800', timeToLaunch: '2 weeks', marketSize: 'Medium',
    unfairAdvantage: 'A repeatable evidence rubric and facilitator playbook',
    biggestRisk: 'Service delivery may be difficult to scale', notes: 'Lead with the two-week evidence guarantee.',
    excitement: 9, feasibility: 9
  }
];

export const guideRatings: IdeaRating[] = guideIdeas.flatMap((idea, ideaIndex) => guideParticipants.map((participant, participantIndex) => ({
  sessionId: 'guide-room', ideaId: idea.id, participantId: participant.id,
  problem: Math.min(5, 3 + ((ideaIndex + participantIndex) % 3)),
  market: Math.min(5, 3 + ((ideaIndex + participantIndex + 1) % 3)),
  differentiation: Math.min(5, 3 + ((ideaIndex + participantIndex + 2) % 3)),
  feasibility: Math.min(5, 3 + ((ideaIndex + participantIndex + 1) % 3)),
  comment: participantIndex === 0 ? 'Strong problem signal; test willingness to pay next.' : undefined,
  updatedAt: '2026-09-21T12:00:00.000Z'
}))) as IdeaRating[];

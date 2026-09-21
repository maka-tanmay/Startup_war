export interface Idea {
  id: string;
  title: string;
  pitch: string;
  category: string;
  problem: string;
  targetCustomer: string;
  revenueModel: string;
  startupCost: string;
  timeToLaunch: string;
  excitement: number;
  feasibility: number;
  marketSize: 'Small' | 'Medium' | 'Large' | 'Massive';
  unfairAdvantage: string;
  biggestRisk: string;
  notes: string;
  ownerId: string;
  groupScore?: number;
  scores?: {
    problem: number;
    market: number;
    differentiation: number;
    feasibility: number;
  };
  ratingCount?: number;
  comments?: Array<{ text: string; authorId: string }>;
}

export interface IdeaRating {
  sessionId: string;
  ideaId: string;
  participantId: string;
  problem: number;
  market: number;
  differentiation: number;
  feasibility: number;
  comment?: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  name: string;
  color: string;
  ideasLogged: number;
  mood: string;
}

/**
 * STARTING WITH A CLEAN SLATE FOR LIVE DEPLOYMENT.
 * All sample ideas have been removed.
 */
export const initialIdeas: Idea[] = [];

export const categories = [
  'Tech', 'Food & Bev', 'Retail', 'Service', 'Content', 'Finance', 'Health', 'Education', 'Other'
];

export const marketSizes = ['Small', 'Medium', 'Large', 'Massive'] as const;

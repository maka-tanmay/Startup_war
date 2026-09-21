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
    innovation: number;
    viability: number;
    execution: number;
  };
  comments?: Array<{ text: string; authorId: string }>;
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

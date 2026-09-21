export type PresentationStatus = 'not_started' | 'presenting' | 'complete';

export type CouncilRunStatus = 'idle' | 'queued' | 'running' | 'complete' | 'failed';

export type AdvisorKey = 'contrarian' | 'firstPrinciples' | 'expansionist' | 'outsider' | 'executor';

export interface PresentationProgress {
  ideaId: string;
  presenterId: string;
  status: PresentationStatus;
  completedAt?: string;
}

export interface CouncilResult {
  recommendedIdeaId: string;
  recommendedIdeaTitle: string;
  advisorViews: Record<AdvisorKey, string>;
  agreement: string[];
  clashes: string[];
  blindSpots: string[];
  recommendation: string;
  firstAction: string;
}

export interface CouncilRun {
  id: string;
  sessionId: string;
  status: CouncilRunStatus;
  inputHash: string;
  workflowVersion: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: CouncilResult;
}

export interface CouncilConceptInput {
  id: string;
  presenter: string;
  title: string;
  pitch: string;
  problem: string;
  targetCustomer: string;
  revenueModel: string;
  startupCost: string;
  timeToLaunch: string;
  marketSize: string;
  unfairAdvantage: string;
  biggestRisk: string;
}

const fieldLimits = Object.freeze({
  id: 120,
  presenter: 120,
  title: 180,
  pitch: 4000,
  problem: 4000,
  targetCustomer: 1000,
  revenueModel: 2000,
  startupCost: 500,
  timeToLaunch: 500,
  marketSize: 500,
  unfairAdvantage: 2000,
  biggestRisk: 2000
});

export function cleanCouncilText(value, maxLength = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function normalizeCouncilConcept(concept = {}) {
  return Object.fromEntries(Object.entries(fieldLimits).map(([field, limit]) => [
    field,
    cleanCouncilText(concept[field], limit)
  ]));
}

export function normalizeCouncilConcepts(concepts) {
  return concepts.map(normalizeCouncilConcept);
}

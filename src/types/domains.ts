/**
 * Layer 3: Domain Architecture
 * 
 * Life mapped across 6 domains. Each domain has:
 * - Current baseline (where you are)
 * - Desired evolution state (where you want to be)
 * - Alignment score (how aligned your actions are)
 * - Friction points (what's blocking you)
 * - Structural changes (what needs to shift)
 * 
 * Goal: Alignment ACROSS domains, not optimization of each.
 */

export type DomainId = 
  | 'identity'       // Who you are, self-concept, values
  | 'relationships'  // Connection, community, love
  | 'wealth'         // Resources, money, abundance
  | 'body_energy'    // Health, vitality, physical state
  | 'work'           // Contribution, career, creative output
  | 'governance';    // Meta-layer: how you manage yourself

export interface DomainState {
  id: DomainId;
  name: string;
  description: string;
  
  // Current state (1-10 scale)
  currentBaseline: number;
  
  // Where you want to be
  desiredState: string;
  
  // How aligned your actions are with your desires (0-100%)
  alignmentScore: number;
  
  // What's creating friction
  frictionPoints: string[];
  
  // Suggested structural changes
  suggestedChanges: string[];
  
  // Last updated
  lastReflection: Date | null;
}

export const DOMAINS: Record<DomainId, {
  name: string;
  description: string;
  keyQuestions: string[];
  alignmentIndicators: string[];
}> = {
  identity: {
    name: 'Identity',
    description: 'Who you are at your core. Your values, beliefs, self-concept, and sense of self.',
    keyQuestions: [
      'Do you know who you are when no one is watching?',
      'Are you living as the person you want to be?',
      'How stable is your sense of self under pressure?',
    ],
    alignmentIndicators: [
      'Decisions feel natural and clear',
      'Low internal conflict',
      'Can articulate your values',
      'Actions match stated beliefs',
    ],
  },
  relationships: {
    name: 'Relationships',
    description: 'Your connections with others. Love, friendship, community, belonging.',
    keyQuestions: [
      'Do you have people who truly see you?',
      'Are your relationships nourishing or draining?',
      'Can you be fully yourself with the people closest to you?',
    ],
    alignmentIndicators: [
      'Feel seen and understood',
      'Can set boundaries without guilt',
      'Give and receive support easily',
      'Relationships feel chosen, not obligated',
    ],
  },
  wealth: {
    name: 'Wealth',
    description: 'Your relationship with resources. Money, abundance, security, exchange of value.',
    keyQuestions: [
      'Does money feel like a tool or a cage?',
      'Are you building something that compounds?',
      'Do you feel secure enough to take aligned risks?',
    ],
    alignmentIndicators: [
      'Money serves your values, not the reverse',
      'Building wealth in ways that feel good',
      'Enough security to make aligned choices',
      'Generous without resentment',
    ],
  },
  body_energy: {
    name: 'Body & Energy',
    description: 'Your physical vessel. Health, vitality, energy, embodiment.',
    keyQuestions: [
      'Do you have the energy to pursue what matters?',
      'Is your body an ally or an obstacle?',
      'Are you building health or borrowing from the future?',
    ],
    alignmentIndicators: [
      'Consistent energy throughout the day',
      'Body feels like home',
      'Sleep, nutrition, movement feel natural',
      'Can trust your physical state',
    ],
  },
  work: {
    name: 'Work & Contribution',
    description: 'How you contribute. Career, creative output, impact, meaningful labor.',
    keyQuestions: [
      'Does your work feel like expression or extraction?',
      'Are you building something you believe in?',
      'Does your contribution match your capabilities?',
    ],
    alignmentIndicators: [
      'Work feels meaningful most days',
      'Using your real gifts',
      'Compensation feels fair',
      'Would do some version of this even for free',
    ],
  },
  governance: {
    name: 'Governance',
    description: 'Meta-layer: how you manage yourself. Systems, habits, decision-making, self-regulation.',
    keyQuestions: [
      'Do you have systems that support your intentions?',
      'Can you make decisions without spiraling?',
      'Do you follow through on what you commit to?',
    ],
    alignmentIndicators: [
      'Decisions feel clear, not agonizing',
      'Have systems that work for you',
      'Trust your own follow-through',
      'Can course-correct without crisis',
    ],
  },
};

// Calculate overall alignment across domains
export function calculateOverallAlignment(domains: Record<string, DomainState> | DomainState[] | null | undefined): number {
  if (!domains) return 0;
  const domainArray = Array.isArray(domains) ? domains : Object.values(domains);
  if (!domainArray || domainArray.length === 0) return 0;
  const sum = domainArray.reduce((acc, d) => acc + (d?.alignmentScore || 0), 0);
  return Math.round(sum / domainArray.length);
}

// Find the domain most in need of attention
export function findPriorityDomain(domains: Record<string, DomainState> | DomainState[]): DomainState | null {
  const domainArray = Array.isArray(domains) ? domains : Object.values(domains);
  if (domainArray.length === 0) return null;
  return domainArray.reduce((lowest, current) => 
    current.alignmentScore < lowest.alignmentScore ? current : lowest
  );
}

// Check for domain drift (significant drop in alignment)
export function detectDomainDrift(
  previous: DomainState[], 
  current: DomainState[],
  threshold: number = 15
): DomainState[] {
  const driftingDomains: DomainState[] = [];
  
  for (const curr of current) {
    const prev = previous.find(p => p.id === curr.id);
    if (prev && (prev.alignmentScore - curr.alignmentScore) >= threshold) {
      driftingDomains.push(curr);
    }
  }
  
  return driftingDomains;
}

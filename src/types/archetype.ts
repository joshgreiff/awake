/**
 * Layer 1: Cognitive Archetype System
 * 
 * 60 archetypes built from:
 * - 10 cognitive orientations (how you process reality)
 * - 6 motivational drivers (why you act)
 * - 5 developmental states (where you are in growth)
 * 
 * This is deeper and more adaptive than MBTI's 16 static types.
 */

// How you process reality
export type CognitiveOrientation = 
  | 'systems_thinker'      // Sees interconnections, thinks in models
  | 'pattern_synthesizer'  // Connects disparate ideas, finds meaning
  | 'relational_processor' // Understands through people and emotions
  | 'execution_focused'    // Thinks in terms of action and results
  | 'abstract_explorer'    // Dwells in concepts and possibilities
  | 'sensory_empiricist'   // Trusts direct experience and data
  | 'narrative_weaver'     // Understands through story and context
  | 'analytical_dissector' // Breaks things apart to understand
  | 'intuitive_knower'     // Trusts gut, pattern-matches unconsciously
  | 'pragmatic_adapter';   // Flexible, context-dependent thinking

export const COGNITIVE_ORIENTATIONS: Record<CognitiveOrientation, {
  name: string;
  description: string;
  strengths: string[];
  blindSpots: string[];
}> = {
  systems_thinker: {
    name: 'Systems Thinker',
    description: 'You see the world as interconnected systems. Cause and effect, feedback loops, emergent properties.',
    strengths: ['Big picture vision', 'Understanding complexity', 'Strategic planning'],
    blindSpots: ['Can over-complicate simple things', 'May miss emotional nuance'],
  },
  pattern_synthesizer: {
    name: 'Pattern Synthesizer',
    description: 'You connect ideas across domains. What looks unrelated to others, you see as deeply linked.',
    strengths: ['Cross-domain insights', 'Creative solutions', 'Meaning-making'],
    blindSpots: ['Can see patterns that aren\'t there', 'May struggle with routine'],
  },
  relational_processor: {
    name: 'Relational Processor',
    description: 'You understand the world through people. Relationships, dynamics, emotional currents.',
    strengths: ['Emotional intelligence', 'Reading people', 'Building trust'],
    blindSpots: ['May over-personalize situations', 'Can neglect logic for harmony'],
  },
  execution_focused: {
    name: 'Execution Focused',
    description: 'You think in terms of action. What needs to be done, how to do it, what results look like.',
    strengths: ['Getting things done', 'Practical solutions', 'Momentum'],
    blindSpots: ['May act before fully understanding', 'Can miss the "why"'],
  },
  abstract_explorer: {
    name: 'Abstract Explorer',
    description: 'You dwell in concepts and possibilities. Ideas excite you more than implementation.',
    strengths: ['Visionary thinking', 'Philosophical depth', 'Possibility awareness'],
    blindSpots: ['May struggle to ground ideas', 'Can get lost in abstraction'],
  },
  sensory_empiricist: {
    name: 'Sensory Empiricist',
    description: 'You trust direct experience and data. What can be observed, measured, felt.',
    strengths: ['Grounded in reality', 'Evidence-based', 'Present awareness'],
    blindSpots: ['May dismiss the intangible', 'Can miss deeper patterns'],
  },
  narrative_weaver: {
    name: 'Narrative Weaver',
    description: 'You understand through story. Context, history, meaning, arc.',
    strengths: ['Contextual understanding', 'Communication', 'Meaning creation'],
    blindSpots: ['May over-narrativize', 'Can miss the numbers'],
  },
  analytical_dissector: {
    name: 'Analytical Dissector',
    description: 'You break things apart to understand. Components, causes, mechanisms.',
    strengths: ['Deep analysis', 'Problem diagnosis', 'Precision'],
    blindSpots: ['May miss the whole for the parts', 'Can over-analyze'],
  },
  intuitive_knower: {
    name: 'Intuitive Knower',
    description: 'You trust your gut. You know before you can explain why.',
    strengths: ['Fast pattern recognition', 'Gut accuracy', 'Reading situations'],
    blindSpots: ['May struggle to articulate reasoning', 'Can\'t always verify'],
  },
  pragmatic_adapter: {
    name: 'Pragmatic Adapter',
    description: 'You\'re flexible. You shift your approach based on what the situation needs.',
    strengths: ['Adaptability', 'Context sensitivity', 'Resourcefulness'],
    blindSpots: ['May lack consistent identity', 'Can seem inconsistent'],
  },
};

// Why you act - your core motivation
export type MotivationalDriver = 
  | 'coherence'   // Alignment, internal peace, integration
  | 'sovereignty' // Freedom, autonomy, self-determination
  | 'mastery'     // Competence, skill, excellence
  | 'impact'      // Contribution, change, legacy
  | 'connection'  // Belonging, love, relationship
  | 'discovery';  // Knowledge, understanding, truth

export const MOTIVATIONAL_DRIVERS: Record<MotivationalDriver, {
  name: string;
  description: string;
  coreQuestion: string;
  satisfiedWhen: string;
  frustratedWhen: string;
}> = {
  coherence: {
    name: 'Coherence',
    description: 'You\'re driven by alignment. Internal peace. Living in integrity with your values.',
    coreQuestion: 'Am I living in alignment with who I really am?',
    satisfiedWhen: 'Your actions, values, and identity feel unified',
    frustratedWhen: 'You feel fragmented, hypocritical, or out of integrity',
  },
  sovereignty: {
    name: 'Sovereignty',
    description: 'You\'re driven by freedom. Autonomy. Being the author of your own life.',
    coreQuestion: 'Am I truly free to choose my own path?',
    satisfiedWhen: 'You have agency over your time, choices, and direction',
    frustratedWhen: 'You feel controlled, trapped, or dependent',
  },
  mastery: {
    name: 'Mastery',
    description: 'You\'re driven by competence. Getting better. Excellence in what matters to you.',
    coreQuestion: 'Am I growing and getting better at what I care about?',
    satisfiedWhen: 'You\'re developing skills and seeing improvement',
    frustratedWhen: 'You feel stagnant, incompetent, or plateaued',
  },
  impact: {
    name: 'Impact',
    description: 'You\'re driven by contribution. Making a difference. Leaving something behind.',
    coreQuestion: 'Does my existence matter? Am I contributing?',
    satisfiedWhen: 'You see your work affecting others positively',
    frustratedWhen: 'You feel useless, irrelevant, or without purpose',
  },
  connection: {
    name: 'Connection',
    description: 'You\'re driven by belonging. Love. Deep relationships with others.',
    coreQuestion: 'Am I truly seen and loved? Do I belong?',
    satisfiedWhen: 'You have deep, authentic relationships',
    frustratedWhen: 'You feel isolated, misunderstood, or alone',
  },
  discovery: {
    name: 'Discovery',
    description: 'You\'re driven by understanding. Knowledge. Getting closer to truth.',
    coreQuestion: 'Do I understand what\'s really going on?',
    satisfiedWhen: 'You\'re learning, exploring, uncovering',
    frustratedWhen: 'You feel confused, ignorant, or deceived',
  },
};

// Where you are in your growth journey
export type DevelopmentalState = 
  | 'fragmented'  // Scattered, reactive, no coherent identity
  | 'emerging'    // Starting to see patterns, building awareness
  | 'integrating' // Actively working to unify, making progress
  | 'expanding'   // Stable foundation, growing into new territory
  | 'mastered';   // Deeply coherent, able to help others

export const DEVELOPMENTAL_STATES: Record<DevelopmentalState, {
  name: string;
  description: string;
  characteristics: string[];
  growthEdge: string;
}> = {
  fragmented: {
    name: 'Fragmented',
    description: 'You\'re pulled in many directions. Different parts of you want different things.',
    characteristics: [
      'Reactive to circumstances',
      'Identity feels unstable',
      'Decisions feel random or forced',
      'High internal conflict',
    ],
    growthEdge: 'Begin noticing patterns in what you avoid and what you\'re drawn to',
  },
  emerging: {
    name: 'Emerging',
    description: 'You\'re starting to see yourself more clearly. Patterns are becoming visible.',
    characteristics: [
      'Growing self-awareness',
      'Can name some core values',
      'Beginning to see patterns',
      'Still inconsistent in action',
    ],
    growthEdge: 'Start acting on insights, not just collecting them',
  },
  integrating: {
    name: 'Integrating',
    description: 'You\'re actively working to unify. Insight is becoming embodied.',
    characteristics: [
      'Connecting insight to action',
      'Building consistent practices',
      'Reducing internal conflict',
      'Making aligned decisions more often',
    ],
    growthEdge: 'Deepen practices, extend alignment to more life domains',
  },
  expanding: {
    name: 'Expanding',
    description: 'You have a stable foundation. Now you\'re growing into new territory.',
    characteristics: [
      'Core identity is stable',
      'Can hold complexity without fracturing',
      'Taking bigger aligned risks',
      'Helping others is natural',
    ],
    growthEdge: 'Expand into domains that previously felt impossible',
  },
  mastered: {
    name: 'Mastered',
    description: 'You\'re deeply coherent. Your presence itself helps others.',
    characteristics: [
      'Deep alignment across domains',
      'Wisdom others recognize',
      'Natural teacher/mentor',
      'Integration is effortless',
    ],
    growthEdge: 'Serve the integration of others and systems',
  },
};

// The full archetype combines all three
export interface Archetype {
  cognitiveOrientation: CognitiveOrientation;
  primaryDriver: MotivationalDriver;
  secondaryDriver?: MotivationalDriver;
  developmentalState: DevelopmentalState;
}

// User's archetype profile with history
export interface ArchetypeProfile {
  current: Archetype;
  history: {
    archetype: Archetype;
    detectedAt: Date;
    confidence: number;
  }[];
  lastAssessment: Date;
}

// Generate archetype name (e.g., "Integrating Systems Thinker driven by Coherence")
export function getArchetypeName(archetype: Archetype): string {
  const state = DEVELOPMENTAL_STATES[archetype.developmentalState].name;
  const orientation = COGNITIVE_ORIENTATIONS[archetype.cognitiveOrientation].name;
  const driver = MOTIVATIONAL_DRIVERS[archetype.primaryDriver].name;
  
  return `${state} ${orientation} driven by ${driver}`;
}

// Get archetype description
export function getArchetypeDescription(archetype: Archetype): string {
  const orientation = COGNITIVE_ORIENTATIONS[archetype.cognitiveOrientation];
  const driver = MOTIVATIONAL_DRIVERS[archetype.primaryDriver];
  const state = DEVELOPMENTAL_STATES[archetype.developmentalState];
  
  return `You're a ${orientation.name} — ${orientation.description.toLowerCase()} Your core motivation is ${driver.name.toLowerCase()}: ${driver.description.toLowerCase()} Currently, you're in a ${state.name.toLowerCase()} state: ${state.description.toLowerCase()}`;
}

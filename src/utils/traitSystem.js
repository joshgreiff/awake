// Trait System - Logarithmic XP curves for motivating progression

/**
 * Calculate XP required to reach a specific trait level
 * Uses logarithmic curve: fast early progress, meaningful later progress
 * Formula: baseXP * (level^1.5)
 */
export function getXPForLevel(level) {
  const baseXP = 100;
  return Math.floor(baseXP * Math.pow(level, 1.5));
}

/**
 * Calculate total XP needed from level 0 to target level
 */
export function getTotalXPForLevel(level) {
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += getXPForLevel(i);
  }
  return total;
}

/**
 * Calculate current level and progress based on total XP
 */
export function calculateLevelFromXP(totalXP) {
  let level = 0;
  let xpSoFar = 0;
  
  while (xpSoFar + getXPForLevel(level + 1) <= totalXP) {
    level++;
    xpSoFar += getXPForLevel(level);
  }
  
  const currentLevelXP = totalXP - xpSoFar;
  const xpNeededForNextLevel = getXPForLevel(level + 1);
  const progress = (currentLevelXP / xpNeededForNextLevel) * 100;
  
  return {
    level,
    currentXP: currentLevelXP,
    xpToNext: xpNeededForNextLevel,
    progress,
    totalXP
  };
}

/**
 * Add XP to a trait and check for level up
 */
export function addTraitXP(trait, xpGain) {
  const newTotalXP = trait.totalXP + xpGain;
  const oldLevel = trait.level;
  const newLevelData = calculateLevelFromXP(newTotalXP);
  
  const leveledUp = newLevelData.level > oldLevel;
  const levelsGained = newLevelData.level - oldLevel;
  
  return {
    ...trait,
    ...newLevelData,
    leveledUp,
    levelsGained,
    xpGained: xpGain
  };
}

/**
 * Initialize a new trait
 */
export function createTrait(name, initialXP = 0) {
  const levelData = calculateLevelFromXP(initialXP);
  
  return {
    id: Date.now() + Math.random(),
    name,
    ...levelData,
    isCustom: false
  };
}

/**
 * Predefined trait suggestions
 */
export const TRAIT_SUGGESTIONS = [
  { name: 'Creativity', description: 'Express yourself through art, writing, and innovation' },
  { name: 'Discipline', description: 'Build consistency and follow through on commitments' },
  { name: 'Communication', description: 'Connect clearly and meaningfully with others' },
  { name: 'Focus', description: 'Maintain attention and avoid distractions' },
  { name: 'Fitness', description: 'Improve physical health and energy' },
  { name: 'Curiosity', description: 'Explore new ideas and learn continuously' },
  { name: 'Empathy', description: 'Understand and connect with others\' feelings' },
  { name: 'Resilience', description: 'Bounce back from challenges and setbacks' },
  { name: 'Courage', description: 'Take bold actions despite fear' },
  { name: 'Mindfulness', description: 'Stay present and aware in each moment' },
  { name: 'Leadership', description: 'Guide and inspire others' },
  { name: 'Organization', description: 'Structure your environment and tasks effectively' }
];

/**
 * Get a trait's color based on its category/name
 */
export function getTraitColor(traitName) {
  const colors = {
    'Creativity': '#9b59b6',
    'Discipline': '#e74c3c',
    'Communication': '#3498db',
    'Focus': '#2ecc71',
    'Fitness': '#16a085',
    'Curiosity': '#f39c12',
    'Empathy': '#e91e63',
    'Resilience': '#795548',
    'Courage': '#ff5722',
    'Mindfulness': '#00bcd4',
    'Leadership': '#ffc107',
    'Organization': '#607d8b'
  };
  
  return colors[traitName] || '#667eea';
}

/**
 * Calculate trait score (0-10) based on level for display
 */
export function getTraitScore(level) {
  // Convert level to 0-10 score with diminishing returns
  // Level 0 = 0, Level 5 = 5, Level 10 = 7, Level 20 = 9, Level 50 = 10
  return Math.min(10, Math.sqrt(level) * 1.5);
} 
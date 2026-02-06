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
  { name: 'Consistency', description: 'Show up regularly and build lasting habits' },
  { name: 'Fitness', description: 'Improve physical health and energy' },
  { name: 'Learning', description: 'Explore new ideas and expand knowledge' },
  { name: 'Empathy', description: 'Understand and connect with others\' feelings' },
  { name: 'Resilience', description: 'Bounce back from challenges and setbacks' },
  { name: 'Courage', description: 'Take bold actions despite fear' },
  { name: 'Mindfulness', description: 'Stay present and aware in each moment' },
  { name: 'Leadership', description: 'Guide and inspire others' },
  { name: 'Organization', description: 'Structure your environment and tasks effectively' },
  { name: 'Patience', description: 'Stay calm and composed through challenges' },
  { name: 'Confidence', description: 'Trust yourself and your abilities' },
  { name: 'Gratitude', description: 'Appreciate what you have and express thanks' },
  { name: 'Authenticity', description: 'Be true to yourself and your values' }
];

/**
 * Get a trait's color based on its category/name
 */
export function getTraitColor(traitName) {
  const colors = {
    'Creativity': '#9b59b6',      // Purple
    'Discipline': '#e74c3c',      // Red
    'Communication': '#3498db',   // Blue
    'Focus': '#2ecc71',           // Green
    'Fitness': '#16a085',         // Teal
    'Curiosity': '#f39c12',       // Orange
    'Empathy': '#e91e63',         // Pink
    'Resilience': '#795548',      // Brown
    'Courage': '#ff5722',         // Deep Orange
    'Mindfulness': '#00bcd4',     // Cyan
    'Leadership': '#ffc107',      // Amber
    'Organization': '#607d8b',    // Blue Grey
    'Consistency': '#8e44ad',     // Dark Purple
    'Learning': '#27ae60',        // Dark Green
    'Patience': '#1abc9c',        // Turquoise
    'Confidence': '#f1c40f',      // Yellow
    'Gratitude': '#e67e22',       // Carrot Orange
    'Authenticity': '#9c27b0'     // Deep Purple
  };
  
  // Generate a consistent color for custom traits based on name
  if (!colors[traitName]) {
    const hash = traitName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 65%, 55%)`;
  }
  
  return colors[traitName];
}

/**
 * Calculate trait score (0-10) based on level for display
 */
export function getTraitScore(level) {
  // Convert level to 0-10 score with diminishing returns
  // Level 0 = 0, Level 5 = 5, Level 10 = 7, Level 20 = 9, Level 50 = 10
  return Math.min(10, Math.sqrt(level) * 1.5);
} 
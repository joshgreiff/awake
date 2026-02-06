// Data Tracking - Historical snapshots for visualization

/**
 * Save a daily snapshot of user data
 */
export function saveDailySnapshot(userId, data) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const snapshot = {
    date: today,
    timestamp: Date.now(),
    needs: data.needs.map(n => ({ name: n.name, value: n.value })),
    traits: data.attributes.map(a => ({ 
      name: a.name, 
      level: a.level, 
      totalXP: a.totalXP,
      score: Math.min(10, Math.sqrt(a.level || 0) * 1.5)
    })),
    character: {
      level: data.character?.level || 0,
      xp: data.character?.xp || 0
    },
    curiosities: data.curiosities.map(c => ({ 
      text: c.text, 
      inspiration: c.inspiration 
    })),
    tasksCompleted: data.dailyTasksCompleted || 0,
    reflectionDone: data.reflectionDone || false
  };
  
  const storageKey = `awake-snapshots-${userId || 'local'}`;
  const stored = localStorage.getItem(storageKey);
  const snapshots = stored ? JSON.parse(stored) : [];
  
  // Check if we already have a snapshot for today
  const existingIndex = snapshots.findIndex(s => s.date === today);
  
  if (existingIndex >= 0) {
    // Update today's snapshot
    snapshots[existingIndex] = snapshot;
  } else {
    // Add new snapshot
    snapshots.push(snapshot);
  }
  
  // Keep last 90 days only
  const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
  const filtered = snapshots.filter(s => s.timestamp > ninetyDaysAgo);
  
  localStorage.setItem(storageKey, JSON.stringify(filtered));
  
  return snapshot;
}

/**
 * Get all snapshots for a user
 */
export function getSnapshots(userId, daysBack = 30) {
  const storageKey = `awake-snapshots-${userId || 'local'}`;
  const stored = localStorage.getItem(storageKey);
  
  if (!stored) return [];
  
  const snapshots = JSON.parse(stored);
  const cutoffDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
  
  return snapshots
    .filter(s => s.timestamp > cutoffDate)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get trend data for a specific need
 */
export function getNeedTrend(userId, needName, daysBack = 30) {
  const snapshots = getSnapshots(userId, daysBack);
  
  return snapshots.map(s => {
    const need = s.needs.find(n => n.name === needName);
    return {
      date: s.date,
      value: need ? need.value : 0
    };
  });
}

/**
 * Get trend data for a specific trait
 */
export function getTraitTrend(userId, traitName, daysBack = 30) {
  const snapshots = getSnapshots(userId, daysBack);
  
  return snapshots.map(s => {
    const trait = s.traits.find(t => t.name === traitName);
    return {
      date: s.date,
      level: trait ? trait.level : 0,
      xp: trait ? trait.totalXP : 0,
      score: trait ? trait.score : 0
    };
  });
}

/**
 * Calculate weekly averages
 */
export function getWeeklyAverages(userId) {
  const snapshots = getSnapshots(userId, 7);
  
  if (snapshots.length === 0) return null;
  
  const needs = {};
  const traits = {};
  
  snapshots.forEach(s => {
    s.needs.forEach(n => {
      if (!needs[n.name]) needs[n.name] = [];
      needs[n.name].push(n.value);
    });
    
    s.traits.forEach(t => {
      if (!traits[t.name]) traits[t.name] = [];
      traits[t.name].push(t.score);
    });
  });
  
  const avgNeeds = Object.entries(needs).map(([name, values]) => ({
    name,
    average: values.reduce((a, b) => a + b, 0) / values.length
  }));
  
  const avgTraits = Object.entries(traits).map(([name, values]) => ({
    name,
    average: values.reduce((a, b) => a + b, 0) / values.length
  }));
  
  return { needs: avgNeeds, traits: avgTraits };
}

/**
 * Identify patterns and insights
 */
export function getInsights(userId) {
  const snapshots = getSnapshots(userId, 30);
  
  if (snapshots.length < 7) {
    return ['Track your progress for a week to unlock insights!'];
  }
  
  const insights = [];
  
  // Find most improved trait
  if (snapshots.length >= 2) {
    const firstSnapshot = snapshots[0];
    const lastSnapshot = snapshots[snapshots.length - 1];
    
    const traitGains = lastSnapshot.traits.map(t => {
      const oldTrait = firstSnapshot.traits.find(ft => ft.name === t.name);
      const xpGain = oldTrait ? t.totalXP - oldTrait.totalXP : t.totalXP;
      return { name: t.name, xpGain };
    });
    
    const mostImproved = traitGains.reduce((max, t) => 
      t.xpGain > max.xpGain ? t : max
    , { xpGain: 0 });
    
    if (mostImproved.xpGain > 0) {
      insights.push(`🚀 ${mostImproved.name} is your most improved trait (+${mostImproved.xpGain} XP this month)!`);
    }
  }
  
  // Find lowest need average
  const weeklyAvg = getWeeklyAverages(userId);
  if (weeklyAvg) {
    const lowestNeed = weeklyAvg.needs.reduce((min, n) => 
      n.average < min.average ? n : min
    );
    
    if (lowestNeed.average < 50) {
      insights.push(`💡 Your ${lowestNeed.name} has been low this week. Consider focusing on it!`);
    }
  }
  
  // Check reflection consistency
  const reflectionCount = snapshots.filter(s => s.reflectionDone).length;
  const reflectionRate = (reflectionCount / snapshots.length) * 100;
  
  if (reflectionRate > 80) {
    insights.push(`🔥 ${reflectionRate.toFixed(0)}% reflection streak! You're crushing it!`);
  } else if (reflectionRate < 30) {
    insights.push(`📝 Only ${reflectionRate.toFixed(0)}% reflection rate. Daily reflections unlock the most growth!`);
  }
  
  return insights;
}

/**
 * Get stats for today vs yesterday
 */
export function getDailyComparison(userId) {
  const snapshots = getSnapshots(userId, 2);
  
  if (snapshots.length < 2) return null;
  
  const today = snapshots[snapshots.length - 1];
  const yesterday = snapshots[snapshots.length - 2];
  
  const needChanges = today.needs.map(n => {
    const oldNeed = yesterday.needs.find(yn => yn.name === n.name);
    return {
      name: n.name,
      current: n.value,
      previous: oldNeed ? oldNeed.value : n.value,
      change: oldNeed ? n.value - oldNeed.value : 0
    };
  });
  
  return { needs: needChanges };
} 
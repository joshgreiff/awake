import Dexie from 'dexie';

// Initialize the IndexedDB database
const db = new Dexie('AwakeGoalsDB');
db.version(1).stores({
  goals: 'id,parentId,title,position', // Indexing fields for efficient querying
  edges: 'id,source,target,type', // New store for arbitrary connections
  reflections: 'id,curiosityId,date,text', // New store for reflections
  habits: 'id,title,curiosityId,createdAt,streak,lastCompleted', // New store for habits
});

// Function to add a goal
export const addGoal = async (goal) => {
  await db.goals.put(goal);
};

// Function to get all goals
export const getGoals = async () => {
  return await db.goals.toArray();
};

// Function to update a goal
export const updateGoal = async (id, updates) => {
  await db.goals.update(id, updates);
};

// Function to delete a goal
export const deleteGoal = async (id) => {
  await db.goals.delete(id);
};

// Function to clear all goals (for testing/debugging purposes)
export const clearGoals = async () => {
  await db.goals.clear();
};

// --- Edge functions ---

// Add an edge
export const addEdge = async (edge) => {
  await db.edges.put(edge);
};

// Get all edges
export const getEdges = async () => {
  return await db.edges.toArray();
};

// Update an edge
export const updateEdge = async (id, updates) => {
  await db.edges.update(id, updates);
};

// Delete an edge
export const deleteEdge = async (id) => {
  await db.edges.delete(id);
};

// Clear all edges
export const clearEdges = async () => {
  await db.edges.clear();
};

// --- Reflection functions ---
export const addReflection = async (reflection) => {
  await db.reflections.put(reflection);
};

export const getReflectionsByCuriosity = async (curiosityId) => {
  return await db.reflections.where('curiosityId').equals(curiosityId).sortBy('date');
};

export const clearReflections = async () => {
  await db.reflections.clear();
};

// --- Habit functions ---
export const addHabit = async (habit) => {
  // Ensure buffs is always an array
  if (!Array.isArray(habit.buffs)) habit.buffs = [];
  await db.habits.put(habit);
};

export const getHabits = async () => {
  return await db.habits.toArray();
};

export const updateHabit = async (id, updates) => {
  // Ensure buffs is always an array if present
  if (updates.buffs && !Array.isArray(updates.buffs)) updates.buffs = [];
  await db.habits.update(id, updates);
};

export const deleteHabit = async (id) => {
  await db.habits.delete(id);
};

export const clearHabits = async () => {
  await db.habits.clear();
};

export default db;

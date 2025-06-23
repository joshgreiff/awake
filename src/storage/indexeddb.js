import Dexie from 'dexie';

// Initialize the IndexedDB database
const db = new Dexie('AwakeGoalsDB');
db.version(1).stores({
  goals: 'id,parentId,title,position', // Indexing fields for efficient querying
  edges: 'id,source,target,type', // New store for arbitrary connections
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

export default db;

import Dexie from 'dexie';

// Initialize the IndexedDB database
const db = new Dexie('AwakeGoalsDB');
db.version(1).stores({
  goals: 'id,parentId,title,position', // Indexing fields for efficient querying
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



export default db;

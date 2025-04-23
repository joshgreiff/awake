import React, { useState, useEffect } from "react";
import { addGoal, getGoals, updateGoal, clearGoals } from "../storage/indexeddb";
import { publishGoalToNostr } from "../utils/nostrPublish";
import "../assets/styles/GoalForm.css";

const GoalForm = () => {
  const [goalTitle, setGoalTitle] = useState("");
  const [goals, setGoals] = useState([]);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editingGoalTitle, setEditingGoalTitle] = useState("");
  const [parentId, setParentId] = useState(null);
  const [expandedGoals, setExpandedGoals] = useState({});

  // Load goals from IndexedDB on mount
  useEffect(() => {
    const fetchGoals = async () => {
      const storedGoals = await getGoals();
      setGoals(storedGoals);
    };
    fetchGoals();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
  
    const timestamp = Date.now();
    const newGoal = {
      id: timestamp.toString(), // Ensure it's a string for Nostr tag consistency
      title: goalTitle.trim(),
      parentId: parentId || null,
      position: null // Optional: prep for visualizer layout persistence
    };
  
    try {
      await addGoal(newGoal);               // Store locally
      await publishGoalToNostr(newGoal);    // Publish to Nostr
      setGoals((prev) => [...prev, newGoal]); // Update UI
    } catch (error) {
      console.error("Failed to save goal:", error);
    }
  
    setGoalTitle(""); // Clear form
    setParentId(null);
  };

  // Handle editing a goal
  const handleEdit = (goal) => {
    setEditingGoalId(goal.id);
    setEditingGoalTitle(goal.title);
  };

  // Handle saving the edited goal
  const handleSaveEdit = async (id) => {
    if (!editingGoalTitle.trim()) return;
    await updateGoal(id, { title: editingGoalTitle });
    setGoals(goals.map(goal => goal.id === id ? { ...goal, title: editingGoalTitle } : goal));
    setEditingGoalId(null);
    setEditingGoalTitle("");
  };

  // Handle clearing all goals
  const handleClearGoals = async () => {
    await clearGoals();
    setGoals([]); // Reset local state
  };

  // Toggle sub-goal visibility
  const toggleExpand = (goalId) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId]
    }));
  };

  // Render goals recursively with improved sub-goal indentation
  const renderGoals = (parentId = null, level = 0) => {
    return goals.filter(goal => goal.parentId === parentId).map(goal => (
      <li key={goal.id} className={`goal-item level-${level}`}>
        <button className="expand-btn" onClick={() => toggleExpand(goal.id)}>
          {expandedGoals[goal.id] ? "▼" : "▶"}
        </button>
        {editingGoalId === goal.id ? (
          <>
            <input
              type="text"
              value={editingGoalTitle}
              onChange={(e) => setEditingGoalTitle(e.target.value)}
              className="goal-edit-input"
            />
            <button className="save-btn" onClick={() => handleSaveEdit(goal.id)}>Save</button>
          </>
        ) : (
          <>
            <span className="goal-title">{goal.title}</span> 
            <button className="edit-btn" onClick={() => handleEdit(goal)}>Edit</button>
          </>
        )}
        {expandedGoals[goal.id] && <ul className="sub-goals">{renderGoals(goal.id, level + 1)}</ul>}
      </li>
    ));
  };

  return (
    <div className="goal-form-container">
      <h2>Set a New Goal</h2>
      <form onSubmit={handleSubmit} className="goal-form">
        <input
          type="text"
          value={goalTitle}
          onChange={(e) => setGoalTitle(e.target.value)}
          placeholder="Enter goal..."
          className="goal-input"
        />
        <select onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)} className="goal-select">
          <option value="">No Parent (Top-Level Goal)</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>{goal.title}</option>
          ))}
        </select>
        <button type="submit" className="add-goal-btn">Add Goal</button>
      </form>
      <h3>Your Goals</h3>
      <ul className="goal-list">{renderGoals()}</ul>
      <button onClick={handleClearGoals} className="clear-goals-btn">Clear All Goals</button>
    </div>
  );
};

export default GoalForm;

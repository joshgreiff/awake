import React, { useState } from "react";
import { useCuriosityContext } from "../context/CuriosityContext";
import "../assets/styles/GoalForm.css";

const GoalForm = () => {
  const [goalTitle, setGoalTitle] = useState("");
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editingGoalTitle, setEditingGoalTitle] = useState("");
  const [parentId, setParentId] = useState(null);
  const [expandedGoals, setExpandedGoals] = useState({});

  const { curiosities, addCuriosity, updateCuriosity, clearCuriosities } = useCuriosityContext();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    const timestamp = Date.now();
    const newCuriosity = {
      id: timestamp.toString(),
      title: goalTitle.trim(),
      parentId: parentId || null,
      position: null
    };
    try {
      await addCuriosity(newCuriosity);
    } catch (error) {
      console.error("Failed to save curiosity:", error);
    }
    setGoalTitle("");
    setParentId(null);
  };

  const handleEdit = (curiosity) => {
    setEditingGoalId(curiosity.id);
    setEditingGoalTitle(curiosity.title);
  };

  const handleSaveEdit = async (id) => {
    if (!editingGoalTitle.trim()) return;
    await updateCuriosity(id, { title: editingGoalTitle });
    setEditingGoalId(null);
    setEditingGoalTitle("");
  };

  const handleClearCuriosities = async () => {
    await clearCuriosities();
  };

  const toggleExpand = (curiosityId) => {
    setExpandedGoals(prev => ({
      ...prev,
      [curiosityId]: !prev[curiosityId]
    }));
  };

  const renderCuriosities = (parentId = null, level = 0) => {
    return curiosities.filter(c => c.parentId === parentId).map(curiosity => (
      <li key={curiosity.id} className={`goal-item level-${level}`}>
        <button className="expand-btn" onClick={() => toggleExpand(curiosity.id)}>
          {expandedGoals[curiosity.id] ? "▼" : "▶"}
        </button>
        {editingGoalId === curiosity.id ? (
          <>
            <input
              type="text"
              value={editingGoalTitle}
              onChange={(e) => setEditingGoalTitle(e.target.value)}
              className="goal-edit-input"
            />
            <button className="save-btn" onClick={() => handleSaveEdit(curiosity.id)}>Save</button>
          </>
        ) : (
          <>
            <span className="goal-title">{curiosity.title}</span> 
            <button className="edit-btn" onClick={() => handleEdit(curiosity)}>Edit</button>
          </>
        )}
        {expandedGoals[curiosity.id] && <ul className="sub-goals">{renderCuriosities(curiosity.id, level + 1)}</ul>}
      </li>
    ));
  };

  return (
    <div className="goal-form-container">
      <h2>Add a New Curiosity</h2>
      <form onSubmit={handleSubmit} className="goal-form">
        <input
          type="text"
          value={goalTitle}
          onChange={(e) => setGoalTitle(e.target.value)}
          placeholder="What are you curious about, want to explore, or might work on?"
          className="goal-input"
        />
        <select onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)} className="goal-select">
          <option value="">No Parent (Top-Level Curiosity)</option>
          {curiosities.map((curiosity) => (
            <option key={curiosity.id} value={curiosity.id}>{curiosity.title}</option>
          ))}
        </select>
        <button type="submit" className="add-goal-btn">Add Curiosity</button>
      </form>
      <h3>Your Curiosities</h3>
      <ul className="goal-list">{renderCuriosities()}</ul>
      <button onClick={handleClearCuriosities} className="clear-goals-btn">Clear All Curiosities</button>
    </div>
  );
};

export default GoalForm;

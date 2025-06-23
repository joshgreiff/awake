import React, { useState } from "react";
import "../assets/styles/GoalForm.css";

const DailyReflectionModal = ({ curiosities, onSave, onCancel, initialSelected = [], initialNote = "" }) => {
  const [selected, setSelected] = useState(initialSelected);
  const [note, setNote] = useState(initialNote);

  const handleToggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onSave(selected, note);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Daily Reflection</h2>
        <p>What feels most important or exciting today? Select your focus areas:</p>
        <ul className="curiosity-list-modal">
          {curiosities.map((c) => (
            <li key={c.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={() => handleToggle(c.id)}
                />
                {c.title}
              </label>
            </li>
          ))}
        </ul>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why are you choosing these today? Any intentions or feelings?"
          rows={4}
          style={{ width: "100%", marginTop: 12 }}
        />
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button className="add-goal-btn" onClick={handleSave}>Save</button>
          <button className="clear-goals-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default DailyReflectionModal; 
import React, { useState } from "react";
import { useCuriosityContext } from "../context/CuriosityContext";
import { addReflection, getReflectionsByCuriosity } from "../storage/indexeddb";

const STAT_CONFIG = [
  { key: "curiosity", label: "Curiosity", color: "#7F5AF0", value: 70 },
  { key: "action", label: "Action", color: "#2CB67D", value: 50 },
  { key: "reflection", label: "Reflection", color: "#FFD803", value: 30 },
  { key: "resilience", label: "Resilience", color: "#FF6F61", value: 40 },
];

const HomePage = ({ onOpenReflection, reflectionData, onAddCuriosity }) => {
  const { curiosities, updateCuriosity, deleteCuriosity } = useCuriosityContext();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showCuriosityInfo, setShowCuriosityInfo] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [reflectingId, setReflectingId] = useState(null);
  const [reflectionText, setReflectionText] = useState("");
  const [reflections, setReflections] = useState([]);
  const [loadingReflections, setLoadingReflections] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);

  // Placeholder values for level and XP
  const level = 3;
  const xp = 120;
  const xpToNext = 200;

  const handleAdd = () => {
    if (newTitle.trim()) {
      onAddCuriosity(newTitle.trim());
      setNewTitle("");
      setShowAddModal(false);
    }
  };

  const handleEdit = (curiosity) => {
    setEditingId(curiosity.id);
    setEditingTitle(curiosity.title);
    setMenuOpenId(null);
  };

  const handleSaveEdit = async (id) => {
    if (editingTitle.trim()) {
      await updateCuriosity(id, { title: editingTitle });
      setEditingId(null);
      setEditingTitle("");
    }
  };

  const handleDelete = async (id) => {
    await deleteCuriosity(id);
    setMenuOpenId(null);
  };

  const handleReflect = async (curiosity) => {
    setReflectingId(curiosity.id);
    setReflectionText("");
    setLoadingReflections(true);
    const loaded = await getReflectionsByCuriosity(curiosity.id);
    setReflections(loaded);
    setLoadingReflections(false);
  };

  const handleSaveReflection = async () => {
    if (!reflectionText.trim()) return;
    const newReflection = {
      id: Date.now().toString(),
      curiosityId: reflectingId,
      date: new Date().toISOString(),
      text: reflectionText.trim(),
    };
    await addReflection(newReflection);
    setReflections([...reflections, newReflection]);
    setReflectionText("");
  };

  const handleCloseReflection = () => {
    setReflectingId(null);
    setReflectionText("");
    setReflections([]);
  };

  // --- Launchpad Layout ---
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 0" }}>
      {/* Top: Avatar, Level, XP, Stats */}
      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40, gap: 32 }}>
        {/* Avatar & Level */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ fontSize: 64, background: "var(--awake-surface)", borderRadius: "50%", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--awake-shadow)" }}>
            🚀
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 22 }}>Level {level}</div>
            <div style={{ fontSize: 14, color: "var(--awake-text-muted)", marginTop: 2 }}>XP: {xp} / {xpToNext}</div>
            <div style={{ background: "#393A4B", borderRadius: 8, height: 8, width: 120, marginTop: 6 }}>
              <div style={{ background: "var(--awake-primary)", height: 8, borderRadius: 8, width: `${(xp / xpToNext) * 100}%` }} />
            </div>
          </div>
        </div>
        {/* Stat Indicators */}
        <div style={{ display: "flex", gap: 32 }}>
          {STAT_CONFIG.map(stat => (
            <div key={stat.key} style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 600, color: stat.color }}>{stat.label}</div>
              <div style={{ background: "#393A4B", borderRadius: 8, height: 8, width: 80, margin: "6px auto" }}>
                <div style={{ background: stat.color, height: 8, borderRadius: 8, width: `${stat.value}%` }} />
              </div>
              <div style={{ fontSize: 13, color: "var(--awake-text-muted)" }}>{stat.value} / 100</div>
            </div>
          ))}
        </div>
      </section>

      {/* Center: Launch Buttons */}
      <section style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 40 }}>
        <button className="add-goal-btn" style={{ fontSize: 20, padding: "18px 36px" }} onClick={onOpenReflection}>
          Reflect
        </button>
        <button className="add-goal-btn" style={{ fontSize: 20, padding: "18px 36px" }} onClick={() => setShowAddModal(true)}>
          Take Action
        </button>
        <button className="add-goal-btn" style={{ fontSize: 20, padding: "18px 36px" }}>
          Explore
        </button>
      </section>

      {/* Bottom: Curiosity Cards & Progress */}
      <section style={{ margin: "40px 0", textAlign: "center", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
          <h3 style={{ marginBottom: 0 }}>Your Curiosities</h3>
          <span
            style={{
              display: "inline-block",
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "var(--awake-surface)",
              color: "var(--awake-accent)",
              fontWeight: 700,
              fontSize: 16,
              lineHeight: "20px",
              cursor: "pointer",
              border: "1.5px solid var(--awake-accent)",
              position: "relative"
            }}
            onMouseEnter={() => setShowCuriosityInfo(true)}
            onMouseLeave={() => setShowCuriosityInfo(false)}
            onClick={() => setShowCuriosityInfo((v) => !v)}
            title="What are curiosities?"
          >
            ?
            {showCuriosityInfo && (
              <span
                style={{
                  position: "absolute",
                  top: 28,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "var(--awake-card)",
                  color: "var(--awake-text)",
                  border: "1px solid var(--awake-accent)",
                  borderRadius: 8,
                  padding: "10px 16px",
                  fontSize: 14,
                  boxShadow: "var(--awake-shadow)",
                  zIndex: 10,
                  minWidth: 220,
                  maxWidth: 300,
                  textAlign: "left"
                }}
              >
                <strong>Curiosities</strong> are ideas, projects, or interests you want to explore. Add anything that sparks your interest or that you might want to work on, no matter how big or small.
              </span>
            )}
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center", minHeight: 120 }}>
          {curiosities.length === 0 ? (
            <span style={{ color: "var(--awake-text-muted)" }}>No curiosities yet. Add your first one!</span>
          ) : (
            curiosities.map((c) => (
              <div key={c.id} style={{ background: "var(--awake-card)", borderRadius: "var(--awake-radius)", boxShadow: "var(--awake-shadow)", padding: 24, minWidth: 180, maxWidth: 220, textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-start", position: "relative" }}>
                {editingId === c.id ? (
                  <>
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={e => setEditingTitle(e.target.value)}
                      style={{ width: "100%", marginBottom: 8 }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="add-goal-btn" onClick={() => handleSaveEdit(c.id)}>Save</button>
                      <button className="clear-goals-btn" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span style={{ fontWeight: 600, fontSize: "1.1rem", color: "var(--awake-text)" }}>{c.title}</span>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        style={{ background: "none", color: "var(--awake-primary)", border: "none", cursor: "pointer", fontSize: 18, padding: 0, marginRight: 4 }}
                        title="Reflect"
                        onClick={() => handleReflect(c)}
                      >
                        💬
                      </button>
                      <button
                        style={{ background: "none", color: "var(--awake-text-muted)", border: "none", cursor: "pointer", fontSize: 22, padding: 0, marginLeft: "auto" }}
                        title="More"
                        onClick={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
                      >
                        ⋯
                      </button>
                      {menuOpenId === c.id && (
                        <div style={{
                          position: "absolute",
                          top: 36,
                          right: 12,
                          background: "var(--awake-surface)",
                          border: "1px solid var(--awake-border)",
                          borderRadius: 8,
                          boxShadow: "var(--awake-shadow)",
                          zIndex: 20,
                          minWidth: 100,
                          padding: 0
                        }}>
                          <button
                            style={{
                              display: "block",
                              width: "100%",
                              background: "none",
                              color: "var(--awake-accent)",
                              border: "none",
                              padding: "10px 16px",
                              textAlign: "left",
                              cursor: "pointer",
                              fontSize: 15
                            }}
                            onClick={() => handleEdit(c)}
                          >
                            Edit
                          </button>
                          <button
                            style={{
                              display: "block",
                              width: "100%",
                              background: "none",
                              color: "#e05a47",
                              border: "none",
                              padding: "10px 16px",
                              textAlign: "left",
                              cursor: "pointer",
                              fontSize: 15
                            }}
                            onClick={() => handleDelete(c.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        <button className="add-goal-btn" style={{ marginTop: 20 }} onClick={() => setShowAddModal(true)}>Add a Curiosity</button>
        {showAddModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Add a New Curiosity</h3>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="What are you curious about?"
                style={{ width: "100%", marginBottom: 12 }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="add-goal-btn" onClick={handleAdd}>Save</button>
                <button className="clear-goals-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {reflectingId && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Reflect on Curiosity</h3>
              <textarea
                value={reflectionText}
                onChange={e => setReflectionText(e.target.value)}
                placeholder="What did you explore, learn, or feel about this curiosity?"
                rows={4}
                style={{ width: "100%", marginBottom: 12 }}
              />
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button className="add-goal-btn" onClick={handleSaveReflection}>Save Reflection</button>
                <button className="clear-goals-btn" onClick={handleCloseReflection}>Close</button>
              </div>
              <h4 style={{ marginTop: 16 }}>Past Reflections</h4>
              {loadingReflections ? (
                <div style={{ color: "var(--awake-text-muted)" }}>Loading...</div>
              ) : reflections.length === 0 ? (
                <div style={{ color: "var(--awake-text-muted)" }}>No reflections yet.</div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {reflections.map((r) => (
                    <li key={r.id} style={{ marginBottom: 12, background: "var(--awake-surface)", borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 13, color: "var(--awake-text-muted)", marginBottom: 4 }}>{new Date(r.date).toLocaleString()}</div>
                      <div>{r.text}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Recent Progress & Encouragement */}
      <section style={{ margin: "40px 0", textAlign: "center" }}>
        <h3>Recent Progress</h3>
        <div style={{ color: "var(--awake-text-muted)", fontSize: "1.1rem" }}>
          {/* Placeholder for streaks, new curiosities, etc. */}
          You've explored <strong>3 new curiosities</strong> this week!<br />
          Your current streak: <strong>4 days</strong> of showing up.
        </div>
        <div style={{ marginTop: 24, fontStyle: "italic", color: "var(--awake-accent)" }}>
          "It's okay to change direction. Exploration is progress."
        </div>
      </section>
    </div>
  );
};

export default HomePage; 
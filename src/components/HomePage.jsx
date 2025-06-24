import React, { useState, useEffect } from "react";
import { useCuriosityContext } from "../context/CuriosityContext";
import { addReflection, getReflectionsByCuriosity, getHabits, addHabit, updateHabit, deleteHabit } from "../storage/indexeddb";
import confetti from "canvas-confetti";
import EmojiPicker from 'emoji-picker-react';

const STAT_CONFIG = [
  { key: "curiosity", label: "Curiosity", color: "#7F5AF0", value: 70 },
  { key: "action", label: "Action", color: "#2CB67D", value: 50 },
  { key: "reflection", label: "Reflection", color: "#FFD803", value: 30 },
  { key: "resilience", label: "Resilience", color: "#FF6F61", value: 40 },
];

const STAT_OPTIONS = [
  { key: "curiosity", label: "Curiosity" },
  { key: "action", label: "Action" },
  { key: "reflection", label: "Reflection" },
  { key: "resilience", label: "Resilience" },
];

const STAT_ICONS = {
  curiosity: "💡",
  action: "⚡",
  reflection: "📝",
  resilience: "🔥",
};

// Add styles for micro-animations
const cardAnim = {
  transition: 'transform 0.18s cubic-bezier(.4,2,.6,1), box-shadow 0.18s',
  willChange: 'transform',
};
const cardHoverAnim = {
  transform: 'scale(1.035)',
  boxShadow: '0 6px 32px 0 #0002, 0 1.5px 8px 0 #7F5AF055',
  zIndex: 2,
};
const pulseAnim = {
  animation: 'pulseBtn 0.4s',
};
const statPulseAnim = {
  animation: 'statPulse 0.7s',
};

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
  const [habits, setHabits] = useState([]);
  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [stats, setStats] = useState({
    curiosity: 70,
    action: 50,
    reflection: 30,
    resilience: 40,
  });
  const [habitDoneToday, setHabitDoneToday] = useState({});
  const [statBuffed, setStatBuffed] = useState(null);
  const [editingHabit, setEditingHabit] = useState(null);
  const [toast, setToast] = useState(null);
  const [confetti, setConfetti] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [donePulseId, setDonePulseId] = useState(null);
  const [hoveredCardId, setHoveredCardId] = useState(null);

  // Placeholder values for level and XP
  const level = 3;
  const xp = 120;
  const xpToNext = 200;

  // Load user stats from localStorage or fallback to default
  const getUserStats = () => {
    const saved = localStorage.getItem('awake_user_stats');
    if (saved) return JSON.parse(saved);
    return [
      { key: "curiosity", label: "Curiosity", emoji: "💡" },
      { key: "action", label: "Action", emoji: "⚡" },
      { key: "reflection", label: "Reflection", emoji: "📝" },
      { key: "resilience", label: "Resilience", emoji: "🔥" },
    ];
  };
  const [userStats, setUserStats] = useState(getUserStats());

  // Fetch habits on mount
  useEffect(() => {
    getHabits().then(setHabits);
  }, []);

  useEffect(() => {
    // Load stats from localStorage on mount
    const savedStats = localStorage.getItem('awake_stats');
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
  }, []);

  useEffect(() => {
    // Save stats to localStorage whenever they change
    localStorage.setItem('awake_stats', JSON.stringify(stats));
  }, [stats]);

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

  const handleHabitAdded = (habit) => {
    setHabits(habits => [...habits, habit]);
  };

  function showCelebration(message) {
    setToast(message);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      zIndex: 3000,
    });
    setTimeout(() => setToast(null), 3000);
  }

  const handleMarkHabitDone = async (habit) => {
    setDonePulseId(habit.id);
    setTimeout(() => setDonePulseId(null), 400);
    const today = new Date().toISOString().slice(0, 10);
    if (habit.lastCompleted && habit.lastCompleted.slice(0, 10) === today) return;
    // Update streak
    let newStreak = 1;
    if (habit.lastCompleted) {
      const last = new Date(habit.lastCompleted);
      const diff = (new Date(today) - new Date(last.toISOString().slice(0, 10))) / (1000 * 60 * 60 * 24);
      if (diff === 1) newStreak = (habit.streak || 0) + 1;
    }
    // Apply buffs
    let newStats = { ...stats };
    habit.buffs.forEach(buff => {
      newStats[buff.stat] = Math.min(100, (newStats[buff.stat] || 0) + buff.amount);
    });
    setStats(newStats);
    setStatBuffed(habit.buffs.map(b => b.stat));
    setTimeout(() => setStatBuffed(null), 1200);
    // Update habit in DB and state
    const updatedHabit = { ...habit, lastCompleted: today, streak: newStreak };
    await updateHabit(habit.id, { lastCompleted: today, streak: newStreak });
    setHabits(habits => habits.map(h => h.id === habit.id ? updatedHabit : h));
    setHabitDoneToday(h => ({ ...h, [habit.id]: true }));
  };

  const handleEditHabit = (habit) => {
    setEditingHabit(habit);
    setShowAddHabitModal(true);
  };

  const handleDeleteHabit = async (habit) => {
    if (window.confirm(`Delete habit "${habit.title}"? This cannot be undone.`)) {
      await deleteHabit(habit.id);
      setHabits(habits => habits.filter(h => h.id !== habit.id));
    }
  };

  // --- Launchpad Layout ---
  return (
    <div className="homepage-container" style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Mission Hero Section */}
      <section className="homepage-mission-hero" style={{ background: "linear-gradient(90deg, #7F5AF0 0%, #2CB67D 100%)", color: "#fff", borderRadius: 16, padding: "32px 24px", marginBottom: 40, boxShadow: "var(--awake-shadow)" }}>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 800, marginBottom: 12 }}>Awake Mission</h1>
        <p style={{ fontSize: "1.25rem", fontWeight: 500, maxWidth: 700, margin: 0 }}>
          A personalized, evolving, self-development system that helps users become the most aligned version of themselves through accountability, habit-building, community, and intelligent guidance.
        </p>
      </section>
      {/* After Mission Hero Section, add daily affirmation */}
      <section className="homepage-affirmation" style={{
        background: "linear-gradient(90deg, #FFD803 0%, #2CB67D 100%)",
        color: "#232136",
        borderRadius: 14,
        padding: "18px 20px",
        fontWeight: 700,
        fontSize: "1.1rem",
        marginBottom: 24,
        textAlign: "center"
      }}>
        I am the luckiest person in the world. Everything goes my way because I take action toward my dreams.
      </section>
      {/* Top: Avatar, Level, XP, Stats */}
      <section className="homepage-top-section" style={{ display: "flex", alignItems: "center", marginBottom: 40, gap: 32 }}>
        {/* Avatar & Level */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div className="homepage-avatar" style={{ background: "var(--awake-surface)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--awake-shadow)" }}>
            🚀
          </div>
          <div>
            <div className="homepage-level" style={{ fontWeight: 700 }}>Level {level}</div>
            <div style={{ fontSize: 14, color: "var(--awake-text-muted)", marginTop: 2 }}>XP: {xp} / {xpToNext}</div>
            <div className="homepage-xp-bar" style={{ background: "#393A4B", borderRadius: 8, height: 8, marginTop: 6 }}>
              <div style={{ background: "var(--awake-primary)", height: 8, borderRadius: 8, width: `${(xp / xpToNext) * 100}%` }} />
            </div>
          </div>
        </div>
        {/* Stat Indicators */}
        <div className="homepage-stats" style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          {userStats.map(stat => (
            <div key={stat.key} style={{ textAlign: "center", transition: "0.3s", minWidth: 90 }}>
              <div style={{ fontSize: 22 }}>{stat.emoji}</div>
              <div className="homepage-stat-label" style={{ fontWeight: 600, color: "#FFD803" }}>{stat.label}</div>
              <div
                className="homepage-stat-bar"
                style={{
                  background: "#393A4B",
                  borderRadius: 8,
                  height: 8,
                  width: 80,
                  margin: "6px auto",
                  boxShadow: statBuffed && statBuffed.includes(stat.key) ? `0 0 10px 2px #FFD803` : undefined,
                  transition: "box-shadow 0.3s",
                  ...(statBuffed && statBuffed.includes(stat.key) ? statPulseAnim : {}),
                }}
              >
                <div
                  style={{
                    background: "#FFD803",
                    height: 8,
                    borderRadius: 8,
                    width: `${stats[stat.key] || 0}%`,
                    transition: "width 0.5s",
                  }}
                />
              </div>
              <div className="homepage-stat-value" style={{ fontSize: 13, color: "var(--awake-text-muted)" }}>{stats[stat.key] || 0} / 100</div>
            </div>
          ))}
        </div>
      </section>

      {/* Center: Launch Buttons */}
      <section className="homepage-launch-buttons" style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 40 }}>
        <button className="add-goal-btn homepage-launch-btn" onClick={onOpenReflection}>
          Reflect
        </button>
        <button className="add-goal-btn homepage-launch-btn" onClick={() => setShowAddModal(true)}>
          Take Action
        </button>
        <button className="add-goal-btn homepage-launch-btn">
          Explore
        </button>
      </section>

      {/* Bottom: Curiosity Cards & Progress */}
      <section style={{ margin: "40px 0", textAlign: "center", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
          <h3 className="homepage-section-heading" style={{ marginBottom: 0 }}>Your Curiosities</h3>
          <span
            className="homepage-info-btn"
            style={{
              display: "inline-block",
              borderRadius: "50%",
              background: "var(--awake-surface)",
              color: "var(--awake-accent)",
              fontWeight: 700,
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
                className="homepage-info-tooltip"
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
                  textAlign: "left"
                }}
              >
                <strong>Curiosities</strong> are ideas, projects, or interests you want to explore. Add anything that sparks your interest or that you might want to work on, no matter how big or small.
              </span>
            )}
          </span>
        </div>
        <div className="homepage-curiosities-grid" style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center", minHeight: 120 }}>
          {curiosities.length === 0 ? (
            <span style={{ color: "var(--awake-text-muted)" }}>No curiosities yet. Add your first one!</span>
          ) : (
            curiosities.map((c) => (
              <div key={c.id} className="homepage-curiosity-card" style={{ background: "var(--awake-card)", borderRadius: "var(--awake-radius)", boxShadow: "var(--awake-shadow)", padding: 24, minWidth: 180, maxWidth: 220, textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-start", position: "relative" }}>
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
                    <span className="homepage-curiosity-title" style={{ fontWeight: 600, fontSize: "1.1rem", color: "var(--awake-text)" }}>{c.title}</span>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        className="homepage-curiosity-btn"
                        style={{ background: "none", color: "var(--awake-primary)", border: "none", cursor: "pointer", fontSize: 18, padding: 0, marginRight: 4 }}
                        title="Reflect"
                        onClick={() => handleReflect(c)}
                      >
                        💬
                      </button>
                      <button
                        className="homepage-curiosity-menu-btn"
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
            <div className="modal-content homepage-modal-content">
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
            <div className="modal-content homepage-modal-content">
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

      {/* Habits Section */}
      <section className="homepage-habits-section" style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Habits</h3>
          <button className="add-goal-btn" onClick={() => setShowAddHabitModal(true)} style={{ borderRadius: 20, padding: "6px 18px", fontWeight: 600, fontSize: 15 }}>+ Add Habit</button>
        </div>
        {habits.length === 0 ? (
          <div style={{ color: "var(--awake-text-muted)", textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🌱</div>
            <div>No habits yet. Add your first one to start your journey!</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center" }}>
            {habits.map(habit => (
              <div
                key={habit.id}
                style={{
                  ...cardAnim,
                  ...(hoveredCardId === habit.id ? cardHoverAnim : {}),
                  background: "var(--awake-card)",
                  borderRadius: 16,
                  boxShadow: "var(--awake-shadow)",
                  padding: 20,
                  minWidth: 200,
                  maxWidth: 240,
                  textAlign: "left",
                  position: "relative",
                  border: "1.5px solid #7F5AF0",
                  transition: 'box-shadow 0.2s, border 0.2s, transform 0.18s cubic-bezier(.4,2,.6,1)',
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
                onMouseEnter={() => setHoveredCardId(habit.id)}
                onMouseLeave={() => setHoveredCardId(null)}
              >
                <div style={{ fontWeight: 700, fontSize: "1.13rem", marginBottom: 2 }}>{habit.title}</div>
                {habit.curiosityId && (
                  <div style={{ fontSize: 12, color: "#2CB67D", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                    <span role="img" aria-label="link">🔗</span> {curiosities.find(c => c.id === habit.curiosityId)?.title || "(deleted)"}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 15 }} role="img" aria-label="streak">🔥</span>
                  <span style={{ fontSize: 13, color: "var(--awake-text-muted)" }}>Streak: {habit.streak || 0}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {habit.buffs && habit.buffs.length > 0 ? habit.buffs.map((b, i) => (
                    <span key={i} style={{ background: "#FFD803", color: "#232136", borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: 600, display: "inline-block" }}>+{b.amount} {userStats.find(s => s.key === b.stat)?.emoji || ""} {userStats.find(s => s.key === b.stat)?.label || b.stat}</span>
                  )) : <span style={{ color: "var(--awake-text-muted)", fontSize: 12 }}>No buffs</span>}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    className="add-goal-btn"
                    style={{ fontSize: 13, borderRadius: 16, padding: "4px 14px", display: "flex", alignItems: "center", gap: 4, ...(donePulseId === habit.id ? pulseAnim : {}) }}
                    onClick={() => handleMarkHabitDone(habit)}
                    disabled={habit.lastCompleted && habit.lastCompleted.slice(0, 10) === new Date().toISOString().slice(0, 10)}
                  >
                    <span role="img" aria-label="check">✔️</span>
                    {habit.lastCompleted && habit.lastCompleted.slice(0, 10) === new Date().toISOString().slice(0, 10) ? "Done" : "Mark as Done"}
                  </button>
                  <button className="homepage-curiosity-btn" style={{ fontSize: 13, borderRadius: 16, padding: "4px 10px" }} onClick={() => handleEditHabit(habit)}>Edit</button>
                  <button className="homepage-curiosity-btn" style={{ fontSize: 13, color: "#FF6F61", borderRadius: 16, padding: "4px 10px" }} onClick={() => handleDeleteHabit(habit)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Progress & Encouragement */}
      <section style={{ margin: "40px 0", textAlign: "center" }}>
        <h3 className="homepage-progress-heading">Recent Progress</h3>
        <div className="homepage-progress-text" style={{ color: "var(--awake-text-muted)", fontSize: "1.1rem" }}>
          {/* Placeholder for streaks, new curiosities, etc. */}
          You've explored <strong>3 new curiosities</strong> this week!<br />
          Your current streak: <strong>4 days</strong> of showing up.
        </div>
        <div className="homepage-progress-quote" style={{ marginTop: 24, fontStyle: "italic", color: "var(--awake-accent)" }}>
          "It's okay to change direction. Exploration is progress."
        </div>
      </section>

      {showAddHabitModal && (
        <AddHabitModal
          onClose={() => { setShowAddHabitModal(false); setEditingHabit(null); }}
          onHabitAdded={editingHabit ? (updated => setHabits(habits => habits.map(h => h.id === updated.id ? updated : h))) : handleHabitAdded}
          editingHabit={editingHabit}
          userStats={userStats}
        />
      )}

      {toast && (
        <div style={{ position: "fixed", top: 32, left: "50%", transform: "translateX(-50%)", background: "#232136", color: "#FFD803", padding: "16px 32px", borderRadius: 12, fontWeight: 700, fontSize: 20, boxShadow: "var(--awake-shadow)", zIndex: 2100, display: "flex", alignItems: "center", gap: 16, animation: "slideIn 0.4s" }}>
          {toast}
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "#FFD803", fontSize: 22, cursor: "pointer" }} aria-label="Dismiss">×</button>
          <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(-50%) translateY(-30px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
        </div>
      )}

      {/* Add Settings button to HomePage header */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button className="homepage-curiosity-btn" style={{ fontSize: 15, borderRadius: 16, padding: "6px 18px" }} onClick={() => setShowSettings(true)}>
          ⚙️ Settings
        </button>
      </div>

      {showSettings && (
        <StatSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

function AddHabitModal({ onClose, onHabitAdded, editingHabit, userStats }) {
  const { curiosities } = useCuriosityContext();
  const [title, setTitle] = useState(editingHabit ? editingHabit.title : "");
  const [curiosityId, setCuriosityId] = useState(editingHabit ? editingHabit.curiosityId || "" : "");
  const [buffs, setBuffs] = useState(editingHabit ? editingHabit.buffs : [{ stat: userStats[0]?.key || "", amount: 1 }]);
  const handleBuffChange = (idx, field, value) => {
    setBuffs(buffs => buffs.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };
  const handleAddBuff = () => {
    setBuffs([...buffs, { stat: userStats[0]?.key || "", amount: 1 }]);
  };
  const handleRemoveBuff = (idx) => {
    setBuffs(buffs => buffs.filter((_, i) => i !== idx));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const habit = {
      id: editingHabit ? editingHabit.id : Date.now().toString(),
      title: title.trim(),
      createdAt: editingHabit ? editingHabit.createdAt : new Date().toISOString(),
      streak: editingHabit ? editingHabit.streak : 0,
      lastCompleted: editingHabit ? editingHabit.lastCompleted : null,
      buffs: buffs.filter(b => b.amount > 0 && b.stat),
      curiosityId: curiosityId || undefined,
    };
    if (editingHabit) {
      await updateHabit(habit.id, habit);
    } else {
      await addHabit(habit);
    }
    onHabitAdded(habit);
    onClose();
  };
  return (
    <div className="modal-backdrop" style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={handleSubmit} style={{ background: "#232136", borderRadius: 18, padding: 32, width: "90vw", maxWidth: 520, boxShadow: "var(--awake-shadow)", position: "relative" }}>
        <button type="button" onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", fontSize: 22, color: "#FFD803", cursor: "pointer" }} aria-label="Close">×</button>
        <h3 style={{ marginTop: 0 }}>{editingHabit ? "Edit Habit" : "Add Habit"}</h3>
        <label style={{ display: "block", marginBottom: 10 }}>
          Name
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%", marginTop: 4 }} autoFocus />
        </label>
        <label style={{ display: "block", marginBottom: 14 }}>
          Link to Curiosity (optional)
          <select value={curiosityId} onChange={e => setCuriosityId(e.target.value)} style={{ width: "100%", marginTop: 4 }}>
            <option value="">None</option>
            {curiosities.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </label>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>Buffs</div>
          {buffs.map((buff, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <select value={buff.stat} onChange={e => handleBuffChange(idx, "stat", e.target.value)}>
                {userStats.map(opt => <option key={opt.key} value={opt.key}>{opt.emoji} {opt.label}</option>)}
              </select>
              <input type="number" min={1} max={20} value={buff.amount} onChange={e => handleBuffChange(idx, "amount", parseInt(e.target.value) || 1)} style={{ width: 50 }} />
              <span>{userStats.find(opt => opt.key === buff.stat)?.label}</span>
              {buffs.length > 1 && <button type="button" onClick={() => handleRemoveBuff(idx)} style={{ color: "#FF6F61", background: "none", border: "none", cursor: "pointer" }}>✕</button>}
            </div>
          ))}
          <button type="button" onClick={handleAddBuff} style={{ fontSize: 13, marginTop: 2 }}>+ Add Buff</button>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <button type="submit" className="add-goal-btn">Save</button>
          <button type="button" className="clear-goals-btn" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

const CURATED_STATS = [
  { key: "curiosity", label: "Curiosity", emoji: "💡", description: "Openness to new ideas, learning, and exploration" },
  { key: "action", label: "Action", emoji: "⚡", description: "Taking initiative, making progress, doing" },
  { key: "reflection", label: "Reflection", emoji: "📝", description: "Self-awareness, journaling, learning from life" },
  { key: "resilience", label: "Resilience", emoji: "🔥", description: "Bouncing back, persistence, handling adversity" },
  { key: "joy", label: "Joy", emoji: "😄", description: "Experiencing happiness, play, and delight" },
  { key: "calm", label: "Calm", emoji: "🧘", description: "Peace, relaxation, and emotional balance" },
  { key: "focus", label: "Focus", emoji: "🎯", description: "Concentration, clarity, and deep work" },
  { key: "connection", label: "Connection", emoji: "🤝", description: "Building relationships, empathy, and belonging" },
  { key: "gratitude", label: "Gratitude", emoji: "🙏", description: "Appreciation, thankfulness, and positivity" },
  { key: "creativity", label: "Creativity", emoji: "🎨", description: "Imagination, originality, and self-expression" },
  { key: "health", label: "Health", emoji: "🏃", description: "Physical well-being, energy, and vitality" },
  { key: "confidence", label: "Confidence", emoji: "🦁", description: "Self-belief, courage, and assertiveness" },
  { key: "growth", label: "Growth", emoji: "🌱", description: "Personal development, learning, and progress" },
  { key: "mindfulness", label: "Mindfulness", emoji: "🧠", description: "Presence, awareness, and living in the moment" },
  { key: "freedom", label: "Freedom", emoji: "🕊️", description: "Autonomy, independence, and self-direction" },
  { key: "adventure", label: "Adventure", emoji: "🗺️", description: "Trying new things, embracing the unknown" },
  { key: "kindness", label: "Kindness", emoji: "💖", description: "Compassion, generosity, and helping others" },
  { key: "wisdom", label: "Wisdom", emoji: "🦉", description: "Insight, discernment, and good judgment" },
  { key: "balance", label: "Balance", emoji: "⚖️", description: "Harmony between different areas of life" },
  { key: "purpose", label: "Purpose", emoji: "⭐", description: "Meaning, direction, and a sense of mission" },
];

function StatSettingsModal({ onClose }) {
  const [selected, setSelected] = useState(() => {
    const saved = localStorage.getItem('awake_user_stats');
    return saved ? JSON.parse(saved) : [CURATED_STATS[0], CURATED_STATS[1], CURATED_STATS[2]];
  });
  const [customEmoji, setCustomEmoji] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [customError, setCustomError] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const toggleStat = (stat) => {
    if (selected.find(s => s.key === stat.key)) {
      setSelected(selected.filter(s => s.key !== stat.key));
    } else if (selected.length < 5) {
      setSelected([...selected, stat]);
    }
  };
  const addCustomStat = () => {
    if (!customEmoji || !customLabel.trim()) {
      setCustomError("Please enter an emoji and a label.");
      return;
    }
    if (selected.length >= 5) {
      setCustomError("You can select up to 5 stats.");
      return;
    }
    setSelected([...selected, { key: customLabel.trim().toLowerCase(), label: customLabel.trim(), emoji: customEmoji, description: "Custom stat" }]);
    setCustomEmoji("");
    setCustomLabel("");
    setCustomError("");
  };
  const saveStats = () => {
    if (selected.length < 3) {
      setCustomError("Please select at least 3 stats.");
      return;
    }
    localStorage.setItem('awake_user_stats', JSON.stringify(selected));
    onClose();
    window.location.reload(); // For now, reload to update all stat UI
  };
  return (
    <div className="modal-backdrop" style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.4)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#232136", borderRadius: 18, padding: 32, width: "90vw", maxWidth: 520, boxShadow: "var(--awake-shadow)", position: "relative", maxHeight: "80vh", overflowY: "auto" }}>
        <button type="button" onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", fontSize: 22, color: "#FFD803", cursor: "pointer" }} aria-label="Close">×</button>
        <h2 style={{ marginTop: 0, marginBottom: 18 }}>Choose Your Stats</h2>
        <div style={{ fontSize: 15, color: "var(--awake-text-muted)", marginBottom: 16 }}>Pick 3–5 qualities you want to grow or feel more of. You can add your own!</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          {CURATED_STATS.map(stat => (
            <button key={stat.key} onClick={() => toggleStat(stat)} style={{ border: selected.find(s => s.key === stat.key) ? "2px solid #2CB67D" : "1.5px solid #393A4B", background: selected.find(s => s.key === stat.key) ? "#2CB67D22" : "#232136", color: "#fff", borderRadius: 14, padding: "8px 12px", minWidth: 90, cursor: "pointer", fontWeight: 600, fontSize: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 22 }}>{stat.emoji}</span>
              {stat.label}
              <span style={{ fontSize: 11, color: "#FFD803", marginTop: 2 }}>{stat.description}</span>
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 12, marginTop: 8 }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>Add Custom Stat</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" onClick={() => setShowEmojiPicker(v => !v)} style={{ width: 60, height: 40, fontSize: 22, borderRadius: 8, border: "1px solid #393A4B", background: "#232136", cursor: "pointer" }}>
              {customEmoji || "😀"}
            </button>
            {showEmojiPicker && (
              <div style={{ position: "absolute", zIndex: 3000, top: 60, left: 0 }}>
                <EmojiPicker
                  onEmojiClick={(e) => { setCustomEmoji(e.emoji); setShowEmojiPicker(false); }}
                  theme="dark"
                  width={320}
                  height={350}
                />
              </div>
            )}
            <input type="text" placeholder="Label" value={customLabel} onChange={e => setCustomLabel(e.target.value)} style={{ width: 100 }} maxLength={16} />
            <button type="button" onClick={addCustomStat} style={{ fontSize: 13, borderRadius: 12, padding: "4px 10px" }}>Add</button>
          </div>
          {customError && <div style={{ color: "#FF6F61", fontSize: 13, marginTop: 4 }}>{customError}</div>}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 18, justifyContent: "flex-end" }}>
          <button type="button" className="add-goal-btn" onClick={saveStats}>Save</button>
        </div>
      </div>
    </div>
  );
}

// Add keyframes for pulse
const style = document.createElement('style');
style.innerHTML = `
@keyframes pulseBtn {
  0% { box-shadow: 0 0 0 0 #2CB67D55; }
  70% { box-shadow: 0 0 0 8px #2CB67D11; }
  100% { box-shadow: 0 0 0 0 #2CB67D00; }
}
@keyframes statPulse {
  0% { filter: brightness(1.2); }
  50% { filter: brightness(1.5); }
  100% { filter: brightness(1); }
}
`;
document.head.appendChild(style);

export default HomePage; 
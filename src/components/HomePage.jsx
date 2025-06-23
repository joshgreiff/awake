import React from "react";

const HomePage = ({ onOpenReflection, reflectionData }) => {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 0" }}>
      {/* Hero Section */}
      <section style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 style={{ fontSize: "2.8rem", marginBottom: 8, background: "var(--awake-primary-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Awake: Your Journey of Self-Exploration
        </h1>
        <h2 style={{ fontWeight: 400, color: "var(--awake-text-muted)", marginBottom: 12 }}>
          Map your curiosities. Reflect. Take action. Evolve.
        </h2>
        <p style={{ fontSize: "1.2rem", color: "var(--awake-text-muted)", maxWidth: 600, margin: "0 auto" }}>
          Awake is a visual, privacy-first platform for mapping your interests, reflecting on your journey, and taking meaningful action—at your own pace.
        </p>
      </section>

      {/* Exploration Map (Mind Map) */}
      <section style={{ margin: "40px 0", textAlign: "center" }}>
        <h3 style={{ marginBottom: 16 }}>Your Exploration Map</h3>
        <div style={{ minHeight: 320, background: "var(--awake-surface)", borderRadius: "var(--awake-radius)", boxShadow: "var(--awake-shadow)", padding: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Mind map/curiosity garden goes here */}
          <span style={{ color: "var(--awake-text-muted)" }}>[Mind Map Placeholder]</span>
        </div>
        <button className="add-goal-btn" style={{ marginTop: 20 }}>Add a Curiosity</button>
      </section>

      {/* Daily Reflection & Action */}
      <section style={{ margin: "40px 0", display: "flex", justifyContent: "center" }}>
        <div style={{ background: "var(--awake-card)", borderRadius: "var(--awake-radius)", boxShadow: "var(--awake-shadow)", padding: 24, minWidth: 320, maxWidth: 400 }}>
          <h3>Daily Check-In</h3>
          <p style={{ color: "var(--awake-text-muted)", marginBottom: 12 }}>
            What's calling to you today? Set your focus and intentions.
          </p>
          <button className="add-goal-btn" onClick={onOpenReflection} style={{ width: "100%" }}>
            Start Daily Reflection
          </button>
          {reflectionData && (
            <div style={{ marginTop: 16, color: "var(--awake-text-muted)", fontSize: "0.95rem" }}>
              <strong>Today's Note:</strong>
              <div style={{ marginTop: 4 }}>{reflectionData.note}</div>
            </div>
          )}
        </div>
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
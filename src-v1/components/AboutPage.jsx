import React from "react";
import "../assets/styles/AwakeIntro.css";

// Awake Mission: A personalized, evolving, self-development system that helps users become the most aligned version of themselves through accountability, habit-building, community, and intelligent guidance.

const AboutPage = () => (
  <div className="awake-intro">
    {/* Mission Statement Block */}
    <div style={{ background: "#7F5AF0", color: "#fff", borderRadius: 12, padding: "20px 18px", marginBottom: 32, fontWeight: 600, fontSize: "1.15rem", boxShadow: "var(--awake-shadow)" }}>
      A personalized, evolving, self-development system that helps users become the most aligned version of themselves through accountability, habit-building, community, and intelligent guidance.
    </div>
    <h2>Welcome to Awake: A Journey of Discovery</h2>
    <p>
      Most planning apps ask, "What do you want to achieve?" But what if your biggest breakthroughs
      come not from chasing a specific outcome, but from exploring your curiosities?
    </p>
    <p>
      <strong>Awake</strong> is not just about setting goals—it's about <strong>discovery</strong>. We believe that progress happens when you follow your curiosity, not a rigid path. Rock and roll wasn't created by someone trying to reinvent music—it emerged unexpectedly, as a byproduct of exploration. Your own greatest achievements may come the same way.
    </p>
    <h3>How Awake Works</h3>
    <ul>
      <li>Instead of setting a rigid objective, start with an interest, idea, or direction.</li>
      <li>Watch as your journey unfolds, revealing unexpected stepping stones along the way.</li>
      <li>Focus on exploration — curiosities evolve as you learn, adapt, and uncover new paths.</li>
    </ul>
    <h3>What's Your First Step?</h3>
    <p>
      Rather than asking "What do you want to achieve?", Awake asks: <strong>What excites you? What are you curious about?</strong> Start there, and let the journey unfold.
    </p>
  </div>
);

export default AboutPage; 
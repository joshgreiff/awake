import React from "react";
import "../assets/styles/AwakeIntro.css";

const AwakeIntro = ({ onClose }) => {
  return (
    <div className="awake-intro">
      <h2>Welcome to Awake</h2>
      <div style={{ background: "#2CB67D", color: "#fff", borderRadius: 10, padding: "16px 14px", margin: "18px 0 0 0", fontWeight: 500, fontSize: "1.05rem", boxShadow: "var(--awake-shadow)" }}>
        A personalized, evolving, self-development system that helps users become the most aligned version of themselves through accountability, habit-building, community, and intelligent guidance.
      </div>
    </div>
  );
};

const AwakeIntroToggle = ({ onOpen }) => {
  return (
    <button className="show-intro-btn" onClick={onOpen}>What is Awake?</button>
  );
};

export { AwakeIntro, AwakeIntroToggle };
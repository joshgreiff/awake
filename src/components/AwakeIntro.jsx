import React from "react";
import "../assets/styles/AwakeIntro.css";

const AwakeIntro = ({ onClose }) => {
  return (
    <div className="awake-intro">
      <h2>Welcome to Awake</h2>
    </div>
  );
};

const AwakeIntroToggle = ({ onOpen }) => {
  return (
    <button className="show-intro-btn" onClick={onOpen}>What is Awake?</button>
  );
};

export { AwakeIntro, AwakeIntroToggle };
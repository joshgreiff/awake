import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import NostrAuth from "./components/NostrAuth";
import GoalForm from "./components/GoalForm";
import { AwakeIntro, AwakeIntroToggle } from "./components/AwakeIntro";
import GoalVisualizer from "./components/GoalVisualizer";
import { fetchUserGoals } from "./utils/nostrFetch";
import { addGoal, getGoals } from "./storage/indexeddb";
import { getPublicKey } from "nostr-tools";
import { CuriosityProvider, useCuriosityContext } from "./context/CuriosityContext";
import DailyReflectionModal from "./components/DailyReflectionModal";
import AboutPage from "./components/AboutPage";
import HomePage from "./components/HomePage";

function App() {
  const [showReflection, setShowReflection] = React.useState(false);
  const [reflectionData, setReflectionData] = React.useState(null);
  const [userAuthenticated, setUserAuthenticated] = React.useState(false);
  const { curiosities } = useCuriosityContext();

  React.useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const saved = localStorage.getItem(`awake-reflection-${today}`);
    // Only show reflection modal if authenticated and has curiosities
    if (userAuthenticated && curiosities.length > 0) {
      if (!saved) {
        setShowReflection(true);
      } else {
        setReflectionData(JSON.parse(saved));
      }
    } else {
      setShowReflection(false);
    }
  }, [userAuthenticated, curiosities]);

  const handleOpenReflection = () => setShowReflection(true);
  const handleSaveReflection = (selectedIds, note) => {
    const today = new Date().toISOString().slice(0, 10);
    const data = { selectedIds, note, date: today };
    localStorage.setItem(`awake-reflection-${today}`, JSON.stringify(data));
    setReflectionData(data);
    setShowReflection(false);
  };
  const handleCancelReflection = () => setShowReflection(false);

  return (
    <CuriosityProvider>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/" element={<>
            <HomePage onOpenReflection={handleOpenReflection} reflectionData={reflectionData} />
            {showReflection && userAuthenticated && curiosities.length > 0 && (
              <DailyReflectionModal
                curiosities={curiosities}
                onSave={handleSaveReflection}
                onCancel={handleCancelReflection}
                initialSelected={reflectionData?.selectedIds || []}
                initialNote={reflectionData?.note || ""}
              />
            )}
          </>} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </BrowserRouter>
    </CuriosityProvider>
  );
}

function NavBar() {
  return (
    <nav style={{ display: "flex", gap: 16, padding: 12, borderBottom: "1px solid #eee" }}>
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
    </nav>
  );
}

export default App;

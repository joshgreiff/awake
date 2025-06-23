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
  return (
    <CuriosityProvider>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/" element={<HomePageWrapper />} />
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

function HomePageWrapper() {
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionData, setReflectionData] = useState(null);
  const [userAuthenticated, setUserAuthenticated] = useState(false);
  const { curiosities, addCuriosity } = useCuriosityContext();

  useEffect(() => {
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

  const handleAddCuriosity = (title) => {
    const timestamp = Date.now();
    addCuriosity({
      id: timestamp.toString(),
      title,
      parentId: null,
      position: null
    });
  };

  return (
    <>
      <HomePage
        onOpenReflection={handleOpenReflection}
        reflectionData={reflectionData}
        onAddCuriosity={handleAddCuriosity}
      />
      {showReflection && userAuthenticated && curiosities.length > 0 && (
        <DailyReflectionModal
          curiosities={curiosities}
          onSave={handleSaveReflection}
          onCancel={handleCancelReflection}
          initialSelected={reflectionData?.selectedIds || []}
          initialNote={reflectionData?.note || ""}
        />
      )}
    </>
  );
}

export default App;

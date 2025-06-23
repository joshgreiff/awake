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

function App() {
  return (
    <CuriosityProvider>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
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

function Home() {
  const [userAuthenticated, setUserAuthenticated] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [goals, setGoals] = useState([]);
  const { curiosities } = useCuriosityContext();
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionData, setReflectionData] = useState(null);

  useEffect(() => {
    const storedKey = sessionStorage.getItem("nostrPrivateKey");
    if (storedKey) {
      const pubkey = getPublicKey(storedKey);
      handleAuthSuccess(true, pubkey);
    }
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const saved = localStorage.getItem(`awake-reflection-${today}`);
    if (!saved) {
      setShowReflection(true);
    } else {
      setReflectionData(JSON.parse(saved));
    }
  }, []);

  const handleAuthSuccess = async (loggedIn, pubkey = null) => {
    setUserAuthenticated(loggedIn);

    if (!loggedIn) {
      setGoals([]);
      return;
    }

    if (pubkey) {
      try {
        const nostrGoals = await fetchUserGoals(pubkey);
        console.log("Fetched goals from Nostr:", nostrGoals);
        for (const goal of nostrGoals) {
          await addGoal(goal);
        }
        const storedGoals = await getGoals();
        setGoals(storedGoals);
      } catch (error) {
        console.error("Error fetching Nostr goals:", error);
      }
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("nostrPrivateKey");
    handleAuthSuccess(false, null);
  };

  const handleSaveReflection = (selectedIds, note) => {
    const today = new Date().toISOString().slice(0, 10);
    const data = { selectedIds, note, date: today };
    localStorage.setItem(`awake-reflection-${today}`, JSON.stringify(data));
    setReflectionData(data);
    setShowReflection(false);
  };

  const handleOpenReflection = () => setShowReflection(true);
  const handleCancelReflection = () => setShowReflection(false);

  return (
    <div>
      <h1>Awake - Goal Setting App</h1>
      <button onClick={handleOpenReflection} style={{ marginBottom: 8 }}>Daily Check-In</button>
      {showReflection && (
        <DailyReflectionModal
          curiosities={curiosities}
          onSave={handleSaveReflection}
          onCancel={handleCancelReflection}
          initialSelected={reflectionData?.selectedIds || []}
          initialNote={reflectionData?.note || ""}
        />
      )}
      {!showIntro && <AwakeIntroToggle onOpen={() => setShowIntro(true)} />}
      {showIntro && <AwakeIntro onClose={() => setShowIntro(false)} />}

      {!userAuthenticated ? (
        <NostrAuth key="auth" onAuthSuccess={handleAuthSuccess} />
      ) : (
        <>
          {/* <AIChat /> */}
          <GoalForm />
          <button onClick={handleLogout}>Logout</button>
          <GoalVisualizer goals={goals} />
        </>
      )}
    </div>
  );
}

export default App;

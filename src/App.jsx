import React, { useState, useEffect } from "react";
import NostrAuth from "./components/NostrAuth";
import GoalForm from "./components/GoalForm";
import { AwakeIntro, AwakeIntroToggle } from "./components/AwakeIntro";
import GoalVisualizer from "./components/GoalVisualizer";
import AIChat from "./components/AIChat";
import { fetchUserGoals } from "./utils/nostrFetch";
import { addGoal, getGoals } from "./storage/indexeddb";
import { getPublicKey } from "nostr-tools";

function App() {
  const [userAuthenticated, setUserAuthenticated] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    const storedKey = sessionStorage.getItem("nostrPrivateKey");
    if (storedKey) {
      const pubkey = getPublicKey(storedKey);
      handleAuthSuccess(true, pubkey);
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

  return (
    <div>
      <h1>Awake - Goal Setting App</h1>
      {!showIntro && <AwakeIntroToggle onOpen={() => setShowIntro(true)} />}
      {showIntro && <AwakeIntro onClose={() => setShowIntro(false)} />}

      {!userAuthenticated ? (
        <NostrAuth key="auth" onAuthSuccess={handleAuthSuccess} />
      ) : (
        <>
          <AIChat />
          <GoalForm />
          <button onClick={handleLogout}>Logout</button>
          <GoalVisualizer goals={goals} />
        </>
      )}
    </div>
  );
}

export default App;

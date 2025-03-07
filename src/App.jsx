import React, { useState, useEffect } from "react";
import NostrAuth from "./components/NostrAuth";
import GoalForm from "./components/GoalForm";
import { AwakeIntro, AwakeIntroToggle } from "./components/AwakeIntro";

function App() {
  const [userAuthenticated, setUserAuthenticated] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const storedKey = sessionStorage.getItem("nostrPrivateKey");
    if (storedKey) {
      setUserAuthenticated(true);
    }
  }, []);

  return (
    <div>
      <h1>Awake - Goal Setting App</h1>
      {!showIntro && <AwakeIntroToggle onOpen={() => setShowIntro(true)} />}  
      {showIntro && <AwakeIntro onClose={() => setShowIntro(false)} />}
      {!userAuthenticated ? (
        <NostrAuth onAuthSuccess={setUserAuthenticated} />  // ✅ Update App state dynamically
      ) : (
        <>
          <GoalForm />
          <button onClick={() => {
            sessionStorage.removeItem("nostrPrivateKey"); // ✅ Fully clear stored key
            setUserAuthenticated(false);
          }}>
            Logout
          </button>
        </>
      )}
    </div>
  );
}

export default App;

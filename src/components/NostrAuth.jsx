import React, { useState, useEffect } from "react";
import { getPublicKey } from "nostr-tools";
import { utils } from "@noble/secp256k1"; // For generating private keys

const NostrAuth = ({ onAuthSuccess }) => { 
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [showKeyWarning, setShowKeyWarning] = useState(false);
  const [saveKey, setSaveKey] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem("nostrPrivateKey");
    if (storedKey) {
      handleLogin(storedKey, true);
    }
  }, []);

  const generateKeys = () => {
    const sk = Array.from(utils.randomPrivateKey(), (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join(""); // Convert bytes to hex manually
    const pk = getPublicKey(sk);
    setPrivateKey(sk);
    setPublicKey(pk);
    setShowKeyWarning(true);  // ✅ Show the key warning before login
  };

  const handleLogin = (sk, autoLogin = false) => {
    try {
      const pk = getPublicKey(sk);
      setPrivateKey(sk);
      setPublicKey(pk);
      setLoggedIn(true);
      if (!autoLogin && saveKey) {
        localStorage.setItem("nostrPrivateKey", sk);
      }

      if (onAuthSuccess) {
        onAuthSuccess(true);
      }
    } catch (error) {
      alert("Invalid Private Key");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(privateKey);
    alert("Private Key copied to clipboard! Store it securely.");
  };

  const downloadKey = () => {
    const blob = new Blob([privateKey], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "nostr-private-key.txt";
    link.click();
  };

  const forgetKey = () => {
    localStorage.removeItem("nostrPrivateKey");
    setPrivateKey("");
    setPublicKey("");
    setLoggedIn(false);
  };

  const logout = () => {
    sessionStorage.removeItem("nostrPrivateKey");  // ✅ Clear the stored key
    setPrivateKey("");
    setPublicKey("");
    if (onAuthSuccess) {
      onAuthSuccess(false);  // ✅ Notify App.jsx that user logged out
    }
  };

  return (
    <div>
      {!loggedIn ? (
        <div>
          <h2>NOSTR Login</h2>
          {showKeyWarning ? (
            <div style={{ background: "#ffcc00", padding: "10px", borderRadius: "5px" }}>
              <p><strong>Important:</strong> Save your private key! You will need it to log in again.</p>
              <p>For maximum security, <strong>write it down on paper</strong> and store it in a safe place. Avoid saving it in cloud-based note-taking apps or as a picture, as these can be hacked.</p>
              <button onClick={copyToClipboard}>Copy Private Key</button>
              <button onClick={downloadKey}>Download Private Key</button>
              <button onClick={() => handleLogin(privateKey)}>I Have Saved My Key</button>
            </div>
          ) : (
            <>
              <button onClick={generateKeys}>Generate New Keys</button>
              <br />
              <input
                type="text"
                placeholder="Enter Private Key"
                onChange={(e) => handleLogin(e.target.value)}
              />
              <button onClick={() => handleLogin(privateKey)}>Login</button>
              <br />
              <label>
                <input
                  type="checkbox"
                  checked={saveKey}
                  onChange={() => setSaveKey(!saveKey)}
                />
                Save Private Key for Auto-Login (Less Secure)
              </label>
            </>
          )}
        </div>
      ) : (
        <div>
          <h2>Welcome!</h2>
          <p><strong>Public Key:</strong> {publicKey}</p>
          <button onClick={forgetKey}>Forget Stored Key</button>
          <button onClick={logout}>Logout</button>
        </div>
      )}
    </div>
  );
};

export default NostrAuth;

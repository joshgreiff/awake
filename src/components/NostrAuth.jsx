import React, { useState, useEffect } from "react";
import { getPublicKey } from "nostr-tools";
import { utils } from "@noble/secp256k1";

const NostrAuth = ({ onAuthSuccess }) => {
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [showKeyWarning, setShowKeyWarning] = useState(false);
  const [saveKey, setSaveKey] = useState(false);

  useEffect(() => {
    const storedKey = sessionStorage.getItem("nostrPrivateKey");
    if (storedKey) {
      handleLogin(storedKey, true);
    }
  }, []);

  const generateKeys = () => {
    const sk = Array.from(utils.randomPrivateKey(), (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
    const pk = getPublicKey(sk);
    setPrivateKey(sk);
    setPublicKey(pk);
    setShowKeyWarning(true);
  };

  const handleLogin = (sk, autoLogin = false) => {
    try {
      const pk = getPublicKey(sk);
      setPrivateKey(sk);
      setPublicKey(pk);
      setLoggedIn(true);
      sessionStorage.setItem("nostrPrivateKey", sk);
      if (!autoLogin && saveKey) {
        localStorage.setItem("nostrPrivateKey", sk);
      }

      if (onAuthSuccess) {
        onAuthSuccess(true, pk);
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
    sessionStorage.removeItem("nostrPrivateKey");
    setPrivateKey("");
    setPublicKey("");
    setLoggedIn(false);
    onAuthSuccess(false, null); // properly trigger logout
  };

  return (
    <div>
      {!loggedIn ? (
        <div>
          <h2>NOSTR Login</h2>
          {showKeyWarning ? (
            <div style={{ background: "#ffcc00", padding: "10px", borderRadius: "5px" }}>
              <p><strong>Important:</strong> Save your private key!</p>
              <p><strong>Write it down</strong> or download it now.</p>
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
                onChange={(e) => setPrivateKey(e.target.value)}
              />
              <button onClick={() => handleLogin(privateKey)}>Login</button>
              <br />
              <label>
                <input
                  type="checkbox"
                  checked={saveKey}
                  onChange={() => setSaveKey(!saveKey)}
                />
                Save Private Key (Auto Login)
              </label>
            </>
          )}
        </div>
      ) : (
        <div>
          <h2>Welcome!</h2>
          <p><strong>Public Key:</strong> {publicKey}</p>
          <button onClick={forgetKey}>Logout</button>
        </div>
      )}
    </div>
  );
};

export default NostrAuth;

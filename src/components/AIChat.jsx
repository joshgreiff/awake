import React, { useState } from "react";
import "../assets/styles/AIChat.css";
import * as nostrTools from "nostr-tools";

const reflectionPrompts = [
  "What does that mean to you right now?",
  "Is this something you’ve thought about before?",
  "What would it look like to take a small step toward that?",
  "How does this connect with what you’ve been feeling lately?",
  "Is this something you want to explore further?",
  "When was the last time this felt important to you?"
];

const memoryResponses = [
  { keyword: "stuck", response: "What do you think is keeping you stuck right now?" },
  { keyword: "excited", response: "That's great! What’s fueling your excitement?" },
  { keyword: "lost", response: "When did you start feeling lost?" },
  { keyword: "happy", response: "What does happiness look like for you right now?" },
  { keyword: "goal", response: "Is this goal connected to something deeper you’re working toward?" }
];

const AIChat = () => {
  const [messages, setMessages] = useState([
    { sender: "AI", text: "Hello! What's on your mind today?" }
  ]);
  const [input, setInput] = useState("");
  const [memory, setMemory] = useState([]); // Track previous user messages

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "User", text: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");

    const updatedMemory = [...memory, input];
    setMemory(updatedMemory);

    let aiText = "That's interesting! Can you tell me more?";

    for (let i = updatedMemory.length - 1; i >= 0; i--) {
      const entry = updatedMemory[i].toLowerCase();
      const match = memoryResponses.find(({ keyword }) => entry.includes(keyword));
      if (match) {
        aiText = match.response;
        break;
      }
    }

    if (aiText === "That's interesting! Can you tell me more?") {
      aiText = reflectionPrompts[Math.floor(Math.random() * reflectionPrompts.length)];
    }

    const aiResponse = {
      sender: "AI",
      text: aiText
    };

    setTimeout(() => setMessages([...updatedMessages, aiResponse]), 500);

    // Optional: Publish conversation as a Nostr event
    try {
      const sk = sessionStorage.getItem("nostrPrivateKey");
      if (sk) {
        const relay = nostrTools.relayInit("wss://relay.damus.io");
        const pk = nostrTools.getPublicKey(sk);
        await relay.connect();

        const event = {
          kind: 30000,
          pubkey: pk,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: input,
        };

        event.id = getEventHash(event);
        event.sig = signEvent(event, sk);

        await relay.publish(event);
        relay.close();
      }
    } catch (error) {
      console.error("Nostr publish error:", error);
    }
  };

  return (
    <div className="ai-chat-container">
      <div className="chat-box">
        {messages.map((msg, index) => (
          <div key={index} className={msg.sender === "AI" ? "ai-message" : "user-message"}>
            <strong>{msg.sender}: </strong>{msg.text}
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
};

export default AIChat;

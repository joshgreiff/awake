export const publishGoalToNostr = async (goal) => {
  const { SimplePool, getEventHash, getPublicKey, signEvent } = await import("nostr-tools");

  const sk = sessionStorage.getItem("nostrPrivateKey");
  const pk = getPublicKey(sk);

  const event = {
    kind: 30000,
    pubkey: pk,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["d", goal.id.toString()]],
    content: JSON.stringify(goal),
  };

  event.id = getEventHash(event);
  event.sig = signEvent(event, sk);

  const pool = new SimplePool();
  const relays = [
    "wss://relay.damus.io",
    "wss://relay.snort.social",
    "wss://nos.lol",
    "wss://nostr.wine",
  ];

  for (const relay of relays) {
    try {
      const pub = pool.publish(relay, event);
      pub.on("ok", () => console.log(`✅ Goal published to ${relay}`));
      pub.on("failed", (reason) =>
        console.warn(`❌ Failed publishing to ${relay}:`, reason)
      );
    } catch (error) {
      console.error(`Publish error to ${relay}`, error);
    }
  }

  setTimeout(() => {
    pool.close();
  }, 5000); // ⏳ Safety close after publishing
};

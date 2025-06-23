export const fetchUserGoals = async (pubkey) => {
  if (!pubkey) return [];

  const { SimplePool } = await import("nostr-tools/pool"); // ✅ dynamic import

  const pool = new SimplePool();
  const relays = [
    "wss://relay.damus.io",
    "wss://relay.snort.social",
    "wss://nos.lol",
    "wss://nostr.wine",
  ];

  const sub = pool.subscribeMany(relays, [
    {
      kinds: [30000],
      authors: [pubkey],
    },
  ]);

  return new Promise((resolve) => {
    const events = [];

    sub.on("event", (event) => {
      try {
        const parsed = JSON.parse(event.content);
        events.push(parsed);
      } catch (err) {
        console.warn("Invalid event format:", event);
      }
    });

    sub.on("eose", () => {
      console.log("Finished receiving events");
      sub.unsub();
      pool.close();
      resolve(events);
    });

    setTimeout(() => {
      console.warn("Timeout - resolving with partial events");
      sub.unsub();
      pool.close();
      resolve(events);
    }, 5000);
  });
};

import * as nostrTools from "nostr-tools";

export const fetchUserGoals = async (pubkey) => {
  const relay = nostrTools.relayInit("wss://relay.damus.io");

  return new Promise((resolve, reject) => {
    const events = [];

    relay.on("connect", () => {
      console.log(`Connected to ${relay.url}`);
      const sub = relay.sub([
        {
          kinds: [30000],
          authors: [pubkey],
        },
      ]);

      sub.on("event", (event) => {
        try {
          const parsed = JSON.parse(event.content); // assuming goal data is stored as JSON string
          events.push(parsed);
        } catch (err) {
          console.warn("Skipping invalid event:", event);
        }
      });

      sub.on("eose", () => {
        sub.unsub();
        relay.close();
        resolve(events);
      });
    });

    relay.on("error", (err) => {
      console.error("Relay connection failed", err);
      reject(err);
    });

    relay.connect();
  });
};

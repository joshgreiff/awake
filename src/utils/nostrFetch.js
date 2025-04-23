import { SimplePool } from "nostr-tools";

export const fetchUserGoals = async (pubkey) => {
  if (!pubkey) return []; // 🚫 No key? No fetch attempt.

  const pool = new SimplePool();
  const relays = [
    "wss://relay.damus.io",
    "wss://relay.snort.social",
    "wss://nos.lol",
    "wss://nostr.wine",
  ];

  const events = [];
  let resolved = false;

  return new Promise((resolve) => {
    let subsRemaining = relays.length;

    const safeResolve = () => {
      if (!resolved) {
        resolved = true;
        try {
          pool.close(); // ✅ Close ONCE only
        } catch (e) {
          console.warn("Error during pool.close:", e);
        }
        resolve(events);
      }
    };

    relays.forEach((relayUrl) => {
      try {
        pool.subscribe(
          [relayUrl],
          [
            {
              kinds: [30000],
              authors: [pubkey],
            },
          ],
          {
            onevent: (event) => {
              try {
                const parsed = JSON.parse(event.content);
                events.push(parsed);
              } catch (err) {
                console.warn(`Invalid event from ${relayUrl}`, event);
              }
            },
            oneose: () => {
              subsRemaining -= 1;
              if (subsRemaining === 0) {
                safeResolve();
              }
            },
          }
        );
      } catch (e) {
        console.warn(`Subscribe failed for ${relayUrl}`, e);
        subsRemaining -= 1;
        if (subsRemaining === 0) {
          safeResolve();
        }
      }
    });

    setTimeout(() => {
      console.warn("Timeout: resolving with partial data");
      safeResolve();
    }, 5000);
  });
};

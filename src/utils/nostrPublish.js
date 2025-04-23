import { getEventHash, getPublicKey, signEvent } from "nostr-tools";

const relays = [
  "wss://relay.damus.io",
  "wss://relay.snort.social",
  "wss://nos.lol",
  "wss://nostr.wine",
];

export const publishGoalToNostr = async (goal) => {
  const { relayInit } = await import("nostr-tools/relay");

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

  for (const url of relays) {
    try {
      const relay = relayInit(url);
      await relay.connect();

      relay.on("connect", () => {
        console.log(`✅ Connected to ${url}`);
        const pub = relay.publish(event);
        pub.on("ok", () => console.log(`🎯 Event accepted by ${url}`));
        pub.on("failed", (reason) =>
          console.warn(`❌ Failed on ${url}:`, reason)
        );
      });

      relay.on("error", () => {
        console.warn(`⚠️ Relay error on ${url}`);
      });
    } catch (err) {
      console.error(`Error connecting to relay ${url}`, err);
    }
  }
};

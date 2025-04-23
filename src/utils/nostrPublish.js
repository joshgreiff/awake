import { SimplePool, getEventHash, getPublicKey, signEvent } from "nostr-tools";

const relays = [
  "wss://relay.damus.io",
  "wss://relay.snort.social",
  "wss://nos.lol",
  "wss://nostr.wine"
];

export const publishGoalToNostr = async (goal) => {
  const sk = sessionStorage.getItem("nostrPrivateKey");
  if (!sk) throw new Error("Missing private key");

  const pk = getPublicKey(sk);

  const event = {
    kind: 30000,
    pubkey: pk,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["d", goal.id]],
    content: JSON.stringify(goal),
  };

  event.id = getEventHash(event);
  event.sig = signEvent(event, sk);

  const pool = new SimplePool();
  const pubs = pool.publish(relays, event);

  pubs.forEach(pub => {
    pub.on("ok", () => console.log(`✅ Relay accepted event: ${pub.url}`));
    pub.on("failed", reason => console.warn(`❌ Failed to publish to ${pub.url}: ${reason}`));
  });
};

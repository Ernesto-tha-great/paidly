import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

type Intent = {
  intentId: string;
  sender: string;
  description: string;
  amount: string;
  status: "pending" | "claimed";
};

const STORE_PATH = join(process.cwd(), ".intents.json");

function loadStore(): Map<string, Intent> {
  try {
    if (existsSync(STORE_PATH)) {
      const data = readFileSync(STORE_PATH, "utf-8");
      const entries = JSON.parse(data);
      return new Map(entries);
    }
  } catch (e) {
    console.error("Failed to load store:", e);
  }
  return new Map();
}

function persistStore(intents: Map<string, Intent>) {
  try {
    const entries = Array.from(intents.entries());
    writeFileSync(STORE_PATH, JSON.stringify(entries, null, 2));
  } catch (e) {
    console.error("Failed to persist store:", e);
  }
}

export function saveIntent(intent: Intent) {
  const intents = loadStore();
  intents.set(intent.intentId, intent);
  persistStore(intents);
}

export function getIntent(intentId: string): Intent | undefined {
  const intents = loadStore();
  return intents.get(intentId);
}

export function markClaimed(intentId: string) {
  const intents = loadStore();
  const intent = intents.get(intentId);
  if (intent) {
    intent.status = "claimed";
    intents.set(intentId, intent);
    persistStore(intents);
  }
}

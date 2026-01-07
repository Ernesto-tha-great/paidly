import { kv } from "@vercel/kv";

type Intent = {
  intentId: string;
  sender: string;
  description: string;
  amount: string;
  status: "pending" | "claimed";
};

const PREFIX = "intent:";

export async function saveIntent(intent: Intent) {
  await kv.set(`${PREFIX}${intent.intentId}`, intent);
}

export async function getIntent(intentId: string): Promise<Intent | null> {
  return await kv.get<Intent>(`${PREFIX}${intentId}`);
}

export async function markClaimed(intentId: string) {
  const intent = await getIntent(intentId);
  if (intent) {
    intent.status = "claimed";
    await kv.set(`${PREFIX}${intentId}`, intent);
  }
}

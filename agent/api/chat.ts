import { runAgent } from '../src/agent';
import { GeminiLLM } from '../src/llm';
import { Store, DEMO_ORDERS } from '../src/store';

const DEMO_USERS = ['user_a', 'user_b'];

/**
 * Vercel function. The customer id comes from the x-demo-user header, which stands in for a login.
 * In Phase 2 this becomes the verified Cognito user id.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
  const user = String(req.headers['x-demo-user'] ?? '');
  if (!DEMO_USERS.includes(user)) return res.status(400).json({ error: 'unknown demo customer' });

  const message = String(body.message ?? '').trim();
  if (message.length < 2 || message.length > 500) {
    return res.status(400).json({ error: 'message must be 2 to 500 characters' });
  }

  try {
    // Fresh in-memory store per request, so this demo resets between messages.
    const store = new Store(DEMO_ORDERS.map((o) => ({ ...o })));
    const result = await runAgent(new GeminiLLM(), { userId: user }, store, message);
    return res.status(200).json(result);
  } catch {
    return res.status(502).json({ error: 'assistant unavailable' });
  }
}

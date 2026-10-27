import { runAgent } from './agent';
import { ScriptedLLM, GeminiLLM, LLM } from './llm';
import { Store, DEMO_ORDERS } from './store';

async function main() {
  const llm: LLM = process.env.GEMINI_API_KEY
    ? new GeminiLLM()
    : new ScriptedLLM(['{"tool":"list_recent_orders","args":{"limit":2}}', '{"answer":"Your two latest orders are ord_1002 and ord_1001."}']);
  const store = new Store(DEMO_ORDERS);
  const result = await runAgent(llm, { userId: 'user_a' }, store, 'What are my latest orders?');
  console.log(JSON.stringify(result, null, 2));
}
main();

import { FormEvent, useState } from 'react';

type Message = { role: 'you' | 'assistant'; text: string; tools?: string[] };

/** Demo customers. The server uses this header in place of a real login (Cognito in Phase 2). */
const CUSTOMERS = [
  { id: 'user_a', label: 'Customer A (3 orders)' },
  { id: 'user_b', label: 'Customer B (1 large order)' },
];

const SUGGESTIONS = [
  'What are my recent orders?',
  'Why did my payment for ord_1003 fail?',
  'How long do refunds take?',
];

export default function App() {
  const [customer, setCustomer] = useState('user_a');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setInput('');
    setMessages((m) => [...m, { role: 'you', text: message }]);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-demo-user': customer },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((m) => [...m, {
        role: 'assistant',
        text: data.answer,
        tools: data.toolCalls.map((t: { name: string }) => t.name),
      }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'Something went wrong. Please try again.' }]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  return (
    <main style={{ maxWidth: 680, margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 4 }}>Payments support assistant</h1>
      <p style={{ color: '#4a5a70', marginTop: 0 }}>
        Demo. Pick a customer, then ask about orders, payments, or refunds. Refunds are not saved between messages in this demo.
      </p>

      <label>
        Customer{' '}
        <select value={customer} onChange={(e) => { setCustomer(e.target.value); setMessages([]); }}>
          {CUSTOMERS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => ask(s)} disabled={busy}
            style={{ padding: '6px 10px', borderRadius: 16, cursor: 'pointer' }}>
            {s}
          </button>
        ))}
      </div>

      <section aria-live="polite" style={{ minHeight: 200, display: 'grid', gap: 10, marginBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            justifySelf: m.role === 'you' ? 'end' : 'start', maxWidth: '85%',
            background: m.role === 'you' ? '#e6f0fa' : '#f3f5f8', padding: '10px 12px', borderRadius: 10,
          }}>
            <div>{m.text}</div>
            {m.tools && m.tools.length > 0 && (
              <small style={{ color: '#4a5a70' }}>Checked: {m.tools.join(', ')}</small>
            )}
          </div>
        ))}
        {busy && <small style={{ color: '#4a5a70' }}>Thinking…</small>}
      </section>

      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8 }}>
        <label style={{ flex: 1 }}>
          <span style={{ position: 'absolute', left: -9999 }}>Your question</span>
          <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={500}
            placeholder="Ask about an order…" style={{ width: '100%', padding: 10, boxSizing: 'border-box' }} />
        </label>
        <button type="submit" disabled={busy || !input.trim()} style={{ padding: '10px 16px' }}>Send</button>
      </form>
    </main>
  );
}

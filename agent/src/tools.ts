import { Store } from './store';
import { searchPolicy } from './policy';

/** Refunds above this amount (in paise) need human approval. */
export const APPROVAL_THRESHOLD_MINOR = 200000;

export type Session = { userId: string }; // set by the server from the login, never by the model

type Field = { type: 'string' | 'integer' | 'enum'; min?: number; max?: number; values?: string[] };
type ToolSpec = {
  description: string;
  args: Record<string, Field>;
  run: (session: Session, args: Record<string, any>, store: Store) => unknown;
};

const ORDER_ID = /^ord_[0-9]{4,12}$/;

/** Returns an error string, or null when the value is valid. */
function checkField(name: string, f: Field, v: unknown): string | null {
  if (f.type === 'integer') {
    if (!Number.isInteger(v)) return `${name} must be an integer`;
    if (f.min !== undefined && (v as number) < f.min) return `${name} must be >= ${f.min}`;
    if (f.max !== undefined && (v as number) > f.max) return `${name} must be <= ${f.max}`;
  }
  if (f.type === 'string') {
    if (typeof v !== 'string') return `${name} must be a string`;
    if (f.min !== undefined && v.length < f.min) return `${name} is too short`;
    if (f.max !== undefined && v.length > f.max) return `${name} is too long`;
  }
  if (f.type === 'enum' && !f.values!.includes(v as string)) return `${name} must be one of ${f.values!.join(', ')}`;
  return null;
}

export const TOOLS: Record<string, ToolSpec> = {
  get_order: {
    description: 'Get one of the customer\'s orders by id.',
    args: { orderId: { type: 'string', min: 8, max: 20 } },
    run: (s, a, store) => {
      if (!ORDER_ID.test(a.orderId)) return { error: 'invalid_order_id' };
      const o = store.get(a.orderId);
      // Same answer for "missing" and "belongs to someone else", so ids cannot be probed.
      if (!o || o.userId !== s.userId) return { error: 'not_found' };
      const { userId, ...safe } = o;
      return safe;
    },
  },
  get_payment_status: {
    description: 'Get the payment status of one of the customer\'s orders.',
    args: { orderId: { type: 'string', min: 8, max: 20 } },
    run: (s, a, store) => {
      const o = ORDER_ID.test(a.orderId) ? store.get(a.orderId) : undefined;
      if (!o || o.userId !== s.userId) return { error: 'not_found' };
      return { orderId: o.id, paymentStatus: o.paymentStatus };
    },
  },
  list_recent_orders: {
    description: 'List the customer\'s most recent orders.',
    args: { limit: { type: 'integer', min: 1, max: 10 } },
    run: (s, a, store) =>
      store.listForUser(s.userId).slice(0, a.limit).map(({ id, status, amountMinor, createdAt }) =>
        ({ id, status, amountMinor, createdAt })),
  },
  start_refund: {
    description: 'Start a refund for one of the customer\'s orders. Large refunds need approval.',
    args: {
      orderId: { type: 'string', min: 8, max: 20 },
      reason: { type: 'enum', values: ['duplicate_charge', 'item_not_received', 'changed_mind', 'other'] },
    },
    run: (s, a, store) => {
      const o = ORDER_ID.test(a.orderId) ? store.get(a.orderId) : undefined;
      if (!o || o.userId !== s.userId) return { error: 'not_found' };
      if (o.status === 'REFUNDED') return { error: 'already_refunded' };
      if (o.paymentStatus !== 'captured') return { error: 'payment_not_captured' };
      if (o.amountMinor > APPROVAL_THRESHOLD_MINOR) {
        return { orderId: o.id, result: 'pending_approval', reason: a.reason };
      }
      store.update(o.id, { status: 'REFUNDED' });
      return { orderId: o.id, result: 'refunded', reason: a.reason };
    },
  },
  search_policy: {
    description: 'Search the support policy documents.',
    args: { query: { type: 'string', min: 3, max: 200 } },
    run: (_s, a) => searchPolicy(a.query).map(({ id, title, text }) => ({ id, title, text })),
  },
};

/** Validate and run one tool call. Unknown tools and bad arguments never reach the store. */
export function runTool(name: string, rawArgs: unknown, session: Session, store: Store): unknown {
  const tool = TOOLS[name];
  if (!tool) return { error: 'unknown_tool' };
  const args = (rawArgs && typeof rawArgs === 'object' ? rawArgs : {}) as Record<string, unknown>;
  for (const [field, spec] of Object.entries(tool.args)) {
    const problem = checkField(field, spec, args[field]);
    if (problem) return { error: 'invalid_arguments', detail: problem };
  }
  // Only declared fields are passed on. Anything the model adds (such as userId) is dropped.
  const clean: Record<string, any> = {};
  for (const f of Object.keys(tool.args)) clean[f] = args[f];
  return tool.run(session, clean, store);
}

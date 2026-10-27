/**
 * In-memory stand-in for the PayKit ledger. Same shape as the DynamoDB items
 * we will read later, so the agent code will not change when the backend exists.
 */
export type OrderStatus = 'PAID' | 'FULFILLED' | 'REFUNDED';

export type Order = {
  id: string;
  userId: string;
  amountMinor: number; // paise
  status: OrderStatus;
  paymentStatus: 'captured' | 'failed';
  createdAt: string;
};

export class Store {
  private orders = new Map<string, Order>();

  constructor(seed: Order[] = []) {
    for (const o of seed) this.orders.set(o.id, { ...o });
  }

  get(id: string): Order | undefined {
    const o = this.orders.get(id);
    return o ? { ...o } : undefined;
  }

  listForUser(userId: string): Order[] {
    return [...this.orders.values()]
      .filter((o) => o.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((o) => ({ ...o }));
  }

  update(id: string, patch: Partial<Order>): void {
    const o = this.orders.get(id);
    if (o) this.orders.set(id, { ...o, ...patch });
  }
}

export const DEMO_ORDERS: Order[] = [
  { id: 'ord_1001', userId: 'user_a', amountMinor: 249900, status: 'FULFILLED', paymentStatus: 'captured', createdAt: '2026-10-20T10:00:00Z' },
  { id: 'ord_1002', userId: 'user_a', amountMinor: 89900, status: 'PAID', paymentStatus: 'captured', createdAt: '2026-10-22T09:30:00Z' },
  { id: 'ord_1003', userId: 'user_a', amountMinor: 49900, status: 'PAID', paymentStatus: 'failed', createdAt: '2026-10-23T18:15:00Z' },
  { id: 'ord_2001', userId: 'user_b', amountMinor: 750000, status: 'FULFILLED', paymentStatus: 'captured', createdAt: '2026-10-21T12:00:00Z' },
];

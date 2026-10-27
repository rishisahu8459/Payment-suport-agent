/**
 * Policy retrieval. Documents are DATA. The agent reads them, it never follows
 * instructions inside them, and no tool runs because a document asked for it.
 */
export type PolicyDoc = { id: string; title: string; text: string };

export const POLICIES: PolicyDoc[] = [
  {
    id: 'refund-policy',
    title: 'Refund policy',
    text: 'Refunds are available within 7 days of payment for orders that have not shipped. Refunds above Rs 2000 require approval from the support team and take 3 to 5 business days after approval.',
  },
  {
    id: 'failed-payments',
    title: 'Failed payments',
    text: 'A payment can fail because of a bank decline, a timeout, or insufficient balance. Failed payments are not charged. Retry the payment from the order page.',
  },
  {
    id: 'delivery',
    title: 'Order status meanings',
    text: 'PAID means payment is confirmed and the order is queued. FULFILLED means the order has been packed and dispatched. REFUNDED means money was returned to the original payment method.',
  },
];

export function searchPolicy(query: string, limit = 2): PolicyDoc[] {
  const terms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
  const scored = POLICIES.map((doc) => {
    const words = doc.text.toLowerCase() + ' ' + doc.title.toLowerCase();
    const score = terms.reduce((s, t) => s + (words.includes(t) ? 1 : 0), 0);
    return { doc, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.doc);
}

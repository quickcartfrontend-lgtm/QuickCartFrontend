import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import { apiError } from '../errors';
import { readJson, requireRole } from '../request';

// Dev controls (see browser.js): mockChat.mode('429' | '503' | 'ok'), mockChat.nextReply('text')
export const chatControl = { mode: 'ok', nextReply: null };

const conversations = new Set(); // `${userId}:${uuid}`
const hits = new Map(); // userId -> timestamps of the last minute (contract: 10 messages/min/user)

function rateLimited(request, seconds) {
  return HttpResponse.json(
    {
      timestamp: new Date().toISOString(), status: 429, error: 'Too Many Requests', code: 'RATE_LIMITED',
      message: 'Too many messages. Please wait a moment and try again.',
      path: new URL(request.url).pathname, details: [],
    },
    { status: 429, headers: { 'Retry-After': String(seconds) } }
  );
}

function canned(userId, text) {
  const t = text.toLowerCase();
  if (t.includes('order')) {
    const last = [...db.ordersOf(userId)].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return last
      ? `Your latest order is ${last.orderNumber}, status ${last.status}. Details: /orders/${last.id}`
      : 'You have no orders yet.';
  }
  if (t.includes('cart')) {
    const lines = db.cartItems(userId).length;
    return lines ? `Your cart has ${lines} line(s). Review it on the Cart page.` : 'Your cart is empty.';
  }
  const words = t.split(/[^a-z]+/).filter((w) => w.length >= 3);
  const found = db.products().filter((p) => p.active && words.some((w) => p.name.toLowerCase().includes(w))).slice(0, 3);
  if (found.length) {
    return found
      .map((p) => `- ${p.name} (${p.unit}) ₹${p.price.toFixed(2)}, ${db.stock(p.id) > 0 ? 'in stock' : 'out of stock'}: /products/${p.id}`)
      .join('\n');
  }
  return 'I can help with products, your cart and your orders. What would you like to know?';
}

export const chatHandlers = [
  http.post('*/api/v1/chat/messages', async ({ request }) => {
    await delay(1200); // long enough to see the typing indicator
    const auth = requireRole(request, 'CUSTOMER');
    if (auth.response) return auth.response;
    const userId = Number(auth.claims.sub);

    const body = await readJson(request);
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 500) {
      return apiError(request, 400, 'VALIDATION_ERROR', 'Validation failed.',
        [{ field: 'message', message: 'size must be between 1 and 500' }]);
    }

    if (chatControl.mode === '429') return rateLimited(request, 7);
    if (chatControl.mode === '503') {
      return apiError(request, 503, 'SERVICE_UNAVAILABLE', 'The assistant is temporarily unavailable. Please try again.');
    }

    const now = Date.now();
    const recent = (hits.get(userId) ?? []).filter((t) => now - t < 60000);
    if (recent.length >= 10) return rateLimited(request, Math.max(1, Math.ceil((recent[0] + 60000 - now) / 1000)));
    hits.set(userId, [...recent, now]);

    // unknown / foreign / missing id => a brand-new conversation, never a 404 (contract)
    const known = typeof body.conversationId === 'string' && conversations.has(`${userId}:${body.conversationId}`);
    const conversationId = known ? body.conversationId : crypto.randomUUID();
    conversations.add(`${userId}:${conversationId}`);

    const reply = chatControl.nextReply ?? canned(userId, message);
    chatControl.nextReply = null;
    return HttpResponse.json({ conversationId, reply, createdAt: new Date().toISOString() });
  }),

  http.delete('*/api/v1/chat/conversations/:id', async ({ request, params }) => {
    await delay(100);
    const auth = requireRole(request, 'CUSTOMER');
    if (auth.response) return auth.response;
    conversations.delete(`${auth.claims.sub}:${params.id}`);
    return new HttpResponse(null, { status: 204 }); // idempotent
  }),
];
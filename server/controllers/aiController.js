/**
 * aiController.js — "Maya" AI assistant powered by Google Gemini
 *
 * Endpoints:
 *   POST /api/ai/chat          → Conversational assistant (Maya)
 *   POST /api/ai/parse-search  → NLP → structured filter params
 *   GET  /api/ai/review-summary/:hotelId → AI digest of reviews
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import Booking from '../models/Booking.js';
import Review  from '../models/Review.js';
import { ok, fail } from '../utils/respond.js';

const GEMINI_MODEL          = 'gemini-3.6-flash';
const GEMINI_MODEL_FALLBACK = 'gemini-3.5-flash-lite'; // used if primary is overloaded

// ── Lazy-initialised Gemini client ───────────────────────────────
let _genAI = null;
const getGenAI = () => {
    if (!_genAI) {
        const key = process.env.GEMINI_API_KEY;
        if (!key) throw new Error('GEMINI_API_KEY not configured');
        _genAI = new GoogleGenerativeAI(key);
    }
    return _genAI;
};

const getModel = (systemInstruction, useFallback = false) => {
    return getGenAI().getGenerativeModel({
        model: useFallback ? GEMINI_MODEL_FALLBACK : GEMINI_MODEL,
        systemInstruction,
    });
};

// Run with automatic fallback on 503 (model overloaded)
const geminiRequest = async (systemInstruction, fn) => {
    try {
        return await fn(getModel(systemInstruction, false));
    } catch (err) {
        if (err.message?.includes('503') || err.message?.includes('high demand')) {
            console.warn('[AI] Primary model overloaded, trying fallback model');
            return await fn(getModel(systemInstruction, true));
        }
        throw err;
    }
};

// ── System prompt — Maya's personality & knowledge ───────────────
const MAYA_SYSTEM_PROMPT = `You are Maya, YoYo Rooms' friendly AI assistant — like Air India's Tia but for hotels.
YoYo Rooms is an OYO-inspired hotel booking platform for India.

Your role:
- Answer hotel and booking questions clearly and warmly
- Help users with booking status, cancellation policy, check-in times
- Suggest hotels based on city, budget, and preferences
- Keep responses SHORT (2-4 sentences max) and conversational
- Use emojis sparingly to be friendly (1-2 per message max)
- Always be helpful — if you don't know something, say "Let me connect you with our support team"

Key facts about YoYo Rooms:
- Available across 200+ cities in India
- Price range: Rs 500 to Rs 10,000 per night
- Free cancellation up to 48 hours before check-in
- Payment: Pay at Hotel or Stripe (cards/international)
- Check-in time: 12:00 PM | Check-out time: 11:00 AM
- Coupon codes: YOYO10 (10% off), YOYO20 (20% off), WELCOME50 (Rs 50 off first booking)
- GST of 12% + Rs 99 service fee added to all bookings
- Support email: admin@mayankcodes.dev
- For payment issues, users can contact: admin@mayankcodes.dev

If a user asks about THEIR specific booking (e.g., "where is my booking?"),
tell them to visit the "My Bookings" section in their profile, or ask them to share their Booking ID.

Never make up booking IDs or room availability. If asked for real-time data you don't have,
guide the user to the relevant section of the app.

Respond in English by default. If user writes in Hindi, respond in simple Hinglish.`;

// ── Quick reply chips by context ──────────────────────────────────
const getQuickReplies = (msg) => {
    const m = msg.toLowerCase();
    if (m.includes('cancel') || m.includes('refund'))
        return ['How do I cancel?', 'Refund timeline?', 'No-show policy'];
    if (m.includes('book') || m.includes('room'))
        return ['How to book a room?', 'Best hotels in Goa', 'Check my booking'];
    if (m.includes('payment') || m.includes('pay'))
        return ['Payment methods?', 'Apply coupon', 'Invoice/receipt'];
    if (m.includes('check') || m.includes('in') || m.includes('out'))
        return ['Check-in time?', 'Early check-in?', 'Late check-out?'];
    return ['Track my booking', 'Cancellation policy', 'Best deals today', 'Contact support'];
};

// ── POST /api/ai/chat ─────────────────────────────────────────────
export const aiChat = async (req, res) => {
    try {
        const { message, history = [], userId } = req.body;
        if (!message?.trim()) return fail(res, 'Message is required');

        // Build system context (optionally enriched with user's last booking)
        let systemContext = MAYA_SYSTEM_PROMPT;
        if (userId) {
            try {
                const b = await Booking.findOne({ user: userId }).sort({ createdAt: -1 }).populate('room hotel').lean();
                if (b) systemContext += `\n[Context: User's last booking: ${b._id}, ${b.room?.roomType} at ${b.hotel?.name}, status: ${b.status}]`;
            } catch (_) {}
        }

        // Map history to Gemini Content format.
        // Gemini requires history to START with role 'user' — drop any leading 'model' entries.
        const rawHistory = history.slice(-8).map(h => ({
            role:  h.role === 'maya' ? 'model' : 'user',
            parts: [{ text: h.content }],
        }));
        const firstUserIdx  = rawHistory.findIndex(m => m.role === 'user');
        const geminiHistory = firstUserIdx > 0 ? rawHistory.slice(firstUserIdx) : rawHistory;

        const reply = await geminiRequest(systemContext, async (model) => {
            const chat   = model.startChat({ history: geminiHistory });
            const result = await chat.sendMessage(message.trim());
            return result.response.text()?.trim() || "I'm having a moment — please try again!";
        });

        ok(res, { reply, quickReplies: getQuickReplies(message) });

    } catch (error) {
        console.error('[AI] chat error:', error.message);
        ok(res, {
            reply: "I'm temporarily unavailable. For urgent help, email admin@mayankcodes.dev",
            quickReplies: ['Email support', 'View my bookings', 'Cancellation policy'],
        });
    }
};

// ── POST /api/ai/parse-search ─────────────────────────────────────
export const parseSearch = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query?.trim()) return fail(res, 'Query required');

        const prompt = `You are a search parser for an Indian hotel booking app.
Extract structured filter params from this user query: "${query}"

Return ONLY valid JSON (no explanation, no markdown) in this exact shape:
{
  "city": "string or null",
  "roomType": "Single Room|Double Room|Suite|Deluxe Room|null",
  "amenities": ["Free Wi-Fi","Pool Access","Air Conditioning","Free Breakfast","Parking","Gym","Spa","Room Service"],
  "maxPrice": number or null,
  "category": "Budget|Standard|Luxury|null"
}

Rules:
- amenities must be from the allowed list only, as an array
- maxPrice is per night in INR as a plain number
- city must be an Indian city name or null
- roomType must exactly match one allowed value or null
- category must exactly match one allowed value or null`;

        const filters = await geminiRequest(
            'You are a JSON-only search parser. Return only valid JSON, no markdown, no explanation.',
            async (model) => {
                const result = await model.generateContent(prompt);
                const raw    = result.response.text()?.trim() || '{}';
                const match  = raw.match(/\{[\s\S]*\}/);
                return match ? JSON.parse(match[0]) : {};
            }
        );
        ok(res, { filters });
    } catch (error) {
        console.error('[AI] parse-search error:', error.message);
        fail(res, 'Could not parse query');
    }
};

// ── Simple in-memory cache for review summaries (TTL: 12 hours) ──
const summaryCache = new Map();
const CACHE_TTL    = 12 * 60 * 60 * 1000;

// ── GET /api/ai/review-summary/:hotelId ──────────────────────────
export const reviewSummary = async (req, res) => {
    try {
        const { hotelId } = req.params;
        if (!hotelId) return fail(res, 'Hotel ID required');

        const cached = summaryCache.get(hotelId);
        if (cached && Date.now() - cached.cachedAt < CACHE_TTL)
            return ok(res, { summary: cached.summary, fromCache: true });

        const reviews = await Review.find({ hotel: hotelId }).sort({ createdAt: -1 }).limit(30).lean();
        if (reviews.length < 3) return fail(res, 'Not enough reviews to summarize');

        const reviewText = reviews.map(r => `Rating: ${r.rating}/5 - "${r.comment}"`).join('\n');

        const summary = await geminiRequest(
            'You are a hotel review summarizer. Write clear, concise prose summaries.',
            async (model) => {
                const result = await model.generateContent(
                    `Summarize these hotel reviews in 2-3 concise sentences.\nMention what guests love most, any common complaint, and overall sentiment.\nBe specific, not generic. Flowing prose only, no bullet points.\n\nReviews:\n${reviewText}`
                );
                return result.response.text()?.trim() || 'Guests have had a great experience at this property.';
            }
        );
        summaryCache.set(hotelId, { summary, cachedAt: Date.now() });
        ok(res, { summary, reviewCount: reviews.length });

    } catch (error) {
        console.error('[AI] review-summary error:', error.message);
        fail(res, 'Could not generate summary');
    }
};

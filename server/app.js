/**
 * app.js — Pure Express application (no server.listen, no Socket.io)
 *
 * Used by:
 *   • lambda.js  → AWS Lambda via serverless-http
 *   • server.js  → local dev / EC2 (adds Socket.io + listen)
 *
 * Socket-dependent features (notifyOwner, broadcastAvailability) are
 * no-ops when io is not available — they check app.locals.io before emitting.
 */

import express       from 'express';
import 'dotenv/config';
import cors          from 'cors';
import helmet        from 'helmet';
import cookieParser  from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp           from 'hpp';
import rateLimit     from 'express-rate-limit';
import mongoose      from 'mongoose';
import connectDB     from './configs/db.js';
import connectCloudinary from './configs/cloudinary.js';

// ── Event bus ─────────────────────────────────────────────────────
import { bookingBus } from './events/bookingEvents.js';

// ── Routes ────────────────────────────────────────────────────────
import { stripeWebhooks } from './controllers/stripeWebhooks.js';
import authRouter     from './routes/authRoutes.js';
import userRouter     from './routes/userRoutes.js';
import hotelRouter    from './routes/hotelRoutes.js';
import roomRouter     from './routes/roomRoutes.js';
import bookingRouter  from './routes/bookingRoutes.js';
import reviewRouter   from './routes/reviewRoutes.js';
import adminRouter    from './routes/adminRoutes.js';
import aiRouter       from './routes/aiRoutes.js';
import newsletterRouter from './routes/newsletterRoutes.js';

const app = express();
app.set('trust proxy', 1); // AWS API Gateway / Lambda sits behind a proxy

// ── CORS origins ──────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');

const checkOrigin = (origin, cb) => {
    if (!origin ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        allowedOrigins.some(o => origin.startsWith(o.trim()))) {
        cb(null, true);
    } else {
        cb(new Error('CORS: Origin not allowed'));
    }
};

// ── Cloudinary ────────────────────────────────────────────────────
connectCloudinary();

// ── Event bus listeners (io may be undefined on Lambda — safe no-ops) ──
bookingBus.on('booking:created', async ({ booking, roomId, ownerId }) => {
    try {
        const io = app.locals.io;
        if (io) {
            const { notifyOwner, broadcastAvailability } = await import('./socket/socketManager.js');
            notifyOwner(io, ownerId, {
                booking,
                message: `🔔 New booking! ${booking.guests} guest(s), ${new Date(booking.checkInDate).toLocaleDateString('en-IN')}`,
            });
            broadcastAvailability(io, roomId, false);
        }
    } catch (err) {
        console.error('[Event] booking:created handler error:', err.message);
    }
});

bookingBus.on('booking:cancelled', ({ roomId }) => {
    const io = app.locals.io;
    if (io) {
        import('./socket/socketManager.js').then(({ broadcastAvailability }) => {
            broadcastAvailability(io, roomId, true);
        });
    }
});

// ── Security ──────────────────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
}));

app.use(cors({
    origin:      checkOrigin,
    credentials: true,
}));

app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Rate limit exceeded. Please slow down.' },
}));

// Stripe webhook — raw body BEFORE json middleware
app.post('/api/stripe', express.raw({ type: 'application/json' }), stripeWebhooks);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// NoSQL injection prevention
app.use((req, _res, next) => {
    if (req.body)   mongoSanitize.sanitize(req.body,   { replaceWith: '_' });
    if (req.params) mongoSanitize.sanitize(req.params, { replaceWith: '_' });
    next();
});

// HTTP Parameter Pollution prevention
app.use(hpp({ whitelist: ['sort', 'filter', 'city', 'category', 'amenities'] }));

// ── Health check ──────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({
        status:    'ok',
        db:        states[mongoose.connection.readyState],
        runtime:   process.env.AWS_LAMBDA_FUNCTION_NAME ? 'lambda' : 'server',
        uptime:    Math.floor(process.uptime()) + 's',
        timestamp: new Date().toISOString(),
    });
});

// ── DB guard (connects on each cold start; reuses cached on warm) ──
app.use('/api', async (_req, res, next) => {
    try { await connectDB(); next(); }
    catch { res.status(503).json({ success: false, message: 'Database temporarily unavailable' }); }
});

// ── API Routes ────────────────────────────────────────────────────
app.use('/api/auth',       authRouter);
app.use('/api/user',       userRouter);
app.use('/api/hotels',     hotelRouter);
app.use('/api/rooms',      roomRouter);
app.use('/api/bookings',   bookingRouter);
app.use('/api/reviews',    reviewRouter);
app.use('/api/admin',      adminRouter);
app.use('/api/ai',         aiRouter);
app.use('/api/newsletter', newsletterRouter);

// 404
app.use((_req, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
    console.error('[ERROR]', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

export default app;

import express      from 'express';
import { createServer } from 'http';
import { Server }   from 'socket.io';
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

// ── Socket + Event + Jobs ──────────────────────────────────────
import { initSocket, notifyOwner, broadcastAvailability } from './socket/socketManager.js';
import { bookingBus } from './events/bookingEvents.js';
import { startScheduler } from './jobs/scheduler.js';

// ── Routes ─────────────────────────────────────────────────────
import { stripeWebhooks } from './controllers/stripeWebhooks.js';
import authRouter    from './routes/authRoutes.js';
import userRouter    from './routes/userRoutes.js';
import hotelRouter   from './routes/hotelRoutes.js';
import roomRouter    from './routes/roomRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import reviewRouter  from './routes/reviewRoutes.js';
import adminRouter   from './routes/adminRoutes.js';
import aiRouter      from './routes/aiRoutes.js';
import newsletterRouter from './routes/newsletterRoutes.js';


const app    = express();
const server = createServer(app);  // ← HTTP server (needed for Socket.io)

// ═══════════════════════════════════════════════════════════════
// SOCKET.IO — attach to HTTP server
// ═══════════════════════════════════════════════════════════════
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

const io = new Server(server, {
    cors: {
        origin:      checkOrigin,
        credentials: true,
        methods:     ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
});

// Initialize socket handlers
initSocket(io);

// Make io accessible in controllers via app.locals
app.locals.io = io;

// ═══════════════════════════════════════════════════════════════
// EVENT BUS LISTENERS — decoupled side effects
// ═══════════════════════════════════════════════════════════════

// ── Named event handlers (easier to read/test) ───────────────
const onBookingCreated = async ({ booking, roomId, ownerId }) => {
    try {
        notifyOwner(io, ownerId, {
            booking,
            message: `🏨 New booking! ${booking.guests} guest(s), ${new Date(booking.checkInDate).toLocaleDateString('en-IN')}`,
        });
        broadcastAvailability(io, roomId, false);
        console.log(`[Event] booking:created → owner ${ownerId} notified, room ${roomId} availability broadcast`);
    } catch (err) {
        console.error('[Event] booking:created handler error:', err.message);
    }
};

const onBookingCancelled = ({ roomId }) => {
    if (roomId) broadcastAvailability(io, roomId, true);
    console.log(`[Event] booking:cancelled → room ${roomId} now available`);
};

const onBookingStatusChanged = ({ booking, newStatus }) => {
    console.log(`[Event] booking:statusChanged → booking ${booking._id} is now ${newStatus}`);
};

bookingBus.on('booking:created',       onBookingCreated);
bookingBus.on('booking:cancelled',     onBookingCancelled);
bookingBus.on('booking:statusChanged', onBookingStatusChanged);

connectCloudinary();

// ═══════════════════════════════════════════════════════════════
// SECURITY LAYER
// ═══════════════════════════════════════════════════════════════

// 1. Helmet
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
}));

// 2. CORS
app.use(cors({
    origin:      checkOrigin,
    credentials: true,
}));

// 3. Rate limiter
app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Rate limit exceeded. Please slow down.' },
}));

// 4. Stripe webhook (raw body BEFORE json middleware)
app.post('/api/stripe', express.raw({ type: 'application/json' }), stripeWebhooks);

// 5. Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5b. Cookie parsing (for httpOnly refresh token)
app.use(cookieParser());

// 6. NoSQL injection prevention — only sanitize body & params (req.query is read-only getter in Node 18+)
app.use((req, _res, next) => {
    if (req.body)   mongoSanitize.sanitize(req.body,   { replaceWith: '_' });
    if (req.params) mongoSanitize.sanitize(req.params, { replaceWith: '_' });
    next();
});

// 7. HTTP Parameter Pollution prevention
app.use(hpp({
    whitelist: ['sort', 'filter', 'city', 'category', 'amenities'],
}));

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK — includes socket status
// ═══════════════════════════════════════════════════════════════
app.get('/api/health', async (_req, res) => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({
        status:          'ok',
        db:              states[mongoose.connection.readyState],
        sockets:         io.engine.clientsCount,
        uptime:          Math.floor(process.uptime()) + 's',
        timestamp:       new Date().toISOString(),
    });
});

// ═══════════════════════════════════════════════════════════════
// DB guard
// ═══════════════════════════════════════════════════════════════
app.use('/api', async (_req, res, next) => {
    try { await connectDB(); next(); }
    catch { res.status(503).json({ success: false, message: 'Database temporarily unavailable' }); }
});

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// START — use server.listen (not app.listen) for Socket.io
// ═══════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 4000;
connectDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`🚀 YoYo server on port ${PORT}`);
            console.log(`✅ Socket.io ready`);
            startScheduler(); // Start cron jobs after DB is connected
        });
    })
    .catch(() => process.exit(1));

// ─────────────────────────────────────────────
// GRACEFUL SHUTDOWN — handles AWS SIGTERM + Ctrl-C
// ─────────────────────────────────────────────
const shutdown = async (signal) => {
    console.log(`\n[Server] ${signal} received — shutting down gracefully…`);
    server.close(async () => {
        try {
            await mongoose.disconnect();
            console.log('[Server] MongoDB disconnected. Exiting cleanly.');
        } catch (err) {
            console.error('[Server] Error during shutdown:', err.message);
        }
        process.exit(0);
    });
    // Force-exit if not done within 10 seconds
    setTimeout(() => {
        console.error('[Server] Graceful shutdown timed out — forcing exit.');
        process.exit(1);
    }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

export default app;
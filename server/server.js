/**
 * server.js — Local dev / EC2 entry point
 *
 * Adds Socket.io + HTTP server on top of the pure Express app (app.js).
 * NOT used on AWS Lambda — see lambda.js for that.
 *
 * Run with: node server.js  (or via PM2: pm2 start ecosystem.config.cjs)
 */

import { createServer }  from 'http';
import { Server }        from 'socket.io';
import mongoose          from 'mongoose';
import connectDB         from './configs/db.js';
import { startScheduler } from './jobs/scheduler.js';
import { initSocket }    from './socket/socketManager.js';
import app               from './app.js';

// ── HTTP Server (needed for Socket.io) ───────────────────────────
const server = createServer(app);

// ── CORS for Socket.io (reuse same origins as Express) ───────────
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

// ── Socket.io ────────────────────────────────────────────────────
const io = new Server(server, {
    cors: {
        origin:      checkOrigin,
        credentials: true,
        methods:     ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
});

initSocket(io);

// Make io available to route handlers via app.locals
app.locals.io = io;

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

connectDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`🚀 YoYo server running on port ${PORT}`);
            console.log(`✅ Socket.io ready`);
            startScheduler();
        });
    })
    .catch(() => process.exit(1));

// ── Graceful Shutdown (SIGTERM from AWS EC2 / Ctrl-C) ────────────
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
    setTimeout(() => {
        console.error('[Server] Graceful shutdown timed out — forcing exit.');
        process.exit(1);
    }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
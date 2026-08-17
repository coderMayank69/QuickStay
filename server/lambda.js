/**
 * lambda.js  — AWS Lambda entry point for YoYo backend
 *
 * This wraps the Express app with `serverless-http` so Lambda can
 * handle API Gateway HTTP events.
 *
 * Socket.io is intentionally disabled on Lambda — Lambda functions are
 * stateless and short-lived, so persistent WebSocket connections are not
 * supported via this adapter. Real-time features (viewer count, owner
 * notifications) gracefully degrade to no-ops.
 *
 * Local dev still uses server.js which runs the full HTTP server with Socket.io.
 */

import serverless from 'serverless-http';
import app        from './app.js';      // ← pure Express app (no listen/socket)

// serverless-http wraps app into a Lambda-compatible handler
export const handler = serverless(app, {
  // Binary MIME types — API Gateway will base64-encode these
  binary: [
    'application/octet-stream',
    'image/*',
    'multipart/form-data',
  ],
});

# YoYo Rooms - Hotel Booking Platform

**Production-grade full-stack hotel booking platform - MERN + AWS Lambda + Gemini AI**

[Live Demo](https://yoyo.mayankcodes.dev) | [Repository](https://github.com/mayankcodes-dev/YOYO) | [Getting Started](#getting-started) | [API Reference](#api-reference) | [Deployment](#deployment)

![Live](https://img.shields.io/badge/Live-yoyo.mayankcodes.dev-E8003D?style=flat-square)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=flat-square)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white&style=flat-square)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white&style=flat-square)
![AWS Lambda](https://img.shields.io/badge/AWS-Lambda-FF9900?logo=awslambda&logoColor=white&style=flat-square)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe&logoColor=white&style=flat-square)
![Gemini AI](https://img.shields.io/badge/Gemini-AI-4285F4?logo=google&logoColor=white&style=flat-square)

---

## Live Links

| Resource | URL |
|----------|-----|
| **Frontend** (Vercel) | [yoyo.mayankcodes.dev](https://yoyo.mayankcodes.dev) |
| **Backend API** (AWS Lambda) | [mcr5117577.execute-api.ap-south-1.amazonaws.com](https://mcr5117577.execute-api.ap-south-1.amazonaws.com) |
| **GitHub Repo** | [github.com/mayankcodes-dev/YOYO](https://github.com/mayankcodes-dev/YOYO) |

---

## Overview

YoYo Rooms is an OYO-inspired hotel booking platform for India with two distinct portals:

| Travelers | Hotel Owners |
|-----------|-------------|
| Search and filter 10,000+ rooms by city, type, and price | Register a hotel and manage room listings |
| Real-time date-range availability checking | Upload up to 5 room images via Cloudinary |
| Book rooms with dynamic pricing (GST + service fee) | Toggle room availability instantly |
| Pay via Stripe checkout or at the hotel | Revenue dashboard with booking analytics |
| Email booking confirmations | View guest details and payment status |
| Chat with Maya - AI concierge | |

---

## Features

- **Auth** - JWT sessions, Google OAuth, bcrypt + pepper password hashing
- **Maya AI Chatbot** - Google Gemini 3.6 Flash with multi-turn conversation history and auto-fallback to gemini-3.5-flash-lite on 503 errors
- **Smart Search** - NLP query parsing converts natural language into structured room filters
- **Availability Engine** - Date-range overlap detection prevents double-bookings
- **Stripe Integration** - Hosted checkout with webhook-based payment verification
- **Email Notifications** - Booking confirmations via Brevo SMTP with HTML templates
- **Image Hosting** - Up to 5 images per room on Cloudinary with auto-optimization
- **Owner Dashboard** - Live revenue metrics, booking analytics, and room management
- **PWA** - Installable as a home-screen app, offline-ready, responsive on all devices
- **Reviews and Ratings** - Per-hotel review system
- **Coupon System** - Discount codes with server-side validation
- **10,000+ Hotels** - Seeded across 200+ Indian cities

---

## Architecture

```
Browser / PWA  (yoyo.mayankcodes.dev on Vercel)
React 19 + Vite + Tailwind CSS v4
         |
         | HTTPS via axios
         v
AWS API Gateway HTTP API v2
mcr5117577.execute-api.ap-south-1.amazonaws.com
         |
         v
AWS Lambda  Node 22  arm64 Graviton  ap-south-1
serverless-http wrapping Express 5
Secrets via AWS SSM Parameter Store
    |         |          |          |
    v         v          v          v
MongoDB   Cloudinary  Stripe   Google Gemini
 Atlas    (images)  (payments) (Maya AI)
```

### Project Structure

```
YOYO/
|-- client/                 React + Vite PWA  (Vercel)
|   |-- public/             Static assets, PWA icons, maya.png
|   |-- src/
|   |   |-- components/     Navbar, Hero, MayaChatbot, ...
|   |   |-- context/        AppContext - global state, axios, auth
|   |   |-- pages/
|   |   |   |-- hotelOwner/ Owner dashboard pages
|   |   |   -- admin/      Admin panel
|   |-- .env                Local dev vars (gitignored)
|   |-- .env.production     Production vars baked into bundle (committed)
|   -- vercel.json         SPA rewrite rules
|
|-- server/                 Express API  (AWS Lambda)
|   |-- configs/            MongoDB + Cloudinary init
|   |-- controllers/        Business logic
|   |-- middleware/         JWT protect, multer, rate-limit
|   |-- models/             Mongoose schemas
|   |-- routes/             API routes
|   |-- lambda.js           serverless-http Lambda handler
|   |-- serverless.yml      Serverless Framework config
|   -- .env                Local secrets (prod uses SSM)
|
|-- addHotels.js            Seed script - 10,000 hotels
-- README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, React Router 7, Tailwind CSS v4, Framer Motion, GSAP, Axios, Vite PWA |
| **Backend** | Express 5, Mongoose 8, serverless-http, Multer 2, Nodemailer 7, jsonwebtoken, bcryptjs |
| **Infrastructure** | Vercel (frontend), AWS Lambda arm64, AWS API Gateway v2, AWS SSM, ap-south-1 |
| **AI** | Google Gemini 3.6 Flash (chatbot + NLP search), fallback to gemini-3.5-flash-lite on 503 |
| **Auth** | JWT access + refresh tokens, Google OAuth 2.0, bcrypt + server-side pepper |
| **Payments** | Stripe Checkout + webhook verification |
| **Images** | Cloudinary with auto-optimization, up to 5 images per room |
| **Email** | Brevo SMTP with HTML booking confirmation templates |
| **Database** | MongoDB Atlas with Mongoose 8 |

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas cluster
- Accounts: Stripe, Cloudinary, Google Cloud Console, Google AI Studio

### 1. Clone

```bash
git clone https://github.com/mayankcodes-dev/YOYO.git
cd YOYO
```

### 2. Environment Variables

**client/.env** (local dev only - gitignored)

```env
VITE_BACKEND_URL=http://localhost:4000
VITE_CURRENCY=INR
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

**server/.env** (local dev only - production uses AWS SSM)

```env
PORT=4000
NODE_ENV=development
MONGODB_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
PASSWORD_PEPPER=your_bcrypt_pepper
GOOGLE_CLIENT_ID=your_google_client_id
ALLOWED_ORIGINS=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
SENDER_EMAIL=your_email
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Install and Run

```bash
# Backend on port 4000
cd server && npm install && npm run server

# Frontend on port 5173
cd client && npm install && npm run dev
```

### 4. Seed Database (optional)

```bash
node addHotels.js    # adds 10,000 hotels across 200+ Indian cities
```

---

## API Reference

**Base URL**: https://mcr5117577.execute-api.ap-south-1.amazonaws.com

Protected routes require: Authorization: Bearer <token>

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Register with email and password |
| POST | /api/auth/login | No | Login - returns JWT |
| POST | /api/auth/google | No | Google OAuth token exchange |
| GET | /api/auth/me | Yes | Current user profile |
| POST | /api/auth/refresh | No | Refresh access token |

### Rooms and Hotels

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/rooms | No | List rooms (filterable by city, type, price) |
| POST | /api/rooms | Yes | Create room with up to 5 image uploads |
| GET | /api/rooms/owner | Yes | Owner room listings |
| POST | /api/rooms/toggle-availability | Yes | Toggle room visibility |
| POST | /api/hotels | Yes | Register hotel and become owner |

### Bookings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/bookings/check-availability | No | Check date range overlap |
| POST | /api/bookings/book | Yes | Create booking |
| GET | /api/bookings/user | Yes | User booking history |
| GET | /api/bookings/hotel | Yes | Owner bookings and revenue |
| POST | /api/bookings/stripe-payment | Yes | Create Stripe checkout session |

### AI - Maya Chatbot

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/ai/chat | Multi-turn chat with Gemini 3.6 Flash |
| POST | /api/ai/parse-search | Natural language to structured room filters |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /stripe | Stripe payment events (raw body required) |

---

## Data Models

### Booking

| Field | Type | Notes |
|-------|------|-------|
| user | Ref to User | Guest |
| room | Ref to Room | Booked room |
| hotel | Ref to Hotel | Property |
| checkInDate | Date | |
| checkOutDate | Date | |
| totalPrice | Number | Includes GST and service fee |
| guests | Number | Guest count |
| status | Enum | pending, confirmed, cancelled |
| paymentMethod | String | Stripe or Pay At Hotel |
| isPaid | Boolean | Payment confirmed by webhook |

### Room

| Field | Type | Notes |
|-------|------|-------|
| hotel | Ref to Hotel | Associated hotel |
| roomType | String | Single, Double, Suite, Deluxe |
| pricePerNight | Number | INR |
| amenities | Array | Wi-Fi, Pool, Gym, AC, etc |
| images | Array | 1 to 5 Cloudinary CDN URLs |
| isAvailable | Boolean | Controls listing visibility |
| category | String | Budget, Standard, Luxury |

---

## Deployment

### Frontend - Vercel

```
Root directory:  client/
Build command:   npm run build
Output dir:      dist/
```

client/.env.production is committed to git. It contains public VITE_ vars that Vite bakes into the JS bundle at build time:

```
VITE_BACKEND_URL=https://mcr5117577.execute-api.ap-south-1.amazonaws.com
```

### Backend - AWS Lambda via Serverless Framework

```bash
cd server
npm install -g serverless@3
serverless deploy --stage prod
```

All secrets live in AWS SSM Parameter Store under /yoyo/prod/ and are never in source code. The Express app is wrapped with serverless-http in lambda.js enabling zero-change Lambda deployment.

**Lambda configuration:**
- Runtime: Node.js 22, arm64 Graviton (40% cheaper than x86)
- Memory: 512 MB
- Timeout: 29 seconds
- Region: ap-south-1 Mumbai for lowest latency in India

---

## Scripts

| Location | Command | Description |
|----------|---------|-------------|
| Root | node addHotels.js | Seed 10,000 hotels into MongoDB |
| Client | npm run dev | Vite dev server on port 5173 |
| Client | npm run build | Production build |
| Client | npm run lint | ESLint |
| Server | npm run server | nodemon dev server on port 4000 |
| Server | npm start | Production start |
| Server | serverless deploy --stage prod | Deploy to AWS Lambda |

---

Built with love by [Mayank Singh](https://mayankcodes.dev)
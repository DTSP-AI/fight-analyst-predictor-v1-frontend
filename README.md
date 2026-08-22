# Fight Analyst Frontend

Next.js frontend for the Fight Analyst application - AI-powered fight analysis and coaching insights.

## Prerequisites

- Node.js 18.x or 20.x
- npm or yarn

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your configuration
# Set NEXT_PUBLIC_BACKEND_URL to your backend URL

# Run development server
npm run dev
```

The app will be available at http://localhost:3000

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | Backend base URL (clients append `/api`) | `http://localhost:8001` |

## Features

- YouTube video analysis submission
- Real-time analysis progress tracking
- Fighter assessment cards (5 bullet points each)
- Clickable Key Moments → auto-prompts chat discussion
- AI-powered chat for follow-up questions
- Voice chat support

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Framer Motion
- Tailwind CSS (via globals.css)

## Related

- [Backend Repository](https://github.com/DTSP-AI/fight-analyst-backend)

# Paidly Frontend

Next.js frontend for the Paidly payment application.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with:

```env
NEXT_PUBLIC_DYNAMIC_ENV_ID=your_dynamic_environment_id
NEXT_PUBLIC_BASE_SEPOLIA_RPC=https://base-sepolia.g.alchemy.com/v2/your_api_key
```

3. Run development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Build for Production

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

See main [README](../README.md) for full documentation.

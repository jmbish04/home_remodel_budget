# Cloudflare Worker - Home Remodel Budget

A unified Cloudflare Worker that hosts a high-performance Astro/React frontend with an agentic backend capable of orchestrating Google Apps Script changes via a Git-enabled sandbox.

## Features

- **Astro Frontend**: Server-side rendered React application with dark theme
- **Shadcn UI**: Modern component library with Tailwind CSS
- **Assistant-UI Chat**: Conversational interface for budget interactions
- **Sandbox Integration**: Cloudflare Sandbox SDK for secure code execution
- **Agent Architecture**: AI-powered agent for Apps Script modifications
- **Git Automation**: Clone, modify, and push changes to the repository

## Project Structure

```
cloudflare-worker/
├── src/
│   ├── components/       # React components
│   │   ├── ui/           # Shadcn UI components
│   │   └── Chat.tsx      # Chat interface component
│   ├── layouts/          # Astro layouts
│   ├── pages/            # Astro pages
│   ├── styles/           # Global CSS styles
│   ├── lib/              # Utility functions
│   ├── worker/           # Worker backend code
│   │   ├── index.ts      # Main worker entry point
│   │   ├── agent.ts      # Agent handler
│   │   └── tools.ts      # Git operation tools
│   └── test/             # Test files
├── public/               # Static assets
├── wrangler.jsonc        # Cloudflare Worker configuration
├── astro.config.mjs      # Astro configuration
├── tailwind.config.cjs   # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Secrets

Copy the example file and fill in your values:

```bash
cp .dev.vars.example .dev.vars
```

Required secrets:
- `GITHUB_TOKEN`: GitHub Personal Access Token with `repo` scope
- `OPENAI_API_KEY`: OpenAI API key for the agent

### 3. Generate Types

Generate TypeScript types for your bindings:

```bash
npm run type-gen
```

### 4. Local Development

```bash
npm run dev
```

## Configuration

### wrangler.jsonc

The Worker is configured with:

- **Assets**: Astro static files served from `./dist`
- **Sandbox**: Durable Object for code execution
- **AI**: Workers AI binding for LLM inference
- **Environment Variables**: `APPS_SCRIPT_ID`, `REPO_URL`

### TypeScript

Types are generated from `wrangler.jsonc` and `.dev.vars`:

```bash
npm run type-gen
```

This creates `worker-configuration.d.ts` with the `Env` interface containing all bindings and secrets.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start local development server |
| `npm run build` | Build the Astro project |
| `npm run deploy` | Build and deploy to Cloudflare |
| `npm run type-gen` | Generate TypeScript types |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/chat` | POST | Chat with the budget assistant |
| `/api/projects` | GET | List projects |

## Agent Capabilities

The AI agent can:

1. Clone the `home_remodel_budget` repository
2. Read and modify Apps Script files (`Code.js`, `index.html`)
3. Commit and push changes to GitHub
4. Trigger the Apps Script deployment workflow

## Deployment

Changes pushed to GitHub trigger the existing GitHub Action (`.github/workflows/cloudflare-deploy.yml`) to deploy the Worker.

### Manual Deployment

```bash
npm run deploy
```

### Required GitHub Secrets

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Worker deployment permissions

### Worker Secrets (set via Wrangler)

```bash
wrangler secret put GITHUB_TOKEN
wrangler secret put OPENAI_API_KEY
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Cloudflare Worker                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐     ┌───────────────────────────┐ │
│  │   Astro/React   │     │      Agent Backend        │ │
│  │    Frontend     │────▶│  (Sandbox + AI Binding)   │ │
│  │   (Dark Theme)  │     └───────────────────────────┘ │
│  └─────────────────┘                  │                 │
│                                       │                 │
│                                       ▼                 │
│                        ┌───────────────────────────┐    │
│                        │    Cloudflare Sandbox     │    │
│                        │  (Git Clone/Modify/Push)  │    │
│                        └───────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
               ┌───────────────────────────┐
               │     GitHub Repository     │
               │  (home_remodel_budget)    │
               └───────────────────────────┘
                            │
                            ▼
               ┌───────────────────────────┐
               │    GitHub Actions         │
               │  (Apps Script Deploy)     │
               └───────────────────────────┘
```

## Related

- [Apps Script Project](../appsscript/README.md)
- [Cloudflare Sandbox SDK](https://developers.cloudflare.com/sandbox/)
- [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/)

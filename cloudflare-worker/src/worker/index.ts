/**
 * Home Remodel Budget - Cloudflare Worker
 * Main entry point for the API and agent orchestration
 * 
 * Security Notes:
 * - CORS is currently set to allow all origins for development
 * - In production, restrict CORS to specific trusted origins
 * - Consider adding authentication middleware (e.g., API keys, JWT) for /api/chat endpoint
 * - Git operations use GITHUB_TOKEN - protect this secret carefully
 */

// Re-export Sandbox for Durable Object binding
export { Sandbox } from '@cloudflare/sandbox';

import { handleChat } from './agent';

// The Env interface is defined globally in worker-configuration.d.ts
// It includes: ASSETS, Sandbox, AI, GITHUB_TOKEN, OPENAI_API_KEY, 
// ANTHROPIC_API_KEY, CLOUDFLARE_API_TOKEN, APPS_SCRIPT_ID, REPO_URL

// CORS configuration
// TODO: In production, replace '*' with specific allowed origins
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function handleOptions(): Response {
  return new Response(null, {
    headers: corsHeaders,
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // API Routes
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env, url);
    }

    // For all other routes, let Astro handle it
    // The assets binding will serve the static files and SSR pages
    return env.ASSETS.fetch(request);
  },
};

async function handleApiRequest(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  try {
    // Health check endpoint
    if (url.pathname === '/api/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // API info endpoint
    if (url.pathname === '/api' || url.pathname === '/api/') {
      return new Response(
        JSON.stringify({
          message: 'Home Remodel Budget API',
          version: '1.0.0',
          endpoints: [
            { path: '/api/health', method: 'GET', description: 'Health check' },
            { path: '/api/chat', method: 'POST', description: 'Chat with the budget assistant' },
            { path: '/api/projects', method: 'GET', description: 'List projects' },
          ],
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Chat endpoint - connects to the agent
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const response = await handleChat(request, env);
      
      // Add CORS headers to the response
      const headers = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
      
      return new Response(response.body, {
        status: response.status,
        headers,
      });
    }

    // Projects endpoint (placeholder)
    if (url.pathname === '/api/projects') {
      return new Response(
        JSON.stringify({
          projects: [
            {
              id: '1',
              name: 'Kitchen Renovation',
              budget: 25000,
              spent: 12500,
              status: 'in_progress',
            },
            {
              id: '2',
              name: 'Bathroom Remodel',
              budget: 15000,
              spent: 3200,
              status: 'planning',
            },
          ],
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // 404 for unknown API routes
    return new Response(
      JSON.stringify({ error: 'Not Found', path: url.pathname }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

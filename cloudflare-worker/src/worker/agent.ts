/**
 * Agent Handler
 * Manages the conversation and tool execution for the Home Remodel Budget Agent
 */

import { getSandbox } from '@cloudflare/sandbox';
import type { Sandbox } from '@cloudflare/sandbox';
import {
  cloneRepository,
  readAppsScriptFile,
  writeAppsScriptFile,
  listAppsScriptFiles,
  commitChanges,
  pushChanges,
  getGitStatus,
  agentTools,
  type GitToolsConfig,
} from './tools';

// Use the generated Env type from worker-configuration.d.ts
// The global Env interface is defined in worker-configuration.d.ts

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

const SYSTEM_PROMPT = `You are a helpful assistant for the Home Remodel Budget application. You help users manage their home renovation budget by:

1. Answering questions about budget tracking and expense management
2. Helping update the Google Apps Script project that powers the budget tracker
3. Managing expense categories and features in the codebase

You have access to tools that allow you to:
- Clone the repository
- Read and modify Apps Script files (Code.js and index.html)
- Commit and push changes to trigger automatic deployment

When users ask you to make changes to the Apps Script project:
1. First clone the repository
2. Read the current file contents
3. Make the requested modifications
4. Show the user what changes you made
5. Ask for confirmation before committing and pushing

Be helpful, clear, and always explain what you're doing. If you make code changes, explain what the changes do.`;

export async function handleChat(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json() as { messages: ChatMessage[] };
    const messages = body.messages || [];

    // Create sandbox instance
    const sandbox = getSandbox(env.Sandbox, 'budget-agent');

    // Prepare config for git tools
    const gitConfig: GitToolsConfig = {
      repoUrl: env.REPO_URL || 'https://github.com/jmbish04/home_remodel_budget',
      githubToken: env.GITHUB_TOKEN || '',
      appsScriptId: env.APPS_SCRIPT_ID || '',
    };

    // Use Workers AI for chat completion with tools
    const response = await runAgentConversation(env, sandbox, messages, gitConfig);

    return new Response(JSON.stringify({ message: response }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Chat handler error:', error);
    return new Response(
      JSON.stringify({
        message: 'I apologize, but I encountered an error processing your request. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

async function runAgentConversation(
  env: Env,
  sandbox: Sandbox,
  messages: ChatMessage[],
  gitConfig: GitToolsConfig
): Promise<string> {
  // Prepare messages with system prompt
  const fullMessages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...messages,
  ];

  // Call the AI with tools
  const aiResponse = await env.AI.fetch('https://api.cloudflare.com/client/v4/accounts/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: fullMessages,
      tools: agentTools,
      max_tokens: 2048,
    }),
  });

  if (!aiResponse.ok) {
    throw new Error(`AI API error: ${aiResponse.status}`);
  }

  const aiResult = await aiResponse.json() as {
    result?: {
      response?: string;
      tool_calls?: ToolCall[];
    };
  };

  // Check if there are tool calls to execute
  if (aiResult.result?.tool_calls && aiResult.result.tool_calls.length > 0) {
    const toolResults: string[] = [];
    
    for (const toolCall of aiResult.result.tool_calls) {
      const result = await executeToolCall(sandbox, toolCall, gitConfig);
      toolResults.push(`Tool ${toolCall.function.name}: ${result}`);
    }

    // Make another call with tool results
    const followUpMessages = [
      ...fullMessages,
      {
        role: 'assistant' as const,
        content: `I executed the following tools:\n${toolResults.join('\n')}\n\nLet me summarize the results for you.`,
      },
    ];

    const followUpResponse = await env.AI.fetch('https://api.cloudflare.com/client/v4/accounts/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: followUpMessages,
        max_tokens: 2048,
      }),
    });

    const followUpResult = await followUpResponse.json() as {
      result?: { response?: string };
    };

    return followUpResult.result?.response || 'I executed the requested operations.';
  }

  return aiResult.result?.response || 'I apologize, but I could not generate a response.';
}

async function executeToolCall(
  sandbox: Sandbox,
  toolCall: ToolCall,
  config: GitToolsConfig
): Promise<string> {
  const args = JSON.parse(toolCall.function.arguments || '{}');

  switch (toolCall.function.name) {
    case 'clone_repository':
      return await cloneRepository(sandbox, config);

    case 'read_file':
      return await readAppsScriptFile(sandbox, args.fileName);

    case 'write_file':
      return await writeAppsScriptFile(sandbox, args.fileName, args.content);

    case 'list_files':
      return await listAppsScriptFiles(sandbox);

    case 'commit_changes':
      return await commitChanges(sandbox, args.message);

    case 'push_changes':
      return await pushChanges(sandbox, config);

    case 'get_status':
      return await getGitStatus(sandbox);

    default:
      return `Unknown tool: ${toolCall.function.name}`;
  }
}

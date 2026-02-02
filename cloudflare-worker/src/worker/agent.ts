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

// AI Model configuration - extracted to constants for maintainability
const AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast' as const;
const DEFAULT_MAX_TOKENS = 2048;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
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

/**
 * Validates that a message object has the required structure
 */
function isValidMessage(msg: unknown): msg is ChatMessage {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  return (
    typeof m.role === 'string' &&
    ['user', 'assistant', 'system', 'tool'].includes(m.role) &&
    typeof m.content === 'string'
  );
}

/**
 * Validates the request body structure
 */
function validateRequestBody(body: unknown): ChatMessage[] {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Invalid request body');
  }
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.messages)) {
    return [];
  }
  // Filter and validate each message
  return b.messages.filter(isValidMessage);
}

export async function handleChat(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json();
    
    // Validate the request body structure
    const messages = validateRequestBody(body);

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
  const fullMessages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ];

  // Call the AI with tools using env.AI.run()
  const aiResult = await env.AI.run(AI_MODEL, {
    messages: fullMessages,
    tools: agentTools,
    max_tokens: DEFAULT_MAX_TOKENS,
  }) as {
    response?: string;
    tool_calls?: ToolCall[];
  };

  // Check if there are tool calls to execute
  if (aiResult.tool_calls && aiResult.tool_calls.length > 0) {
    const toolResultMessages: ChatMessage[] = [];
    
    for (const toolCall of aiResult.tool_calls) {
      const result = await executeToolCall(sandbox, toolCall, gitConfig);
      // Add tool result as a tool message (proper format for tool results)
      toolResultMessages.push({
        role: 'tool',
        content: result,
        tool_call_id: toolCall.id,
      });
    }

    // Build follow-up messages with tool results
    const followUpMessages: ChatMessage[] = [
      ...fullMessages,
      { role: 'assistant', content: '', tool_calls: aiResult.tool_calls },
      ...toolResultMessages,
    ];

    const followUpResult = await env.AI.run(AI_MODEL, {
      messages: followUpMessages,
      max_tokens: DEFAULT_MAX_TOKENS,
    }) as {
      response?: string;
    };

    return followUpResult.response || 'I executed the requested operations.';
  }

  return aiResult.response || 'I apologize, but I could not generate a response.';
}

async function executeToolCall(
  sandbox: Sandbox,
  toolCall: ToolCall,
  config: GitToolsConfig
): Promise<string> {
  // Safely parse tool arguments with error handling
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(toolCall.function.arguments || '{}');
    if (typeof args !== 'object' || args === null) {
      args = {};
    }
  } catch {
    return `Error: Invalid arguments for tool ${toolCall.function.name}`;
  }

  try {
    switch (toolCall.function.name) {
      case 'clone_repository':
        return await cloneRepository(sandbox, config);

      case 'read_file':
        if (typeof args.fileName !== 'string') {
          return 'Error: fileName must be a string';
        }
        return await readAppsScriptFile(sandbox, args.fileName);

      case 'write_file':
        if (typeof args.fileName !== 'string' || typeof args.content !== 'string') {
          return 'Error: fileName and content must be strings';
        }
        return await writeAppsScriptFile(sandbox, args.fileName, args.content);

      case 'list_files':
        return await listAppsScriptFiles(sandbox);

      case 'commit_changes':
        if (typeof args.message !== 'string') {
          return 'Error: message must be a string';
        }
        return await commitChanges(sandbox, args.message);

      case 'push_changes':
        return await pushChanges(sandbox, config);

      case 'get_status':
        return await getGitStatus(sandbox);

      default:
        return `Unknown tool: ${toolCall.function.name}`;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return `Error executing ${toolCall.function.name}: ${errorMessage}`;
  }
}

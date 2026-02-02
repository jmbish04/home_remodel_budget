/**
 * Agent Tools for Git Operations
 * These tools enable the agent to clone, modify, and push changes to the Apps Script project
 */

import type { Sandbox } from '@cloudflare/sandbox';

export interface GitToolsConfig {
  repoUrl: string;
  githubToken: string;
  appsScriptId: string;
}

/**
 * Clone the repository into the sandbox
 */
export async function cloneRepository(
  sandbox: Sandbox,
  config: GitToolsConfig
): Promise<string> {
  const authenticatedUrl = config.repoUrl.replace(
    'https://github.com/',
    `https://${config.githubToken}@github.com/`
  );
  
  await sandbox.gitCheckout(authenticatedUrl, {
    targetDir: '/workspace/repo',
    depth: 1,
  });
  
  return 'Repository cloned successfully to /workspace/repo';
}

/**
 * Read a file from the Apps Script source directory
 */
export async function readAppsScriptFile(
  sandbox: Sandbox,
  fileName: string
): Promise<string> {
  const filePath = `/workspace/repo/appsscript/src/${fileName}`;
  const content = await sandbox.readFile(filePath);
  return content;
}

/**
 * Write content to an Apps Script source file
 */
export async function writeAppsScriptFile(
  sandbox: Sandbox,
  fileName: string,
  content: string
): Promise<string> {
  const filePath = `/workspace/repo/appsscript/src/${fileName}`;
  await sandbox.writeFile(filePath, content);
  return `File ${fileName} updated successfully`;
}

/**
 * List files in the Apps Script source directory
 */
export async function listAppsScriptFiles(sandbox: Sandbox): Promise<string> {
  const result = await sandbox.exec('ls', ['-la', '/workspace/repo/appsscript/src']);
  return result.stdout || result.output || 'No files found';
}

/**
 * Commit changes to the repository
 */
export async function commitChanges(
  sandbox: Sandbox,
  message: string
): Promise<string> {
  // Stage all changes
  await sandbox.exec('git', ['-C', '/workspace/repo', 'add', '.']);
  
  // Commit with the provided message
  const result = await sandbox.exec('git', [
    '-C',
    '/workspace/repo',
    'commit',
    '-m',
    message,
  ]);
  
  return result.stdout || result.output || 'Changes committed';
}

/**
 * Push changes to the remote repository
 */
export async function pushChanges(
  sandbox: Sandbox,
  config: GitToolsConfig
): Promise<string> {
  // Set the remote URL with authentication
  const authenticatedUrl = config.repoUrl.replace(
    'https://github.com/',
    `https://${config.githubToken}@github.com/`
  );
  
  await sandbox.exec('git', [
    '-C',
    '/workspace/repo',
    'remote',
    'set-url',
    'origin',
    authenticatedUrl,
  ]);
  
  // Push to main branch
  const result = await sandbox.exec('git', [
    '-C',
    '/workspace/repo',
    'push',
    'origin',
    'main',
  ]);
  
  return 'Changes pushed to GitHub. This will trigger the Apps Script deployment workflow.';
}

/**
 * Get the current git status
 */
export async function getGitStatus(sandbox: Sandbox): Promise<string> {
  const result = await sandbox.exec('git', ['-C', '/workspace/repo', 'status']);
  return result.stdout || result.output || 'No changes';
}

/**
 * Tool definitions for the OpenAI Agents SDK
 */
export const agentTools = [
  {
    type: 'function' as const,
    function: {
      name: 'clone_repository',
      description: 'Clone the home_remodel_budget repository into the sandbox workspace',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Read the contents of a file from the Apps Script source directory (appsscript/src/)',
      parameters: {
        type: 'object',
        properties: {
          fileName: {
            type: 'string',
            description: 'The name of the file to read (e.g., "Code.js" or "index.html")',
          },
        },
        required: ['fileName'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Write content to a file in the Apps Script source directory (appsscript/src/)',
      parameters: {
        type: 'object',
        properties: {
          fileName: {
            type: 'string',
            description: 'The name of the file to write (e.g., "Code.js" or "index.html")',
          },
          content: {
            type: 'string',
            description: 'The new content for the file',
          },
        },
        required: ['fileName', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_files',
      description: 'List all files in the Apps Script source directory',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'commit_changes',
      description: 'Commit all changes made to the repository with a descriptive message',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The commit message describing the changes',
          },
        },
        required: ['message'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'push_changes',
      description: 'Push committed changes to GitHub. This will trigger the Apps Script deployment workflow.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_status',
      description: 'Get the current git status showing any uncommitted changes',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
];

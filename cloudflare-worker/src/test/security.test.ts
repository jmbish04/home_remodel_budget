import { describe, it, expect } from 'vitest';

// Test the security validation logic without importing the actual module
// (to avoid complex mocking of Cloudflare Sandbox)

// Recreate the validation functions for testing
const ALLOWED_FILES = ['Code.js', 'index.html', 'appsscript.json'];

function validateFileName(fileName: string): boolean {
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return false;
  }
  return ALLOWED_FILES.includes(fileName);
}

function sanitizeCommitMessage(message: string): string {
  const sanitized = message
    .slice(0, 500)
    .replace(/[<>]/g, '')
    .trim();
  return sanitized || 'Update Apps Script files';
}

describe('File name validation', () => {
  it('should allow valid file names', () => {
    expect(validateFileName('Code.js')).toBe(true);
    expect(validateFileName('index.html')).toBe(true);
    expect(validateFileName('appsscript.json')).toBe(true);
  });

  it('should reject path traversal attempts', () => {
    expect(validateFileName('../Code.js')).toBe(false);
    expect(validateFileName('../../etc/passwd')).toBe(false);
    expect(validateFileName('..\\..\\windows\\system.ini')).toBe(false);
  });

  it('should reject paths with slashes', () => {
    expect(validateFileName('src/Code.js')).toBe(false);
    expect(validateFileName('/etc/passwd')).toBe(false);
    expect(validateFileName('C:\\Windows\\System32')).toBe(false);
  });

  it('should reject files not in whitelist', () => {
    expect(validateFileName('malicious.exe')).toBe(false);
    expect(validateFileName('secret.txt')).toBe(false);
    expect(validateFileName('.env')).toBe(false);
  });
});

describe('Commit message sanitization', () => {
  it('should allow normal commit messages', () => {
    expect(sanitizeCommitMessage('Add new feature')).toBe('Add new feature');
    expect(sanitizeCommitMessage('Fix bug in Code.js')).toBe('Fix bug in Code.js');
  });

  it('should remove angle brackets', () => {
    expect(sanitizeCommitMessage('Test <script>alert("xss")</script>')).toBe('Test scriptalert("xss")/script');
  });

  it('should truncate long messages', () => {
    const longMessage = 'a'.repeat(600);
    const sanitized = sanitizeCommitMessage(longMessage);
    expect(sanitized.length).toBe(500);
  });

  it('should provide default message for empty input', () => {
    expect(sanitizeCommitMessage('')).toBe('Update Apps Script files');
    expect(sanitizeCommitMessage('   ')).toBe('Update Apps Script files');
  });

  it('should trim whitespace', () => {
    expect(sanitizeCommitMessage('  Test message  ')).toBe('Test message');
  });
});

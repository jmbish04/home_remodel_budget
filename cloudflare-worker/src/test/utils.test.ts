import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('text-red-500', 'bg-blue-500');
    expect(result).toBe('text-red-500 bg-blue-500');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class active-class');
  });

  it('should handle undefined and null values', () => {
    const result = cn('class1', undefined, null, 'class2');
    expect(result).toBe('class1 class2');
  });

  it('should merge tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toBe('py-1 px-4');
  });

  it('should handle empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });
});

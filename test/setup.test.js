import { describe, it, expect } from 'vitest';

describe('Test Setup Verification', () => {
  it('should run basic test', () => {
    expect(true).toBe(true);
  });

  it('should have access to DOM', () => {
    const element = document.createElement('div');
    expect(element).toBeDefined();
    expect(element.tagName).toBe('DIV');
  });

  it('should have mocked Canvas API', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    expect(ctx).toBeDefined();
    expect(ctx.fillRect).toBeDefined();
    expect(typeof ctx.fillRect).toBe('function');
  });

  it('should have mocked Audio API', () => {
    const audio = new Audio();
    
    expect(audio).toBeDefined();
    expect(audio.play).toBeDefined();
    expect(typeof audio.play).toBe('function');
  });

  it('should have mocked localStorage', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.getItem('test')).toBe('value');
    
    localStorage.removeItem('test');
    expect(localStorage.getItem('test')).toBe(null);
  });

  it('should have mocked fetch', () => {
    expect(fetch).toBeDefined();
    expect(typeof fetch).toBe('function');
  });
});
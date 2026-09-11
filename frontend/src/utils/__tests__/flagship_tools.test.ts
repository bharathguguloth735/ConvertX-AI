import { describe, it, expect } from 'vitest';
import { ALL_TOOLS } from '../tools';

describe('Flagship Enterprise Tools Catalog', () => {
  it('should register pdf-sign with correct route and pdf category', () => {
    const tool = ALL_TOOLS.find((t) => t.id === 'pdf-sign');
    expect(tool).toBeDefined();
    expect(tool?.title).toBe('Sign & Fill PDF');
    expect(tool?.category).toBe('pdf');
    expect(tool?.route).toBe('/tools/pdf/sign');
    expect(tool?.acceptedFormats).toContain('pdf');
    expect(tool?.isNew).toBe(true);
  });

  it('should register pdf-redact with correct route and pii description', () => {
    const tool = ALL_TOOLS.find((t) => t.id === 'pdf-redact');
    expect(tool).toBeDefined();
    expect(tool?.title).toBe('Redact & Mask PII');
    expect(tool?.category).toBe('pdf');
    expect(tool?.route).toBe('/tools/pdf/redact');
    expect(tool?.acceptedFormats).toContain('pdf');
    expect(tool?.isNew).toBe(true);
  });

  it('should register batch-converter with multiple accepted formats and route', () => {
    const tool = ALL_TOOLS.find((t) => t.id === 'batch-converter');
    expect(tool).toBeDefined();
    expect(tool?.title).toBe('Batch File Converter');
    expect(tool?.category).toBe('pdf');
    expect(tool?.route).toBe('/tools/batch-converter');
    expect(tool?.acceptedFormats).toEqual(expect.arrayContaining(['pdf', 'docx', 'jpg', 'png']));
    expect(tool?.isNew).toBe(true);
  });

  it('should maintain uniqueness across all tool IDs in the platform catalog', () => {
    const ids = ALL_TOOLS.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should ensure all tools have valid non-empty route paths starting with /', () => {
    ALL_TOOLS.forEach((tool) => {
      expect(tool.route).toMatch(/^\/[a-zA-Z0-9\-_/?=&]+$/);
    });
  });
});

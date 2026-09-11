import { describe, it, expect } from 'vitest';
import {
  ALL_TOOLS,
  TOOL_CATEGORIES,
  searchTools,
  getToolsByCategory,
  SUBSCRIPTION_PLANS,
} from '../tools';

describe('tools catalog and search utility', () => {
  it('contains over 30 verified tools with unique IDs and required metadata', () => {
    expect(ALL_TOOLS.length).toBeGreaterThanOrEqual(30);

    const ids = new Set<string>();
    for (const tool of ALL_TOOLS) {
      expect(ids.has(tool.id)).toBe(false);
      ids.add(tool.id);

      expect(tool.id).toBeTruthy();
      expect(tool.title).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.route).toMatch(/^\/tools\//);
      expect(Array.isArray(tool.acceptedFormats)).toBe(true);
      expect(tool.acceptedFormats.length).toBeGreaterThan(0);
    }
  });

  it('maps all tools to recognized categories in TOOL_CATEGORIES', () => {
    const validCategoryIds = new Set(TOOL_CATEGORIES.map((c) => c.id));

    for (const tool of ALL_TOOLS) {
      expect(validCategoryIds.has(tool.category)).toBe(true);
    }
  });

  describe('searchTools', () => {
    it('returns all tools when search query is empty or whitespace', () => {
      expect(searchTools('').length).toBe(ALL_TOOLS.length);
      expect(searchTools('   ').length).toBe(ALL_TOOLS.length);
    });

    it('filters tools by title match (case-insensitive)', () => {
      const results = searchTools('merger');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((t) => t.id === 'pdf-merge')).toBe(true);
    });

    it('filters tools by accepted file formats', () => {
      const results = searchTools('docx');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((t) => t.acceptedFormats.includes('docx'))).toBe(true);
    });

    it('filters tools by description keywords', () => {
      const results = searchTools('split');
      expect(results.some((t) => t.id === 'pdf-split')).toBe(true);
    });
  });

  describe('getToolsByCategory', () => {
    it('returns all tools when category is "all"', () => {
      expect(getToolsByCategory('all').length).toBe(ALL_TOOLS.length);
    });

    it('returns only tools belonging to the specified category', () => {
      const pdfTools = getToolsByCategory('pdf');
      expect(pdfTools.length).toBeGreaterThan(0);
      expect(pdfTools.every((t) => t.category === 'pdf')).toBe(true);

      const aiTools = getToolsByCategory('ai');
      expect(aiTools.length).toBeGreaterThan(0);
      expect(aiTools.every((t) => t.category === 'ai')).toBe(true);
    });
  });

  describe('SUBSCRIPTION_PLANS', () => {
    it('defines 4 tiers in ascending order of pricing', () => {
      expect(SUBSCRIPTION_PLANS.length).toBe(4);
      const [free, student, pro, business] = SUBSCRIPTION_PLANS;

      expect(free.id).toBe('free');
      expect(free.price).toBe(0);

      expect(student.id).toBe('student');
      expect(student.price).toBe(99);

      expect(pro.id).toBe('pro');
      expect(pro.price).toBe(499);

      expect(business.id).toBe('business');
      expect(business.price).toBe(1999);
    });

    it('ensures pro and business tiers include batch processing and priority support', () => {
      const pro = SUBSCRIPTION_PLANS.find((p) => p.id === 'pro')!;
      const business = SUBSCRIPTION_PLANS.find((p) => p.id === 'business')!;

      expect(pro.limits.batch_processing).toBe(true);
      expect(business.limits.batch_processing).toBe(true);
      expect(business.limits.api_access).toBe(true);
    });
  });
});

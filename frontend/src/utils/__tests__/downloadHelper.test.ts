import { describe, it, expect } from 'vitest';
import { sanitizeDownloadFilename, getDownloadUrlWithToken } from '../downloadHelper';

describe('downloadHelper utility', () => {
  it('sanitizes filenames correctly', () => {
    expect(sanitizeDownloadFilename('my-report.pdf')).toBe('my-report.pdf');
    expect(sanitizeDownloadFilename('   document.docx   ')).toBe('document.docx');
    expect(sanitizeDownloadFilename('../../../secret.pdf')).toBe('secret.pdf');
    expect(sanitizeDownloadFilename('..\\..\\windows\\cmd.exe')).toBe('cmd.exe');
  });

  it('applies fallback extension when missing', () => {
    expect(sanitizeDownloadFilename('report', 'pdf')).toBe('report.pdf');
    expect(sanitizeDownloadFilename('image', '.png')).toBe('image.png');
    expect(sanitizeDownloadFilename('', 'pdf')).toBe('docuflow_download.pdf');
  });

  it('generates download URL with safe filename and token query parameter', () => {
    const url = '/api/files/download/12345678901234567890123456789012';
    const result = getDownloadUrlWithToken(url, 'my report.pdf');
    expect(result).toContain('/api/files/download/12345678901234567890123456789012/my%20report.pdf');
  });
});

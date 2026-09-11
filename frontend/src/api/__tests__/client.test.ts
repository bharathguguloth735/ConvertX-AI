import { describe, it, expect } from 'vitest';
import { getUserFriendlyErrorMessage } from '../client';

describe('getUserFriendlyErrorMessage API error utility', () => {
  it('returns connection error when response is missing', () => {
    const networkErr = new Error('Network Error');
    const msg = getUserFriendlyErrorMessage(networkErr);
    expect(msg).toBe('Unable to connect to the server. Please check your connection.');
  });

  it('translates common backend error strings to friendly text', () => {
    expect(
      getUserFriendlyErrorMessage({ response: { data: { detail: 'File not found in storage' } } })
    ).toBe('Requested file could not be found.');

    expect(
      getUserFriendlyErrorMessage({ response: { data: { detail: 'Empty file uploaded' } } })
    ).toBe('Please select a valid, non-empty file.');

    expect(
      getUserFriendlyErrorMessage({ response: { data: { detail: 'File size exceeded limit' } } })
    ).toBe('This file exceeds the maximum size limit.');

    expect(
      getUserFriendlyErrorMessage({ response: { data: { detail: 'Unsupported file format .xyz' } } })
    ).toBe('This file type is not supported.');
  });

  it('handles FastAPI validation error lists (422 Unprocessable Entity)', () => {
    const pydanticErr = {
      response: {
        status: 422,
        data: {
          detail: [{ loc: ['body', 'email'], msg: 'value is not a valid email address' }],
        },
      },
    };
    expect(getUserFriendlyErrorMessage(pydanticErr)).toBe('value is not a valid email address');
  });

  it('handles HTTP 413 Payload Too Large and 500 Server Error status codes', () => {
    expect(
      getUserFriendlyErrorMessage({ response: { status: 413, data: {} } })
    ).toBe('The file size is too large. Please upload a smaller file.');

    expect(
      getUserFriendlyErrorMessage({ response: { status: 500, data: {} } })
    ).toBe('Something went wrong while processing your file. Please try again.');

    expect(
      getUserFriendlyErrorMessage({ response: { status: 502, data: {} } })
    ).toBe('Something went wrong while processing your file. Please try again.');
  });

  it('falls back to generic message for unknown errors', () => {
    expect(
      getUserFriendlyErrorMessage({ response: { status: 400, data: {} } })
    ).toBe('Processing failed. Please check your file and try again.');
  });
});

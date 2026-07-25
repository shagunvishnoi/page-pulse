const axios = require('axios');
const { auditUrl, AuditError } = require('../app/auditor');

jest.mock('axios');

describe('Page Pulse Auditor Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('1. Happy path: parses HTML correctly with title, meta description, h1 count, missing alt count, and word count', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page Title</title>
          <meta name="description" content="This is a test meta description for Page Pulse.">
          <style>body { color: red; }</style>
          <script>console.log("script block");</script>
        </head>
        <body>
          <h1>Main Page Heading</h1>
          <img src="logo.png" alt="Company Logo" />
          <img src="banner.png" alt="" />
          <p>Hello world from Page Pulse auditor test.</p>
        </body>
      </html>
    `;

    axios.get.mockResolvedValueOnce({
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8'
      },
      data: mockHtml
    });

    const result = await auditUrl('example.com');

    expect(axios.get).toHaveBeenCalledWith('https://example.com', expect.any(Object));
    expect(result).toMatchObject({
      url: 'https://example.com',
      http_status: 200,
      title: 'Test Page Title',
      meta_description: 'This is a test meta description for Page Pulse.',
      h1_count: 1,
      images_total: 2,
      missing_alt_count: 1,
      word_count: 10
    });
    expect(result.response_time_ms).toBeGreaterThanOrEqual(0);
  });

  test('2. Timeout failure: throws 504 AuditError when axios request times out', async () => {
    const timeoutError = new Error('timeout of 10000ms exceeded');
    timeoutError.code = 'ECONNABORTED';

    axios.get.mockRejectedValue(timeoutError);

    try {
      await auditUrl('https://slow-website.com');
      fail('Expected auditUrl to throw an error');
    } catch (err) {
      expect(err).toBeInstanceOf(AuditError);
      expect(err.statusCode).toBe(504);
      expect(err.message).toContain('timed out');
    }
  });

  test('3. Non-HTML response failure: throws 415 AuditError when response content-type is application/pdf', async () => {
    axios.get.mockResolvedValue({
      status: 200,
      headers: {
        'content-type': 'application/pdf'
      },
      data: '%PDF-1.4 ...'
    });

    try {
      await auditUrl('https://example.com/document.pdf');
      fail('Expected auditUrl to throw an error');
    } catch (err) {
      expect(err).toBeInstanceOf(AuditError);
      expect(err.statusCode).toBe(415);
      expect(err.message).toContain('non-HTML response');
    }
  });

  test('4. Empty URL input: throws 422 AuditError when URL is empty or invalid', async () => {
    try {
      await auditUrl('');
      fail('Expected auditUrl to throw an error');
    } catch (err) {
      expect(err).toBeInstanceOf(AuditError);
      expect(err.statusCode).toBe(422);
      expect(err.message).toBe('URL is required.');
    }
  });

  test('5. Target error page (404/500): returns 200 from auditor with target status code and empty content fields', async () => {
    axios.get.mockResolvedValueOnce({
      status: 404,
      headers: {
        'content-type': 'text/html'
      },
      data: '<h1>404 Not Found</h1>'
    });

    const result = await auditUrl('https://example.com/nonexistent');

    expect(result).toEqual({
      url: 'https://example.com/nonexistent',
      http_status: 404,
      response_time_ms: expect.any(Number),
      title: null,
      meta_description: null,
      h1_count: 0,
      images_total: 0,
      missing_alt_count: 0,
      word_count: 0
    });
  });
});

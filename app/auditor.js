const axios = require('axios');
const cheerio = require('cheerio');

class AuditError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AuditError';
    this.statusCode = statusCode;
  }
}

/**
 * Audits a given URL and returns metrics on status, performance, and HTML structure.
 * @param {string} inputUrl - The URL to audit.
 * @returns {Promise<Object>} Audit report.
 */
async function auditUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string' || inputUrl.trim() === '') {
    throw new AuditError('URL is required.', 422);
  }

  let targetUrl = inputUrl.trim();

  // Automatically prepend https:// if no protocol is provided
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  // Validate URL format and hostname domain check
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (err) {
    throw new AuditError('Invalid URL format. Please enter a valid web address.', 422);
  }

  const hostname = parsedUrl.hostname;
  if (!hostname || (!hostname.includes('.') && hostname !== 'localhost')) {
    throw new AuditError('Invalid URL domain. Domain must contain a valid TLD (e.g. example.com).', 422);
  }

  const startTime = Date.now();
  let response;

  try {
    response = await axios.get(targetUrl, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true, // Allow custom handling of 4xx/5xx target statuses
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PagePulseBot/1.0; +https://digitalheroesco.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      throw new AuditError('Request timed out after 10 seconds while fetching the target URL.', 504);
    }
    if (['ENOTFOUND', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'EAI_AGAIN'].includes(error.code)) {
      throw new AuditError('Could not resolve domain or establish connection to server.', 502);
    }
    throw new AuditError(`Failed to reach server: ${error.message}`, 502);
  }

  const responseTimeMs = Date.now() - startTime;
  const status = response.status;

  // Handle target page returning error status codes (e.g., 404 or 500)
  if (status < 200 || status >= 400) {
    return {
      url: targetUrl,
      http_status: status,
      response_time_ms: responseTimeMs,
      title: null,
      meta_description: null,
      h1_count: 0,
      images_total: 0,
      missing_alt_count: 0,
      word_count: 0
    };
  }

  // Check content-type header for non-HTML response
  const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
  if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    throw new AuditError(`Target URL returned a non-HTML response (Content-Type: ${contentType}).`, 415);
  }

  const html = typeof response.data === 'string' ? response.data : String(response.data || '');
  const $ = cheerio.load(html);

  // Title extraction
  const rawTitle = $('head title').text() || $('title').text() || '';
  const title = rawTitle.trim().length > 0 ? rawTitle.trim() : null;

  // Meta description extraction
  const metaDesc = $('meta[name="description" i]').attr('content') || 
                   $('meta[property="og:description" i]').attr('content') || '';
  const meta_description = metaDesc.trim().length > 0 ? metaDesc.trim() : null;

  // H1 count
  const h1_count = $('h1').length;

  // Image counts: total images and images missing alt text
  const images_total = $('img').length;
  let missing_alt_count = 0;
  $('img').each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt === undefined || alt.trim() === '') {
      missing_alt_count++;
    }
  });

  // Word count: strip <script>, <style>, <noscript>, and <svg> elements first
  const $clone = cheerio.load(html);
  $clone('script, style, noscript, svg').remove();
  const bodyText = $clone('body').text() || $clone.text() || '';
  const cleanedText = bodyText.replace(/\s+/g, ' ').trim();
  const word_count = cleanedText.length > 0 ? cleanedText.split(' ').filter(Boolean).length : 0;

  return {
    url: targetUrl,
    http_status: status,
    response_time_ms: responseTimeMs,
    title,
    meta_description,
    h1_count,
    images_total,
    missing_alt_count,
    word_count
  };
}

module.exports = {
  auditUrl,
  AuditError
};

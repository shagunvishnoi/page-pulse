# Page Pulse — Web Page Diagnostic & SEO Auditor

Page Pulse is a lightweight, robust web page audit tool built with Node.js, Express, Axios, and Cheerio. It allows users to input any website URL and instantly inspect key SEO metrics, page performance, and structural HTML health without crashing on bad inputs or external network failures.

**Live App:** https://page-pulse-zpps.onrender.com

**GitHub Repo:** https://github.com/shagunvishnoi/page-pulse

> Note: This is deployed on Render's free tier, which spins down after 15 minutes of inactivity. The first request after idle time may take 20–30 seconds to wake up.

## 🚀 Setup & Local Execution

### Prerequisites
- Node.js (v16+ recommended)
- npm (comes bundled with Node.js)

### 1. Installation

Clone the repository and install dependencies:

```
git clone https://github.com/shagunvishnoi/page-pulse.git
cd page-pulse
npm install
```

### 2. Running Locally

Start the Express web server locally:

```
npm start
```

The server will start on port 3000 (or `process.env.PORT` if set). Open your browser and navigate to:

```
http://localhost:3000
```

### 3. Running Unit Tests

Execute the Jest unit test suite (runs with mocked Axios network calls):

```
npm test
```

## 📡 API Contract

**Endpoint:** `POST /api/audit`

Audits the target URL provided in the request body and returns a JSON report.

### Request Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "url": "https://example.com"
}
```

Note: If protocol (`http://` or `https://`) is omitted by the user (e.g. `example.com`), Page Pulse automatically prepends `https://`.

### Successful Response (HTTP Status 200 OK)

Returned when the target website is successfully fetched or when the target website returns an HTTP error status (such as 404 or 500).

```json
{
  "url": "https://example.com",
  "http_status": 200,
  "response_time_ms": 142,
  "title": "Example Domain",
  "meta_description": null,
  "h1_count": 1,
  "images_total": 0,
  "missing_alt_count": 0,
  "word_count": 35
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `url` | `string` | The full normalized URL that was audited. |
| `http_status` | `number` | HTTP status code returned by the target URL (e.g. 200, 404, 500). |
| `response_time_ms` | `number` | Total network latency in milliseconds to fetch the page. |
| `title` | `string \| null` | Inner text of the `<title>` tag, or null if absent/empty. |
| `meta_description` | `string \| null` | Content of `<meta name="description">` (or `og:description`), or null if absent. |
| `h1_count` | `number` | Total number of `<h1>` heading elements found on the page. |
| `images_total` | `number` | Total number of `<img>` tags found on the page. |
| `missing_alt_count` | `number` | Total number of `<img>` tags missing an `alt` attribute or having empty `alt=""`. |
| `word_count` | `number` | Approximate word count of visible body text (excluding scripts, styles, etc.). |

### Error Responses (`{ "error": "..." }`)

If Page Pulse encounters an invalid request, timeout, DNS failure, or non-HTML content, it responds with a corresponding HTTP error status code:

**1. HTTP 422 — Unprocessable Entity (Invalid/Missing URL)**

Returned when the URL is empty, missing, or improperly formatted.

```json
{
  "error": "URL is required."
}
```

**2. HTTP 415 — Unsupported Media Type (Non-HTML Content)**

Returned when the target URL points to a non-HTML resource (e.g., PDF, PNG image, zip file).

```json
{
  "error": "Target URL returned a non-HTML response (Content-Type: application/pdf)."
}
```

**3. HTTP 502 — Bad Gateway (DNS / Network Connectivity Failure)**

Returned when the domain cannot be resolved or connection is refused.

```json
{
  "error": "Could not resolve domain or establish connection to server."
}
```

**4. HTTP 504 — Gateway Timeout (Fetch Timeout)**

Returned when the target website takes longer than 10 seconds to respond.

```json
{
  "error": "Request timed out after 10 seconds while fetching the target URL."
}
```

## 💡 Key Design Decisions & Rationale

### 1. Unified Single-Service Architecture (Monolithic Express & Static Serving)

**Decision:** The Express backend directly serves the static HTML/CSS/JS frontend from the `app/static` folder on the root `/` route.

**Reasoning:** Combining the frontend presentation layer and API endpoint into a single web application simplifies deployment (e.g., single-click deployment on Render, Railway, or Heroku free tier), eliminates Cross-Origin Resource Sharing (CORS) complexity, and avoids needing two separate hosting configurations.

### 2. Differentiating Tool Failures (HTTP 4xx/5xx) from Target Site Statuses (HTTP 200 with Target Status)

**Decision:** Failures in our tool (such as malformed URLs, request timeouts, network/DNS errors, or non-HTML documents) return appropriate HTTP error status codes (422, 415, 502, 504). Conversely, target websites returning `404 Not Found` or `500 Internal Server Error` return an API status `200 OK` containing `http_status: 404` with metrics reset to null/0.

**Reasoning:** A target site returning 404 or 500 is valid diagnostic output for an auditor tool — our tool successfully performed the check and audited the target's response status. Treating target 404s as an internal system crash or API error would obscure diagnostic metrics from the user.

### 3. DOM Cleaning Before Word Count Extraction

**Decision:** Before splitting and counting body text, Page Pulse clones the HTML DOM and explicitly removes `<script>`, `<style>`, `<noscript>`, and `<svg>` nodes.

**Reasoning:** In modern web pages, inline JavaScript and CSS styling blocks often contain hundreds or thousands of lines of code. Including code tokens in the word count calculation drastically inflates the metrics and distorts actual readable content statistics for SEO auditing.

## 🔒 Dependency Security

`npm audit` flags some issues, but all of them are in `jest` (a dev-only testing dependency, never shipped to production). Running `npm audit --production` confirms **zero vulnerabilities** in the actual runtime dependencies (`express`, `axios`, `cheerio`).

## 🤖 AI Usage

I used Claude and Antigravity a lot for this — Claude to figure out the plan and stack (we went with Node/Express instead of Python, decided to keep frontend and backend as one service to avoid CORS headaches, etc.), and Antigravity to generate the first version of the code from a detailed spec I gave it covering the API, error codes, and edge cases. After that I tested everything myself — ran the tests, checked it against real sites and broken URLs, and caught that the original version wasn't returning a total image count, which I got fixed. I understand how the code works and can explain the reasoning behind the main decisions.

## 📜 Footer Credit Requirement

Built for Digital Heroes Training Task • [digitalheroesco.com](https://digitalheroesco.com)
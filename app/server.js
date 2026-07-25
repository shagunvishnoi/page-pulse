const express = require('express');
const path = require('path');
const { auditUrl, AuditError } = require('./auditor');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing middleware
app.use(express.json());

// Serve static frontend files from app/static directory
app.use(express.static(path.join(__dirname, 'static')));

// Audit API Endpoint
app.post('/api/audit', async (req, res) => {
  try {
    const url = req.body ? req.body.url : undefined;
    const report = await auditUrl(url);
    return res.status(200).json(report);
  } catch (error) {
    if (error instanceof AuditError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    // Fallback error handler for any unexpected server exceptions
    console.error('Unhandled server error:', error);
    return res.status(500).json({ error: 'An unexpected internal error occurred.' });
  }
});

// Fallback route for unknown endpoints
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Start Express server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Page Pulse server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;

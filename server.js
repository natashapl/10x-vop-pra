const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const generateWord = require('./server/generate-word'); 
const RateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '_site'))); // Serve static files from the public folder

// Rate limiter middleware
const limiter = RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // max 100 requests per windowMs
});

// Routes
app.post('/generate-word', limiter, generateWord);

// Fallback route for undefined paths
app.use((req, res) => {
  res.status(404).send({ error: 'Route not found.' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

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
app.use(express.static(path.join(__dirname, '_site')));
app.use('/uploads', express.static(path.join(__dirname, '_site/uploads')));

// Rate limiter middleware
const limiter = RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Max 100 requests per windowMs
});

// Routes
app.post('/generate-word', limiter, (req, res, next) => {
    console.log('POST /generate-word received');
    console.log('Request body:', req.body);
  
    try {
        generateWord(req, res);
    } catch (error) {
        console.error('Error in /generate-word:', error);
        res.status(500).send({ error: 'Failed to generate the document.' });
    }
});

// Fallback route
app.use((req, res) => {
    res.status(404).send({ error: 'Route not found.' });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
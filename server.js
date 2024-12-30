const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const generateWord = require('./server/generate-word'); 
const RateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// Enable 'trust proxy' for proxies like Cloud.gov
app.set('trust proxy', 1);

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
app.post('/generate-word', limiter, async (req, res) => {
    console.log('POST /generate-word received');
    console.log('Request body:', req.body);
  
    try {
        await generateWord(req, res);
    } catch (error) {
        console.error('Error in /generate-word:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to generate the document.',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Add the S3 test endpoint here
app.get('/test-s3', async (req, res) => {
    try {
        const { client: s3Client, bucketName } = configureS3();
        
        const testFile = Buffer.from('Hello World');
        const testKey = `test-${Date.now()}.txt`;
        
        const uploadResult = await uploadToS3(bucketName, testKey, testFile);
        
        res.json({
            success: true,
            message: 'Test file uploaded successfully',
            fileUrl: uploadResult
        });
    } catch (error) {
        console.error('S3 test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
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
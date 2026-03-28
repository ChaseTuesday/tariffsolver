'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// Environment variables
const CLAUDE_API_URL = process.env.CLAUDE_API_URL;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// Rate limiting: Limit each IP to 5 requests per minute
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // limit each IP to 5 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/classify', limiter);

app.post('/classify', async (req, res) => {
    try {
        const inputData = req.body;

        // Check for required input data
        if (!inputData || !inputData.text) {
            return res.status(400).json({ error: 'Text is required.' });
        }

        const response = await axios.post(CLAUDE_API_URL, {
            headers: { Authorization: `Bearer ${CLAUDE_API_KEY}` },
            data: {
                text: inputData.text
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error calling Claude API:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = app;

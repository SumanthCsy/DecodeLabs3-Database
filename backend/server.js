// server.js
// Main entry point - starts Express server after database is ready

const express = require('express');
const cors = require('cors');
const { connectDatabase } = require('./config/database');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
const PORT = 3000;

// Allow requests from the frontend (any origin)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Handle malformed JSON bodies
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400) {
        return res.status(400).json({ success: false, message: 'Invalid JSON format' });
    }
    next(err);
});

// Student API routes
app.use('/students', studentRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Something went wrong' });
});

// Start database first, then the server
connectDatabase(() => {
    app.listen(PORT, () => {
        console.log(`Server Running On Port ${PORT}`);
    });
});

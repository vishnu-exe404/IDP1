const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// A simple backend API endpoint to fulfill the "backend code" requirement
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        message: 'MitraIDE — मित्र Backend is running normally. Face API models are served statically.'
    });
});

app.listen(PORT, () => {
    console.log(`================================`);
    console.log(`🌿 MitraIDE — मित्र Server is running`);
    console.log(`🚀 http://localhost:${PORT}`);
    console.log(`================================`);
});

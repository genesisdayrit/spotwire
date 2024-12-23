const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

const PORT = 3000; // Ensure this matches your redirect URI port in Spotify Developer settings

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve a simple success page for the redirect
app.get('/callback', (req, res) => {
    const hash = req.query.hash || '';
    const params = new URLSearchParams(hash.replace('#', ''));
    const token = params.get('access_token');

    if (token) {
        // Send a success message to the user
        res.sendFile(path.join(__dirname, 'success.html'));
        console.log('Access Token:', token);

        // You can store this token securely, e.g., in a database or local file
    } else {
        // Handle errors
        res.status(400).send('<h1>Error: Access token not found in the response.</h1>');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Spotify Auth Server running at http://localhost:${PORT}`);
});


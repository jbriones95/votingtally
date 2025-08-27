const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(express.json());
app.use(cors());

let ideas = [
    {
        text: "Safe bike routes to schools, groceries, and work; not just recreational greenways",
        agree: 91,
        disagree: 9,
        votes: {} // { ip: 'agree' or 'disagree' }
    },
    {
        text: "Littleton should not have any bike lanes unless they are warranted",
        agree: 12,
        disagree: 88,
        votes: {}
    }
];

// Get all ideas
app.get('/api/ideas', (req, res) => {
    // Don't send votes object to frontend
    res.json(ideas.map(({ text, agree, disagree }) => ({ text, agree, disagree })));
});

// Add a new idea
app.post('/api/ideas', (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') return res.status(400).send('Invalid idea');
    ideas.push({ text, agree: 0, disagree: 0, votes: {} });
    res.json({ success: true });
});

// Vote on an idea
app.post('/api/vote', (req, res) => {
    const { idx, type } = req.body;
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    if (typeof idx !== 'number' || !['agree', 'disagree'].includes(type)) {
        return res.status(400).send('Invalid vote');
    }
    if (!ideas[idx]) return res.status(404).send('Idea not found');
    if (ideas[idx].votes[ip]) return res.status(403).send('Already voted');
    ideas[idx].votes[ip] = type;
    // Tally vote
    let total = ideas[idx].agree + ideas[idx].disagree;
    if (type === 'agree') ideas[idx].agree += 1;
    else ideas[idx].disagree += 1;
    total += 1;
    // Normalize to percentage
    ideas[idx].agree = Math.round((ideas[idx].agree / total) * 100);
    ideas[idx].disagree = 100 - ideas[idx].agree;
    res.json({ agree: ideas[idx].agree, disagree: ideas[idx].disagree });
});

// Serve index.html at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
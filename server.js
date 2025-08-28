const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

let ideas = [
    {
        text: "Safe bike routes to schools, groceries, and work; not just recreational greenways",
        votes: {} // { ip: 'agree' or 'disagree' }
    },
    {
        text: "Littleton should not have any bike lanes unless they are warranted",
        votes: {}
    }
];

// Simple bad word filter list
const BAD_WORDS = ['fuck', 'badword2', 'damn', 'hell']; // Add more as needed

// Track banned IPs and their timeout
const bannedIPs = {};

function containsBadWord(text) {
    const lower = text.toLowerCase();
    return BAD_WORDS.some(word => lower.includes(word));
}

// Get all ideas
app.get('/api/ideas', (req, res) => {
    res.json(ideas.map(({ text, votes }) => {
        const agreeVotes = Object.values(votes).filter(v => v === 'agree').length;
        const disagreeVotes = Object.values(votes).filter(v => v === 'disagree').length;
        const total = agreeVotes + disagreeVotes;
        const agree = total ? Math.round((agreeVotes / total) * 100) : 0;
        const disagree = total ? 100 - agree : 0;
        return { text, agree, disagree };
    }));
});

// Add a new idea
app.post('/api/ideas', (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;

    // Check if IP is banned
    if (bannedIPs[ip] && Date.now() < bannedIPs[ip]) {
        return res.status(403).json({ error: 'You are temporarily banned for submitting inappropriate content.' });
    }

    const { text } = req.body;
    if (!text || typeof text !== 'string') return res.status(400).send('Invalid idea');

    if (containsBadWord(text)) {
        // Ban IP for 10 minutes
        bannedIPs[ip] = Date.now() + 10 * 60 * 1000;
        return res.status(403).json({ error: 'Inappropriate content detected. You are banned for 10 minutes.' });
    }

    ideas.push({ text, votes: {} });
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
    // Calculate percentages
    const agreeVotes = Object.values(ideas[idx].votes).filter(v => v === 'agree').length;
    const disagreeVotes = Object.values(ideas[idx].votes).filter(v => v === 'disagree').length;
    const total = agreeVotes + disagreeVotes;
    const agree = total ? Math.round((agreeVotes / total) * 100) : 0;
    const disagree = total ? 100 - agree : 0;
    res.json({ agree, disagree });
});

// Reset all votes and tallies
app.post('/api/reset', (req, res) => {
    ideas.forEach(idea => {
        idea.votes = {};
    });
    res.json({ success: true });
});

app.post('/api/resetPersonal', (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    ideas.forEach(idea => {
        if (idea.votes[ip]) {
            delete idea.votes[ip];
        }
    });
    res.json({ success: true });
});

// Serve index.html at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
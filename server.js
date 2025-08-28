const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// In-memory storage
let ideas = [
  { text: "Safe bike routes to schools, groceries, and work; not just recreational greenways", votes: {} },
  { text: "Littleton should not have any bike lanes unless they are warranted", votes: {} }
];

// Bad words and leet map
const BAD_WORDS = ['shit','damn','badword1','badword2']; // extend as needed
const LEET_MAP = {
  a: ['4','@','ä','á','à','â','ª'],
  b: ['8','ß','13'],
  c: ['(','{','[','<','¢'],
  e: ['3','€','£','ë','ê','è','é'],
  g: ['9','6'],
  h: ['#'],
  i: ['1','!','|','í','ì','ï','î'],
  l: ['1','|','£'],
  o: ['0','°','ø','ö','ó','ò','ô'],
  s: ['$', '5','§'],
  t: ['7','+'],
  u: ['ü','ú','ù','û','v'],
  z: ['2','ž']
};

// normalize leet by replacing known substitutions with base letters
function normalizeLeet(text) {
  let normalized = (text || '').toLowerCase();
  // do replacements from longest subs to shortest to avoid partial collisions
  const subs = [];
  for (const [base, arr] of Object.entries(LEET_MAP)) {
    arr.forEach(s => subs.push({ s, base }));
  }
  // sort by substitution length desc
  subs.sort((a,b) => b.s.length - a.s.length);
  for (const {s, base} of subs) {
    // global replace
    normalized = normalized.split(s).join(base);
  }
  // collapse non-alphanumeric to space for safer contains checks
  normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');
  return normalized;
}

function containsBadWord(text) {
  const norm = normalizeLeet(text);
  return BAD_WORDS.some(word => norm.includes(word));
}

// temporary ban map: ip -> expireTimestamp
const bannedIPs = {};

// helpers
function clientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}

function computeStats(votesObj) {
  const vals = Object.values(votesObj || {});
  const agreeCount = vals.filter(v => v === 'agree').length;
  const disagreeCount = vals.filter(v => v === 'disagree').length;
  const passCount = vals.filter(v => v === 'pass').length;
  const total = agreeCount + disagreeCount + passCount;
  const agreePct = total ? Math.round((agreeCount / total) * 100) : 0;
  const disagreePct = total ? Math.round((disagreeCount / total) * 100) : 0;
  return { agreeCount, disagreeCount, passCount, agreePct, disagreePct, total };
}

// Routes
app.get('/api/ideas', (req, res) => {
  // return text and computed stats (percentages + counts)
  const out = ideas.map(i => {
    const s = computeStats(i.votes);
    return {
      text: i.text,
      agree: s.agreePct,
      disagree: s.disagreePct,
      agreeCount: s.agreeCount,
      disagreeCount: s.disagreeCount,
      passCount: s.passCount
    };
  });
  res.json(out);
});

app.post('/api/ideas', (req, res) => {
  const ip = clientIp(req);
  // check ban
  if (bannedIPs[ip] && Date.now() < bannedIPs[ip]) {
    return res.status(403).json({ error: 'You are temporarily banned for submitting inappropriate content.' });
  }
  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'Invalid idea' });

  if (containsBadWord(text)) {
    // ban for 10 minutes
    bannedIPs[ip] = Date.now() + 10 * 60 * 1000;
    return res.status(403).json({ error: 'Inappropriate content detected. You are banned for 10 minutes.' });
  }

  ideas.push({ text: text.trim(), votes: {} });
  return res.json({ success: true });
});

app.post('/api/vote', (req, res) => {
  const ip = clientIp(req);
  const { idx, type } = req.body || {};
  if (!Number.isInteger(idx) || !['agree','disagree','pass'].includes(type)) {
    return res.status(400).json({ error: 'Invalid vote' });
  }
  if (!ideas[idx]) return res.status(404).json({ error: 'Idea not found' });

  // prevent multiple votes from same IP on same idea
  if (ideas[idx].votes[ip]) {
    return res.status(409).json({ error: 'Already voted' });
  }
  ideas[idx].votes[ip] = type;
  const s = computeStats(ideas[idx].votes);
  return res.json({ success: true, agree: s.agreePct, disagree: s.disagreePct });
});

app.post('/api/resetPersonal', (req, res) => {
  const ip = clientIp(req);
  ideas.forEach(idea => {
    if (idea.votes[ip]) delete idea.votes[ip];
  });
  return res.json({ success: true });
});

// Optional reset all (admin) - comment out if you don't want an endpoint
app.post('/api/reset', (req, res) => {
  ideas.forEach(i => i.votes = {});
  return res.json({ success: true });
});

// serve index on root (static files are served from __dirname)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
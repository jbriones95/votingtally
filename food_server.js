const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// In-memory storage for food suggestions (replace ideas with restaurants)
const littletonRestaurants = [
  "Angelo's Taverna - Littleton",
  "ViewHouse",
  "Smokin Fins - Littleton",
  "Manning's Steaks & Spirits",
  "Farm House Restaurant at Breckenridge Brewery",
  "Grande Station",
  "Cafe Terracotta",
  "Ninja Sushi"
];

let foods = littletonRestaurants.map(name => ({ text: name, votes: {} }));

// Bad words and leet map (same approach as main server)
const BAD_WORDS = ['shit','damn','badword1','badword2'];
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

function normalizeLeet(text) {
  let normalized = (text || '').toLowerCase();
  const subs = [];
  for (const [base, arr] of Object.entries(LEET_MAP)) {
    arr.forEach(s => subs.push({ s, base }));
  }
  subs.sort((a,b) => b.s.length - a.s.length);
  for (const {s, base} of subs) {
    normalized = normalized.split(s).join(base);
  }
  normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');
  return normalized;
}

function containsBadWord(text) {
  const norm = normalizeLeet(text);
  return BAD_WORDS.some(word => norm.includes(word));
}

const bannedIPs = {};

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

// Routes for food suggestions
app.get('/api/food', (req, res) => {
  const out = foods.map(i => {
    const s = computeStats(i.votes);
    return {
      text: i.text,
      agree: s.agreePct,
      disagree: s.disagreePct,
      agreeCount: s.agreeCount,
      disagreeCount: s.disagreeCount,
      passCount: s.passCount,
      total: s.total
    };
  });
  // sort by total votes (descending) so items with more activity appear first
  out.sort((a, b) => (b.total || 0) - (a.total || 0));
  res.json(out);
});

app.post('/api/food', (req, res) => {
  const ip = clientIp(req);
  if (bannedIPs[ip] && Date.now() < bannedIPs[ip]) {
    return res.status(403).json({ error: 'You are temporarily banned for submitting inappropriate content.' });
  }
  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'Invalid suggestion' });

  if (containsBadWord(text)) {
    bannedIPs[ip] = Date.now() + 10 * 60 * 1000; // 10 minutes
    return res.status(403).json({ error: 'Inappropriate content detected. You are banned for 10 minutes.' });
  }

  foods.push({ text: text.trim(), votes: {} });
  return res.json({ success: true });
});

app.post('/api/food/vote', (req, res) => {
  const ip = clientIp(req);
  const { idx, type } = req.body || {};
  if (!Number.isInteger(idx) || !['agree','disagree','pass'].includes(type)) {
    return res.status(400).json({ error: 'Invalid vote' });
  }
  if (!foods[idx]) return res.status(404).json({ error: 'Suggestion not found' });

  if (foods[idx].votes[ip]) return res.status(409).json({ error: 'Already voted' });

  foods[idx].votes[ip] = type;
  const s = computeStats(foods[idx].votes);
  return res.json({ success: true, agree: s.agreePct, disagree: s.disagreePct });
});

app.post('/api/food/resetPersonal', (req, res) => {
  const ip = clientIp(req);
  foods.forEach(item => {
    if (item.votes[ip]) delete item.votes[ip];
  });
  return res.json({ success: true });
});

// Serve food page at /food and /food.html so embeds can use either path
app.get(['/food', '/food.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'food.html'));
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Food server listening on port ${port}`);
});
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// In-memory storage for food suggestions (replace ideas with restaurants)
const restaurantsByCuisine = {
  "American": [
    { name: "Manning's Steaks & Spirits", address: "111 S. Broadway" },
    { name: "Farm House Restaurant at Breckenridge Brewery", address: "2990 Brewery Ln" },
    { name: "Grande Station", address: "2299 W Main St" }
  ],
  "Italian": [
    { name: "Angelo's Taverna - Littleton", address: "6885 S Santa Fe Dr" },
    { name: "Cafe Terracotta", address: "5649 S Curtice St" }
  ],
  "Seafood": [
    { name: "Smokin Fins - Littleton", address: "2575 W Main St" }
  ],
  "Asian": [
    { name: "Ninja Sushi", address: "7301 S Santa Fe Dr" }
  ],
  "Bar & Grill": [
    { name: "ViewHouse", address: "2680 W Main St" }
  ]
};

// Flatten restaurants for voting by index
const flatRestaurants = [];
Object.entries(restaurantsByCuisine).forEach(([cuisine, list]) => {
  list.forEach((r, idx) => {
    flatRestaurants.push({
      cuisine,
      name: r.name,
      address: r.address,
      votes: {}
    });
  });
});

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

// --- API routes ---
app.get('/api/food', (req, res) => {
  const ip = clientIp(req);
  // Compute stats for each restaurant
  const statsList = flatRestaurants.map((r, idx) => {
    const s = computeStats(r.votes);
    return {
      idx,
      cuisine: r.cuisine,
      name: r.name,
      address: r.address,
      agreeCount: s.agreeCount,
      disagreeCount: s.disagreeCount,
      passCount: s.passCount,
      voted: !!r.votes[ip]
    };
  });

  // Sort by thumbs up (agreeCount) descending, then thumbs down, then name
  statsList.sort((a, b) => {
    if (b.agreeCount !== a.agreeCount) return b.agreeCount - a.agreeCount;
    if (a.disagreeCount !== b.disagreeCount) return a.disagreeCount - b.disagreeCount;
    return a.name.localeCompare(b.name);
  });

  res.json(statsList);
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

  // --- Update foods to support cuisine and address ---
  const newRestaurant = {
    cuisine: "Unknown",
    name: text.trim(),
    address: "",
    votes: {}
  };
  flatRestaurants.push(newRestaurant);
  return res.json({ success: true });
});

app.post('/api/food/vote', (req, res) => {
  const ip = clientIp(req);
  const { idx, type } = req.body || {};
  if (!Number.isInteger(idx) || !['agree','disagree','pass'].includes(type)) {
    return res.status(400).json({ error: 'Invalid vote' });
  }
  if (!flatRestaurants[idx]) return res.status(404).json({ error: 'Restaurant not found' });

  if (flatRestaurants[idx].votes[ip]) return res.status(409).json({ error: 'Already voted' });

  flatRestaurants[idx].votes[ip] = type;
  const s = computeStats(flatRestaurants[idx].votes);
  return res.json({
    success: true,
    agreeCount: s.agreeCount,
    disagreeCount: s.disagreeCount,
    passCount: s.passCount
  });
});

app.post('/api/food/resetPersonal', (req, res) => {
  const ip = clientIp(req);
  flatRestaurants.forEach(r => {
    if (r.votes[ip]) delete r.votes[ip];
  });
  return res.json({ success: true });
});

app.post('/api/food/vote/reset', (req, res) => {
  const ip = clientIp(req);
  const { idx } = req.body || {};
  if (!Number.isInteger(idx) || !flatRestaurants[idx]) {
    return res.status(400).json({ error: 'Invalid restaurant' });
  }
  if (flatRestaurants[idx].votes[ip]) {
    delete flatRestaurants[idx].votes[ip];
    return res.json({ success: true });
  }
  return res.status(409).json({ error: 'No vote to reset' });
});

// Serve /food and /food.html so embeds can use either path
app.get(['/food', '/food.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'food.html'));
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Food server listening on port ${port}`);
});
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
const BAD_WORDS = [
  'fuck', 'shit', 'bitch', 'bastard', 'asshole', 'damn', 'crap', 'dick', 'piss', 'slut',
  'whore', 'hell', 'cunt', 'motherfucker', 'prick', 'twat', 'cock', 'bollocks', 'bugger',
  'arse', 'wanker', 'tosser', 'git', 'moron', 'idiot', 'imbecile', 'jackass', 'numbnuts',
  'dipshit', 'dumbass', 'butthead', 'scumbag', 'jerk', 'loser', 'fool', 'tool', 'douche',
  'douchebag', 'dork', 'twit', 'nitwit', 'halfwit', 'blockhead', 'bonehead', 'simpleton',
  'cretin', 'maggot', 'ratbag', 'fuckwit', 'pillock', 'knob', 'knobhead', 'bellend',
  'shithead', 'shitface', 'shitbag', 'shitbrain', 'shite', 'bint', 'skank', 'harlot',
  'tramp', 'guttertrash', 'hag', 'fart', 'gasbag', 'windbag', 'turd', 'numpty', 'drongo',
  'yob', 'slag', 'tart', 'muppet', 'gitface', 'prat', 'jerkwad', 'peabrain', 'lunkhead',
  'meathead', 'chump', 'punk', 'punkass', 'screwup', 'weirdo', 'freak', 'geek', 'nerd',
  'geez', 'frigger', 'crud', 'bozo', 'goof', 'goofball', 'clown', 'clownshoe', 'klutz',
  'schmuck', 'putz',   'jerkoff', 'arsehole', 'dipwad', 'dipstick', 'blowhard', 'blowhole', 'buttmunch', 'buttface', 'dirtbag',
  'scrote', 'scumbucket', 'knucklehead', 'meatball', 'snot', 'snotface', 'snotball', 'gasbagger', 'crudface',
  'crudmuffin', 'slimeball', 'slimebucket', 'trashbag', 'trashface', 'smut', 'smutface', 'dillweed',
  'dingus', 'dingbat', 'wuss', 'wussbag', 'wussface', 'fugly', 'nutter', 'nutjob', 'nutcase', 'nutbrain',
  'wacko', 'wackjob', 'lowlife', 'lowbrain', 'lowbrow', 'halfbrain', 'halfhead', 'hacksaw', 'hackjob',
  'deadbeat', 'dropkick', 'airhead', 'flathead', 'squarehead', 'pottymouth', 'mouthbreather', 'buttkicker',
  'bootlicker', 'bootlick', 'backstabber', 'twoface', 'cheater', 'cheapskate', 'chisel', 'fibber', 'fibhead',
  'fibbag', 'goober', 'goon', 'gomer', 'grinch', 'grifter', 'grouch', 'harpy', 'hoebag', 'hogwash', 'lamebrain',
  'lamer', 'layabout', 'lazybones', 'lech', 'louse', 'meanie', 'menace', 'minger', 'miscreant', 'mouthpiece',
  'nincompoop', 'nincanpoop', 'ninny', 'noob', 'oaf', 'ogre', 'peon', 'perv', 'pervert', 'pesky', 'phoney',
  'phony', 'poser', 'puke', 'punkface', 'reject', 'rubbish', 'sap', 'scam', 'scammer', 'scrub', 'sham', 'shambles'
];


// Mapping common substitutions for letters/numbers/symbols
const LEET_MAP = {
  a: ['4', '@', 'ä', 'á', 'à', 'â', 'ª'],
  b: ['8', 'ß', '13'],
  c: ['(', '{', '[', '<', '¢'],
  e: ['3', '€', '£', 'ë', 'ê', 'è', 'é'],
  g: ['9', '6'],
  h: ['#'],
  i: ['1', '!', '|', 'í', 'ì', 'ï', 'î'],
  l: ['1', '|', '£'],
  o: ['0', '°', 'ø', 'ö', 'ó', 'ò', 'ô'],
  s: ['$', '5', '§'],
  t: ['7', '+'],
  u: ['ü', 'ú', 'ù', 'û', 'v'],
  z: ['2', 'ž']
};

// Function to expand a bad word with leet variations
function generateLeetVariants(word) {
  const chars = word.split('');
  const variants = [''];

  chars.forEach(char => {
    const lowerChar = char.toLowerCase();
    const subs = LEET_MAP[lowerChar] || [];
    const newVariants = [];

    variants.forEach(v => {
      newVariants.push(v + char); // normal
      subs.forEach(sub => newVariants.push(v + sub)); // leet/symbols
    });

    variants.splice(0, variants.length, ...newVariants);
  });

  return variants;
}

// Example: build extended bad word list
let EXTENDED_BAD_WORDS = [];
BAD_WORDS.forEach(word => {
  EXTENDED_BAD_WORDS.push(word);
  EXTENDED_BAD_WORDS.push(...generateLeetVariants(word));
});

console.log(EXTENDED_BAD_WORDS);

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
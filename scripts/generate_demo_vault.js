#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { faker } from '@faker-js/faker';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function writeFrontMatter(obj) {
  const lines = ['---'];
  Object.keys(obj).forEach(k => {
    const v = obj[k];
    if (Array.isArray(v)) {
      lines.push(`${k}:`);
      v.forEach(item => lines.push(`  - ${item}`));
    } else if (typeof v === 'string') {
      lines.push(`${k}: "${v}"`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  });
  lines.push('---\n');
  return lines.join('\n');
}

// Create sample entity files with realistic descriptions
function createItemFiles(baseFolder, type, items, descriptions) {
  items.forEach((item, idx) => {
    ensureDir(baseFolder);
    const filePath = path.join(baseFolder, `${item}.md`);
    const desc = descriptions && descriptions[idx] ? descriptions[idx] : faker.lorem.paragraphs(1);
    const fm = writeFrontMatter({ 
      title: item, 
      type, 
      tags: [type, 'demo'],
      created: faker.date.past({ years: 2 }).toISOString().split('T')[0]
    });
    const content = `${fm}${desc}\n`;
    writeFile(filePath, content);
  });
}

// Generate realistic interstitial journal entries with rich variation
function generateInterstitialEntry(date, state) {
  const [y, m, d] = date.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const month = dateObj.getMonth();
  const isSummer = month >= 5 && month <= 8;
  const isWinter = month === 11 || month <= 1;
  const isSpring = month >= 2 && month <= 4;
  const isAutumn = month >= 8 && month <= 10;
  
  // Create a deterministic "seed" for this date to generate consistent trends
  const dateNum = parseInt(date.replace(/-/g, ''));
  const weeksSinceStart = Math.floor((dateObj - new Date(y - 2, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  
  // Define trends that evolve over time
  const trends = getTrends(weeksSinceStart);

  // Vary entry structure and content
  const entryVariations = [
    () => generateRichVariedEntry(date, state, { isWeekend, isSummer, isWinter, isSpring, isAutumn, dateNum, trends }),
    () => generateTimeBlockEntry(date, state, { isWeekend, isSummer, isWinter, isSpring, isAutumn, dateNum, trends }),
    () => generateNarrativeEntry(date, state, { isWeekend, isSummer, isWinter, isSpring, isAutumn, dateNum, trends }),
    () => generateStructuredDayEntry(date, state, { isWeekend, isSummer, isWinter, isSpring, isAutumn, dateNum, trends }),
    () => generateReflectiveDeepEntry(date, state, { isWeekend, isSummer, isWinter, isSpring, isAutumn, dateNum, trends }),
    () => generateBulletedEntry(date, state, { isWeekend, isSummer, isWinter, isSpring, isAutumn, dateNum, trends }),
    () => generateProjectFocusedEntry(date, state, { isWeekend, isSummer, isWinter, isSpring, isAutumn, dateNum, trends }),
  ];

  const idx = dateNum % entryVariations.length;
  return entryVariations[idx]();
}

// Define trends that evolve throughout the 2 years
function getTrends(weeksSinceStart) {
  const trends = {};
  
  // Cycling: picked up around week 20, very active, then dropped around week 80
  trends.cycling = Math.min(Math.max(0, (weeksSinceStart - 20) / 20), 1) * Math.max(0, 1 - Math.max(0, weeksSinceStart - 80) / 15);
  
  // Rock Climbing: starts week 10, builds steadily
  trends.rockClimbing = Math.max(0, (weeksSinceStart - 10) / 30);
  
  // Morning Run: consistent but drops in summer, peaks in spring/autumn
  trends.morningRun = 0.6 + (Math.sin(weeksSinceStart * 0.1) * 0.3);
  
  // Photography: seasonal spike in autumn
  trends.photography = 0.3 + (Math.abs(Math.sin(weeksSinceStart * 0.05)) * 0.4);
  
  // Swimming: summer peak
  trends.swimming = Math.max(0, Math.sin((weeksSinceStart - 20) * 0.05)) * 0.8;
  
  // Gardening: spring/summer
  trends.gardening = Math.max(0, Math.sin((weeksSinceStart - 15) * 0.08)) * 0.7;
  
  // Work project: picked up week 5, intense mid-project (week 40-60), winding down
  trends.projectRoadmap = 0.8 + (Math.sin(weeksSinceStart * 0.08) * 0.3);
  
  // New hobby: picked up week 50 (gaming more)
  trends.gaming = Math.max(0, (weeksSinceStart - 50) / 20);
  
  // Anime binges: episodic interest
  trends.animeWatching = 0.5 + (Math.sin(weeksSinceStart * 0.15) * 0.4);
  
  return trends;
}

function generateRichVariedEntry(date, state, context) {
  const { isWeekend, dateNum, trends } = context;
  const links = [];
  
  // Morning section - 3-5 links
  if (trends.morningRun > 0.3) links.push(`[[${state.morningActivities[0]}]]`);
  if (trends.rockClimbing > 0.2 && isWeekend) links.push(`[[Rock Climbing]]`);
  if (Math.random() > 0.6) links.push(`[[${pickRandom(state.restaurants)}]]`);
  if (trends.cycling > 0.3) links.push(`[[Cycling]]`);
  
  // Work section - 2-4 links
  if (trends.projectRoadmap > 0.5) links.push(`[[Project Roadmap]]`);
  links.push(`[[${pickRandom(state.notes)}]]`);
  if (Math.random() > 0.5) links.push(`[[${pickRandom(state.persons)}]]`);
  if (Math.random() > 0.7) links.push(`[[${pickRandom(state.tasks)}]]`);
  
  // Media section - 2-4 links
  if (trends.animeWatching > 0.3) links.push(`[[${pickRandom(state.anime)}]]`);
  if (trends.gaming > 0.2) links.push(`[[${pickRandom(state.games)}]]`);
  if (Math.random() > 0.6) links.push(`[[${pickRandom(state.movies)}]]`);
  
  // Social - 1-2 links
  if (Math.random() > 0.5) {
    links.push(`[[${pickRandom(state.persons)}]]`);
    links.push(`[[${pickRandom(state.restaurants)}]]`);
  }
  
  // Health - 0-2 links
  if (Math.random() > 0.7) links.push(`[[${pickRandom(state.symptoms)}]]`);
  
  // Activities - 2-4 links
  if (trends.swimming > 0.2) links.push(`[[Swimming]]`);
  if (trends.gardening > 0.3) links.push(`[[Gardening]]`);
  if (trends.photography > 0.4) links.push(`[[Photography]]`);
  if (Math.random() > 0.6) links.push(`[[${pickRandom(state.outings)}]]`);
  
  const shuffledLinks = links.sort(() => Math.random() - 0.5);
  const entrySummary = shuffledLinks.slice(0, 5).join(', ');

  return `# ${date}

Started the day thinking about ${shuffledLinks[0]}.

Morning was productive. Got through several things: ${shuffledLinks.slice(1, 4).join(', ')}. Feeling good about the momentum.

Afternoon shifted gears. Spent time on ${shuffledLinks[4] || shuffledLinks[0]} and realized I haven't been doing ${shuffledLinks[Math.floor(Math.random() * shuffledLinks.length)]} as much as I'd like.

Evening was wind-down. Caught up with ${pickRandom(state.persons)}, then spent some time on ${shuffledLinks[Math.floor(Math.random() * shuffledLinks.length)]}.

Today reminded me of why I started ${shuffledLinks[Math.floor(Math.random() * shuffledLinks.length)]} in the first place.

---
*Active: ${shuffledLinks.slice(0, 3).join(', ')}*
`;
}

function generateTimeBlockEntry(date, state, context) {
  const { dateNum, trends } = context;
  const timeBlocks = [];
  
  // Variable wake times and sleep times
  const wakeTime = 6 + Math.floor(Math.random() * 3); // 6-8am
  const wakeMin = Math.floor(Math.random() * 60);
  
  // Morning block
  timeBlocks.push({
    time: `${String(wakeTime).padStart(2, '0')}:${String(wakeMin).padStart(2, '0')} - ${String(wakeTime + 2).padStart(2, '0')}:00`,
    activities: [],
    links: []
  });
  
  if (trends.morningRun > 0.4) {
    timeBlocks[0].activities.push('Morning Run');
    timeBlocks[0].links.push(`[[Morning Run]]`);
  }
  if (Math.random() > 0.5) {
    timeBlocks[0].activities.push('Coffee');
    timeBlocks[0].links.push(`[[${pickRandom(state.restaurants)}]]`);
  }
  if (Math.random() > 0.6) {
    timeBlocks[0].links.push(`[[${pickRandom(state.symptoms)}]]`);
  }
  
  // Midday work block (variable length)
  const workStart = wakeTime + 2.5;
  const workDuration = 4 + Math.random() * 3;
  timeBlocks.push({
    time: `${String(Math.floor(workStart)).padStart(2, '0')}:00 - ${String(Math.floor(workStart + workDuration)).padStart(2, '0')}:00`,
    activities: [],
    links: []
  });
  
  timeBlocks[1].links.push(`[[Project Roadmap]]`);
  if (Math.random() > 0.5) timeBlocks[1].links.push(`[[${pickRandom(state.persons)}]]`);
  if (Math.random() > 0.6) timeBlocks[1].links.push(`[[${pickRandom(state.notes)}]]`);
  timeBlocks[1].activities.push('Work focus');
  
  // Lunch - variable time
  const lunchTime = Math.floor(workStart + workDuration * 0.5);
  timeBlocks.push({
    time: `${String(lunchTime).padStart(2, '0')}:00 - ${String(lunchTime + 1).padStart(2, '0')}:00`,
    activities: ['Lunch'],
    links: [`[[${pickRandom(state.restaurants)}]]`, `[[${pickRandom(state.persons)}]]`]
  });
  
  // Afternoon - varies
  timeBlocks.push({
    time: `${String(Math.floor(workStart + workDuration + 1)).padStart(2, '0')}:00 - ${String(Math.floor(workStart + workDuration + 3)).padStart(2, '0')}:00`,
    activities: [],
    links: []
  });
  
  if (Math.random() > 0.5 && trends.cycling > 0.3) {
    timeBlocks[3].activities.push('Cycling');
    timeBlocks[3].links.push(`[[Cycling]]`);
  } else if (Math.random() > 0.5 && trends.swimming > 0.2) {
    timeBlocks[3].activities.push('Swimming');
    timeBlocks[3].links.push(`[[Swimming]]`);
  } else {
    timeBlocks[3].activities.push('Secondary work');
    timeBlocks[3].links.push(`[[${pickRandom(state.tasks)}]]`);
  }
  if (Math.random() > 0.6) timeBlocks[3].links.push(`[[${pickRandom(state.outings)}]]`);
  
  // Evening block
  timeBlocks.push({
    time: `${String(18 + Math.floor(Math.random() * 2)).padStart(2, '0')}:00 - 21:00`,
    activities: [],
    links: []
  });
  
  if (trends.animeWatching > 0.4) {
    timeBlocks[4].activities.push('Anime');
    timeBlocks[4].links.push(`[[${pickRandom(state.anime)}]]`);
  }
  if (trends.gaming > 0.3) {
    timeBlocks[4].activities.push('Gaming');
    timeBlocks[4].links.push(`[[${pickRandom(state.games)}]]`);
  }
  timeBlocks[4].links.push(`[[${pickRandom(state.eveningActivities)}]]`);
  
  let content = `# ${date}\n\n`;
  timeBlocks.forEach(block => {
    content += `**${block.time}**\n`;
    if (block.activities.length) content += `- ${block.activities.join(', ')}\n`;
    content += `- ${block.links.join(', ')}\n\n`;
  });
  
  content += `\n---\n*Feeling: ${Math.random() > 0.5 ? 'energized' : 'steady'}*`;
  return content;
}

function generateNarrativeEntry(date, state, context) {
  const { isWeekend, isSummer, isWinter, isSpring, isAutumn, trends } = context;
  
  let seasonal = "";
  if (isSummer) seasonal = "Summer energy was palpable today.";
  else if (isWinter) seasonal = "Winter has a way of making you introspective.";
  else if (isSpring) seasonal = "Spring is bringing new beginnings.";
  else if (isAutumn) seasonal = "Autumn's changing leaves mirrored my own shifts.";
  
  const entries = [];
  
  entries.push(`# ${date}\n\n${seasonal}\n`);
  
  if (trends.projectRoadmap > 0.6) {
    entries.push(`Been deep in [[Project Roadmap]]. Hit a breakthrough today with [[${pickRandom(state.persons)}]]. The approach we discussed finally clicked—going to run with [[${pickRandom(state.tasks)}]] next.\n`);
  }
  
  if (trends.rockClimbing > 0.5 && isWeekend) {
    entries.push(`Headed to the climbing wall with [[${pickRandom(state.persons)}]]. Managed to get past that crux I've been stuck on. Feels good.\n`);
  }
  
  if (trends.animeWatching > 0.5) {
    const anime = pickRandom(state.anime);
    entries.push(`Watched more of [[${anime}]]. The character development is really something. Can't wait to see where this goes.\n`);
  }
  
  if (Math.random() > 0.5) {
    entries.push(`Grabbed lunch at [[${pickRandom(state.restaurants)}]]. Quiet spot to think. Sometimes the best ideas come when you're not forcing them.\n`);
  }
  
  if (trends.cycling > 0.4) {
    entries.push(`[[Cycling]] through the park. The route is getting easier each time. Maybe I'm ready to push harder.\n`);
  }
  
  if (trends.gardening > 0.5 && isSpring) {
    entries.push(`[[Gardening]] season is fully upon us. The seeds I planted a month ago are sprouting. Seeing real growth is encouraging.\n`);
  }
  
  if (Math.random() > 0.6) {
    entries.push(`[[${pickRandom(state.notes)}]] keeps nagging at me. Need to dedicate focused time soon.\n`);
  }
  
  if (Math.random() > 0.7) {
    const symptom = pickRandom(state.symptoms);
    entries.push(`Been dealing with some [[${symptom}]], but pushing through.\n`);
  }
  
  if (trends.gaming > 0.4) {
    entries.push(`Started playing [[${pickRandom(state.games)}]] recently. Forgot how much I enjoy this genre.\n`);
  }
  
  entries.push(`\nThinking about [[${pickRandom(state.notes)}]] as I wind down. Tomorrow's another day.\n`);
  
  return entries.join('\n');
}

function generateStructuredDayEntry(date, state, context) {
  const { dateNum, trends } = context;
  const rows = [];
  
  rows.push(`# ${date}\n`);
  rows.push(`| Time | What | Where/Who | Links |`);
  rows.push(`|------|------|----------|-------|`);
  
  if (trends.morningRun > 0.3) {
    rows.push(`| 06:30 | Running | Park | [[${state.morningActivities[0]}]], [[${pickRandom(state.outings)}]] |`);
  }
  
  const restaurant = pickRandom(state.restaurants);
  const person1 = pickRandom(state.persons);
  rows.push(`| 08:00 | Breakfast & coffee | ${restaurant} | [[${restaurant}]], [[${person1}]] |`);
  
  rows.push(`| 09:00 | Work starts | Home/Office | [[Project Roadmap]], [[${pickRandom(state.tasks)}]] |`);
  rows.push(`| 12:30 | Lunch | [[${pickRandom(state.restaurants)}]] | [[${pickRandom(state.persons)}]], [[${pickRandom(state.notes)}]] |`);
  
  if (trends.cycling > 0.4 || trends.rockClimbing > 0.3 || trends.swimming > 0.3) {
    const activity = trends.cycling > 0.4 ? 'Cycling' : trends.rockClimbing > 0.3 ? 'Rock Climbing' : 'Swimming';
    rows.push(`| 17:00 | ${activity} | Outside/Gym | [[${activity}]], [[${pickRandom(state.persons)}]] |`);
  }
  
  if (trends.animeWatching > 0.4) {
    rows.push(`| 20:00 | Anime | Home | [[${pickRandom(state.anime)}]] |`);
  }
  
  if (trends.gaming > 0.3) {
    rows.push(`| 21:00 | Gaming | Home | [[${pickRandom(state.games)}]], [[${pickRandom(state.persons)}]] |`);
  }
  
  rows.push(`| 22:30 | Sleep | Bed | [[${pickRandom(state.eveningActivities)}]] |`);
  
  rows.push(`\n**Summary**: Today touched on ${Math.floor(Math.random() * 3 + 5)} different aspects of life. Energy was ${Math.random() > 0.5 ? '7/10' : '6/10'}.`);
  
  return rows.join('\n');
}

function generateReflectiveDeepEntry(date, state, context) {
  const { trends } = context;
  
  const reflections = [];
  reflections.push(`# ${date} — Reflection\n`);
  
  // Find what's trending
  const activeActivities = [];
  if (trends.cycling > 0.6) activeActivities.push('[[Cycling]]');
  if (trends.rockClimbing > 0.6) activeActivities.push('[[Rock Climbing]]');
  if (trends.swimming > 0.5) activeActivities.push('[[Swimming]]');
  if (trends.gardening > 0.5) activeActivities.push('[[Gardening]]');
  if (trends.photography > 0.5) activeActivities.push('[[Photography]]');
  
  if (activeActivities.length > 0) {
    reflections.push(`Lately I've been really into ${activeActivities.join(' and ')}. It's interesting how these cycles develop. Each feeds something different.\n`);
  }
  
  reflections.push(`\n## Work & Projects\n`);
  reflections.push(`[[Project Roadmap]] is progressing. Been collaborating with [[${pickRandom(state.persons)}]] on [[${pickRandom(state.notes)}]]. The synergy is real.\n`);
  
  reflections.push(`\n## Media & Entertainment\n`);
  if (trends.animeWatching > 0.4) {
    reflections.push(`Deeply invested in [[${pickRandom(state.anime)}]]. It's making me think about [[${pickRandom(state.notes)}]].\n`);
  }
  if (trends.gaming > 0.4) {
    reflections.push(`Playing [[${pickRandom(state.games)}]] more than I expected. It's a good brain break.\n`);
  }
  
  reflections.push(`\n## Social & Personal\n`);
  reflections.push(`Spent time at [[${pickRandom(state.restaurants)}]] with [[${pickRandom(state.persons)}]]. Those conversations matter.\n`);
  
  reflections.push(`\n## Health & Wellbeing\n`);
  reflections.push(`Energy's been good, though I've dealt with some [[${pickRandom(state.symptoms)}]]. Normal.\n`);
  
  reflections.push(`\n---\n`);
  reflections.push(`Next focus: [[${pickRandom(state.tasks)}]] needs attention. Also want to revisit [[${pickRandom(state.notes)}]].`);
  
  return reflections.join('');
}

function generateBulletedEntry(date, state, context) {
  const { dateNum, trends } = context;
  
  const bullets = [];
  bullets.push(`# ${date}\n`);
  bullets.push(`## What Happened\n`);
  
  // Mix of links across entries
  for (let i = 0; i < 8 + Math.floor(Math.random() * 7); i++) {
    const categories = [
      () => `Started day with [[${state.morningActivities[Math.floor(Math.random() * state.morningActivities.length)]}]]`,
      () => `Work on [[Project Roadmap]] with [[${pickRandom(state.persons)}]]`,
      () => `Visited [[${pickRandom(state.restaurants)}]]`,
      () => `Time on [[${pickRandom(state.activities)}]]`,
      () => `Watched [[${pickRandom(state.anime)}]]`,
      () => `Played [[${pickRandom(state.games)}]]`,
      () => `Thought about [[${pickRandom(state.notes)}]]`,
      () => `Felt [[${pickRandom(state.symptoms)}]]`,
      () => `Chatted with [[${pickRandom(state.persons)}]]`,
      () => `Worked on [[${pickRandom(state.tasks)}]]`,
      () => `Explored [[${pickRandom(state.outings)}]]`,
      () => `Enjoyed [[${pickRandom(state.events)}]]`,
    ];
    
    const category = categories[Math.floor(Math.random() * categories.length)];
    bullets.push(`- ${category()}`);
  }
  
  bullets.push(`\n## Takeaway\n`);
  bullets.push(`Mix of productivity and leisure. Finding the balance.\n`);
  
  return bullets.join('\n');
}

function generateProjectFocusedEntry(date, state, context) {
  const { trends, dateNum } = context;
  
  const entry = [];
  entry.push(`# ${date} — Project Focus\n`);
  
  if (trends.projectRoadmap > 0.7) {
    entry.push(`## ${pickRandom(state.notes)}\n`);
    entry.push(`Deep work day on [[Project Roadmap]]. Made solid progress on [[${pickRandom(state.tasks)}]].\n`);
    entry.push(`- Discussed approach with [[${pickRandom(state.persons)}]]\n`);
    entry.push(`- Tested theory about [[${pickRandom(state.notes)}]]\n`);
    entry.push(`- Need to follow up on [[${pickRandom(state.tasks)}]] before next sync\n`);
  }
  
  entry.push(`\n## This Week\n`);
  entry.push(`- [[${pickRandom(state.notes)}]]: Ongoing\n`);
  entry.push(`- [[${pickRandom(state.tasks)}]]: In progress\n`);
  entry.push(`- [[Project Roadmap]]: Should complete next week\n`);
  
  entry.push(`\n## Break Time\n`);
  entry.push(`Needed to step away around [[${pickRandom(state.restaurants)}]] for lunch with [[${pickRandom(state.persons)}]].\n`);
  entry.push(`Evening was lighter: [[${pickRandom(state.anime)}]] and [[${pickRandom(state.games)}]].\n`);
  
  entry.push(`\n---\n`);
  entry.push(`Momentum is real. Keep this pace.\n`);
  
  return entry.join('');
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomId(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function copyPluginToVault(vaultPath, projectRoot) {
  const pluginDir = path.join(vaultPath, '.obsidian', 'plugins', 'journal-visualizer');
  ensureDir(pluginDir);
  
  const filesToCopy = [
    { src: 'main.js', dst: 'main.js' },
    { src: 'manifest.json', dst: 'manifest.json' },
    { src: 'styles.css', dst: 'styles.css' },
    { src: 'data.json', dst: 'data.json' },
  ];
  
  filesToCopy.forEach(({ src, dst }) => {
    const srcPath = path.join(projectRoot, src);
    const dstPath = path.join(pluginDir, dst);
    if (fs.existsSync(srcPath)) {
      copyFile(srcPath, dstPath);
    }
  });
  
  // Enable plugin in community plugins list
  const communityPluginsPath = path.join(vaultPath, '.obsidian', 'community-plugins.json');
  writeFile(communityPluginsPath, JSON.stringify(['journal-visualizer'], null, 2) + '\n');
}

function createShowcaseNotes(out) {
  // Activity Tracker - showcasing yearly & monthly trackers
  writeFile(path.join(out, 'Visualizations', 'Activity Tracker.md'), `# Activity Tracker

Tracking engagement with [[Project Roadmap]] and how consistently I'm working on it.

## Yearly Overview

\`\`\`note-insight-yearly
id: ${generateRandomId()}
notePath: Notes/Project Roadmap.md
selectedYear: 2025
\`\`\`

## Monthly Deep Dive

See this month's activity in detail:

\`\`\`note-insight-monthly
id: ${generateRandomId()}
notePath: Notes/Project Roadmap.md
selectedMonth: 2025-11
\`\`\`

---

The yearly tracker shows patterns across the full year, while the monthly tracker lets you zoom into specific periods.
`);

  // Work Impact Dashboard - counter with multiple display modes
  writeFile(path.join(out, 'Visualizations', 'Work Impact.md'), `# Work Impact Dashboard

Overview of how my work items are being referenced across different contexts.

## Total Engagement (Top Projects)

\`\`\`note-insight-counter
id: ${generateRandomId()}
displayAs: top-n
notePath: Notes/Project Roadmap.md
notePath: Notes/Idea New Feature.md
notePath: Notes/Meeting Summary.md
notePath: Notes/Research Notes.md
period: past-month
\`\`\`

## Distribution (Pie Chart)

\`\`\`note-insight-counter
id: ${generateRandomId()}
displayAs: pie
notePath: Notes/Project Roadmap.md
notePath: Notes/Idea New Feature.md
notePath: Notes/Meeting Summary.md
notePath: Notes/Research Notes.md
period: past-month
\`\`\`

## Evolution Over Time

\`\`\`note-insight-counter
id: ${generateRandomId()}
displayAs: time-series
notePath: Notes/Project Roadmap.md
notePath: Notes/Idea New Feature.md
notePath: Notes/Meeting Summary.md
period: past-month
\`\`\`

---

Use these views to understand work distribution and trends.
`);

  // Media & Entertainment Tracker
  writeFile(path.join(out, 'Visualizations', 'Media Tracker.md'), `# What I'm Into

Tracking media consumption patterns across anime, games, and series.

## Anime & Games Comparison

\`\`\`note-insight-counter
id: ${generateRandomId()}
displayAs: top-n
notePath: Media/Anime/Naruto.md
notePath: Media/Anime/One Piece.md
notePath: Media/Anime/Attack on Titan.md
notePath: Media/Anime/Demon Slayer.md
notePath: Media/Games/Stardew Valley.md
notePath: Media/Games/Celeste.md
notePath: Media/Games/Hollow Knight.md
period: past-month
\`\`\`

## Time Series - How Interest Evolves

\`\`\`note-insight-counter
id: ${generateRandomId()}
displayAs: time-series
notePath: Media/Anime/Naruto.md
notePath: Media/Anime/One Piece.md
notePath: Media/Games/Stardew Valley.md
notePath: Media/Games/Celeste.md
period: past-month
\`\`\`

---

See which shows and games are getting the most attention lately.
`);

  // Health & Wellness Tracker
  writeFile(path.join(out, 'Visualizations', 'Health & Wellness.md'), `# Health & Wellness Tracker

Tracking physical activities and any health observations.

## Activity Engagement

\`\`\`note-insight-counter
id: ${generateRandomId()}
displayAs: top-n
notePath: Activities/Morning Run.md
notePath: Activities/Yoga Session.md
notePath: Activities/Cycling.md
notePath: Activities/Swimming.md
notePath: Activities/Rock Climbing.md
period: past-month
\`\`\`

## Monthly Activity Pattern

\`\`\`note-insight-monthly
id: ${generateRandomId()}
notePath: Activities/Morning Run.md
selectedMonth: 2025-11
\`\`\`

## Symptoms Tracking

\`\`\`note-insight-counter
id: ${generateRandomId()}
displayAs: time-series
notePath: Symptoms/Headache.md
notePath: Symptoms/Fatigue.md
notePath: Symptoms/Allergy.md
period: past-month
\`\`\`

---

Monitor physical activity trends and health patterns.
`);

  // Social Connections Tracker
  writeFile(path.join(out, 'Visualizations', 'Social Connections.md'), `# Social Connections

Tracking engagement with people in my network.

## Who Am I Interacting With?

\`\`\`note-insight-counter
id: ${generateRandomId()}
displayAs: pie
notePath: Persons/Alice.md
notePath: Persons/Bob.md
notePath: Persons/Charlie.md
notePath: Persons/Dana.md
notePath: Persons/Eve.md
notePath: Persons/Frank.md
period: past-month
\`\`\`

## Connection Trends Over Time

\`\`\`note-insight-counter
id: ${generateRandomId()}
displayAs: time-series
notePath: Persons/Alice.md
notePath: Persons/Bob.md
notePath: Persons/Charlie.md
notePath: Persons/Dana.md
period: past-month
\`\`\`

---

Understand social patterns and connection frequency.
`);

  // Quick Stats - Single counter examples
  writeFile(path.join(out, 'Visualizations', 'Quick Stats.md'), `# Quick Stats

Simple, focused metrics for quick reference.

## This Month's Project Focus

\`\`\`note-insight-counter
id: ${generateRandomId()}
notePath: Notes/Project Roadmap.md
period: this-month
\`\`\`

## This Week's Activity

\`\`\`note-insight-counter
id: ${generateRandomId()}
notePath: Activities/Morning Run.md
period: this-week
\`\`\`

## Today's References

\`\`\`note-insight-counter
id: ${generateRandomId()}
notePath: Notes/Meeting Summary.md
period: today
\`\`\`

## Year to Date - Key Projects

\`\`\`note-insight-counter
id: ${generateRandomId()}
displayAs: top-n
notePath: Notes/Project Roadmap.md
notePath: Notes/Idea New Feature.md
notePath: Notes/Research Notes.md
period: this-year
\`\`\`

---

Quick snapshots of key metrics without detailed analysis.
`);
}

function createMainDashboardCanvas(out) {
  const canvas = {
    nodes: [
      {
        id: 'overview-title',
        type: 'text',
        text: '# Vault Visualizer Demo Dashboard\n\nExplore the plugin capabilities through these visualization examples. Each card showcases different features and display modes.',
        x: -1000,
        y: -600,
        width: 1000,
        height: 200
      },
      {
        id: 'activity-yearly',
        type: 'text',
        text: '## Yearly Activity Tracker\n\nSee the full year of project engagement at a glance:\n\n```note-insight-yearly\nid: ${generateRandomId()}\nnotePath: Notes/Project Roadmap.md\nselectedYear: 2025\n```',
        x: -1000,
        y: -350,
        width: 500,
        height: 400
      },
      {
        id: 'activity-monthly',
        type: 'text',
        text: '## Monthly Deep Dive\n\nExamine this month in calendar detail:\n\n```note-insight-monthly\nid: ${generateRandomId()}\nnotePath: Notes/Project Roadmap.md\nselectedMonth: 2025-11\n```',
        x: -400,
        y: -350,
        width: 500,
        height: 400
      },
      {
        id: 'counter-topn',
        type: 'text',
        text: '## Top Projects (Bar Chart)\n\nRanked by reference frequency:\n\n```note-insight-counter\nid: ${generateRandomId()}\ndisplayAs: top-n\nnotePath: Notes/Project Roadmap.md\nnotePath: Notes/Idea New Feature.md\nnotePath: Notes/Meeting Summary.md\nnotePath: Notes/Research Notes.md\nperiod: past-month\n```',
        x: 150,
        y: -350,
        width: 500,
        height: 400
      },
      {
        id: 'counter-pie',
        type: 'text',
        text: '## Distribution (Pie Chart)\n\nWorkload distribution across projects:\n\n```note-insight-counter\nid: ${generateRandomId()}\ndisplayAs: pie\nnotePath: Notes/Project Roadmap.md\nnotePath: Notes/Idea New Feature.md\nnotePath: Notes/Meeting Summary.md\nnotePath: Notes/Research Notes.md\nperiod: past-month\n```',
        x: -1000,
        y: 150,
        width: 500,
        height: 400
      },
      {
        id: 'counter-timeseries',
        type: 'text',
        text: '## Evolution Over Time (Time Series)\n\nHow engagement evolves throughout the month:\n\n```note-insight-counter\nid: ${generateRandomId()}\ndisplayAs: time-series\nnotePath: Notes/Project Roadmap.md\nnotePath: Notes/Idea New Feature.md\nnotePath: Notes/Meeting Summary.md\nperiod: past-month\n```',
        x: -400,
        y: 150,
        width: 550,
        height: 400
      },
      {
        id: 'media-tracker',
        type: 'text',
        text: '## Media Consumption\n\nWhat media is getting the most attention:\n\n```note-insight-counter\nid: ${generateRandomId()}\ndisplayAs: top-n\nnotePath: Media/Anime/Naruto.md\nnotePath: Media/Anime/One Piece.md\nnotePath: Media/Games/Stardew Valley.md\nnotePath: Media/Games/Celeste.md\nperiod: past-month\n```',
        x: 200,
        y: 150,
        width: 500,
        height: 400
      },
      {
        id: 'health-tracker',
        type: 'text',
        text: '## Activity Engagement\n\nPhysical activities and health metrics:\n\n```note-insight-counter\nid: ${generateRandomId()}\ndisplayAs: top-n\nnotePath: Activities/Morning Run.md\nnotePath: Activities/Yoga Session.md\nnotePath: Activities/Cycling.md\nnotePath: Activities/Swimming.md\nperiod: past-month\n```',
        x: 750,
        y: -350,
        width: 500,
        height: 400
      },
      {
        id: 'social-tracker',
        type: 'text',
        text: '## Social Connections\n\nInteractions with people in your network:\n\n```note-insight-counter\nid: ${generateRandomId()}\ndisplayAs: pie\nnotePath: Persons/Alice.md\nnotePath: Persons/Bob.md\nnotePath: Persons/Charlie.md\nnotePath: Persons/Dana.md\nperiod: past-month\n```',
        x: 750,
        y: 150,
        width: 500,
        height: 400
      },
      {
        id: 'info',
        type: 'text',
        text: '## How to Use\n\n- **Yearly Tracker**: See the full year in git-style heatmap\n- **Monthly Tracker**: Calendar view of a specific month\n- **Top-N (Bars)**: Compare multiple items side-by-side\n- **Pie Chart**: See distribution of engagement\n- **Time Series**: Watch trends evolve over time\n\nEach visualization updates automatically as you add links in your journal entries!',
        x: -400,
        y: 700,
        width: 1000,
        height: 300
      }
    ],
    edges: []
  };

  writeFile(path.join(out, 'Visualizations', 'Dashboard.canvas'), JSON.stringify(canvas, null, 2));
}

function generate(opts) {
  const out = path.resolve(opts.out || './joviz-demo-vault');
  console.log('Generating realistic demo vault at', out);

  // Purge existing vault
  if (fs.existsSync(out)) {
    console.log('Purging existing vault...');
    fs.rmSync(out, { recursive: true, force: true });
  }

  // Create folder structure
  const folders = [
    'Activities', 'Events', 'Journal', 
    'Locations/Outing', 'Locations/Restaurants', 'Locations/Shops',
    'Media/Anime', 'Media/Games', 'Media/Manga', 'Media/Movies', 'Media/Series',
    'Notes', 'Persons', 'Symptoms', 'Tasks', 'Templates', 'Visualizations'
  ];
  folders.forEach(f => ensureDir(path.join(out, f)));

  // Sample data - use natural case with spaces and proper capitalization
  const activities = [
    'Morning Run', 'Evening Walk', 'Yoga Session', 'Cycling', 'Swimming',
    'Rock Climbing', 'Hiking Trail', 'Photography', 'Cooking', 'Gardening'
  ];

  const morningActivities = [
    'Morning Run', 'Yoga Session', 'Meditation', 'Coffee Ritual'
  ];

  const eveningActivities = [
    'Evening Walk', 'Reading', 'Journaling', 'Painting', 'Video Games'
  ];

  const events = [
    'Tech Conference', 'Book Club Meetup', 'Concert Night', 'Farmers Market', 'Art Exhibition'
  ];

  const outings = [
    'Park Walk', 'Museum Visit', 'Beach Day', 'Hiking Trail', 'Boat Ride', 'Local Market'
  ];

  const shops = [
    'Bookstore', 'Coffee Shop', 'Vintage Store', 'Electronics Store', 'Art Supply Store'
  ];

  const restaurants = [
    'Cafe Delight', 'Sushi Place', 'Pizzeria', 'Bistro Oak', 'Thai Garden', 'Ramen House'
  ];

  const anime = [
    'Naruto', 'One Piece', 'Attack on Titan', 'Fullmetal Alchemist Brotherhood',
    'My Hero Academia', 'Demon Slayer', 'Cowboy Bebop', 'Death Note', 'Steins Gate',
    'Neon Genesis Evangelion', 'Spirited Away', 'Your Name'
  ];

  const games = [
    'The Legend of Zelda', 'Stardew Valley', 'Celeste', 'Hollow Knight', 'Elden Ring',
    'Disco Elysium', 'Portal', 'Hades'
  ];

  const manga = [
    'One Piece Manga', 'Berserk', 'Death Note Manga', 'Naruto Manga', 'Fullmetal Alchemist', 'Jujutsu Kaisen'
  ];

  const movies = [
    'Spirited Away', 'Your Name', 'Princess Mononoke', 'The Girl Who Leapt Through Time',
    'Garden of Words', 'Weathering with You'
  ];

  const series = [
    'Cowboy Bebop Series', 'Steins Gate Series', 'Fullmetal Alchemist Series', 'Neon Genesis Evangelion Series',
    'Attack on Titan Series', 'Demon Slayer Series'
  ];

  const persons = [
    'Alice', 'Bob', 'Charlie', 'Dana', 'Eve', 'Frank', 'Grace', 'Henry'
  ];

  const symptoms = [
    'Headache', 'Fatigue', 'Allergy', 'Sore Throat', 'Back Pain'
  ];

  const notes = [
    'Project Roadmap', 'Idea New Feature', 'Meeting Summary', 'Research Notes',
    'Book Ideas', 'Career Reflections'
  ];

  const tasks = [
    'Review PR', 'Publish Release', 'Write Documentation', 'Code Review',
    'Catch Up with Alice', 'Finish Book'
  ];

  // Create entity files
  console.log('Creating sample entities...');
  createItemFiles(path.join(out, 'Activities'), 'activity', activities);
  createItemFiles(path.join(out, 'Events'), 'event', events);
  createItemFiles(path.join(out, 'Locations', 'Outing'), 'outing', outings);
  createItemFiles(path.join(out, 'Locations', 'Shops'), 'shop', shops);
  createItemFiles(path.join(out, 'Locations', 'Restaurants'), 'restaurant', restaurants);
  createItemFiles(path.join(out, 'Media', 'Anime'), 'anime', anime);
  createItemFiles(path.join(out, 'Media', 'Games'), 'game', games);
  createItemFiles(path.join(out, 'Media', 'Manga'), 'manga', manga);
  createItemFiles(path.join(out, 'Media', 'Movies'), 'movie', movies);
  createItemFiles(path.join(out, 'Media', 'Series'), 'series', series);
  createItemFiles(path.join(out, 'Notes'), 'note', notes);
  createItemFiles(path.join(out, 'Persons'), 'person', persons);
  createItemFiles(path.join(out, 'Symptoms'), 'symptom', symptoms);
  createItemFiles(path.join(out, 'Tasks'), 'task', tasks);

  // Template
  writeFile(path.join(out, 'Templates', 'Interstitial Journal Entry.md'), `# YYYY-MM-DD - Interstitial Journal Entry

## Morning (07:00 - 09:00)
What did you do? How did you feel?

## Midday (09:00 - 13:00)
Work, focus, interactions.

## Afternoon (13:00 - 17:00)
Energy shift. What happened?

## Evening (17:00 - 21:00)
Wind down. Reflections.

---
*Any notes or observations?*
`);

  writeFile(path.join(out, 'Visualizations', 'README.md'), `# Visualizations

Sample dashboard placeholder for testing the plugin.
`);

  // Create showcase notes with embedded components
  createShowcaseNotes(out);

  // Create main dashboard canvas
  createMainDashboardCanvas(out);

  // Generate journal entries
  console.log('Generating realistic journal entries...');
  const end = new Date(opts.end ? new Date(opts.end) : new Date());
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 2);

  const state = {
    activities,
    morningActivities,
    eveningActivities,
    events,
    outings,
    shops,
    restaurants,
    anime,
    games,
    manga,
    movies,
    series,
    persons,
    symptoms,
    notes,
    tasks,
  };

  let cur = new Date(start);
  let count = 0;
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const folder = path.join(out, 'Journal', `${y}-${m}`);
    ensureDir(folder);
    const filename = `${y}-${m}-${d}.md`;
    const dateStr = `${y}-${m}-${d}`;
    
    const content = generateInterstitialEntry(dateStr, state);
    writeFile(path.join(folder, filename), content);
    
    count++;
    cur.setDate(cur.getDate() + 1);
  }

  console.log(`Generated ${count} journal entries.`);

  // Create vault README
  writeFile(path.join(out, 'README.md'), `# Joviz Demo Vault

A realistic demo vault for testing the Journal Visualizer plugin.

## What's Inside

- **Journal**: Interstitial journal entries spanning 2 years with natural, varied content
- **Activities, Events, Locations**: Sample places and things you do
- **Media**: Anime, games, manga, movies, and series you follow
- **Persons**: People you interact with
- **Notes & Tasks**: Ideas and things to do
- **Symptoms**: Health tracking entries

## Visualization Examples

Check out these pre-built visualizations to see the plugin in action:

- [[Visualizations/Activity Tracker]] - Yearly and monthly activity tracking
- [[Visualizations/Work Impact]] - Project engagement with multiple display modes
- [[Visualizations/Media Tracker]] - Media consumption analytics
- [[Visualizations/Health & Wellness]] - Activity and symptom patterns
- [[Visualizations/Social Connections]] - Interaction frequency tracking
- [[Visualizations/Quick Stats]] - Quick reference metrics
- [[Visualizations/Dashboard]] - Interactive canvas with all visualization types

## Getting Started

1. Open this folder as a vault in Obsidian
2. Enable the Journal Visualizer plugin in Settings → Community plugins
3. Navigate to the [[Visualizations]] folder to see example dashboards
4. Explore your Notes to see backlink visualizations
5. Try creating a code block: \`\`\`note-insight-yearly\n...\`\`\`

The journal entries cross-reference everything, so you'll see meaningful backlink patterns that reflect a real journaling practice.
`);

  // Copy plugin files to vault
  console.log('Copying plugin files...');
  const projectRoot = path.resolve(__dirname, '..');
  copyPluginToVault(out, projectRoot);

  console.log('✓ Demo vault generation complete!');
}

import minimist from 'minimist';

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = minimist(process.argv.slice(2));
  generate({ out: args.out, end: args.end });
}

export { generate };

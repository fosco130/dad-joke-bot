require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// Configuration
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 9 * * *';
const BOT_EMOJI = process.env.BOT_EMOJI || ':laughing:';

// Paths for data storage
const DATA_DIR = path.join(__dirname, 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'joke-history.json');
const LOG_FILE = path.join(DATA_DIR, 'bot.log');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory joke history (last 20 jokes)
let jokeHistory = [];
const MAX_HISTORY = 20;

// Load joke history from file
function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      jokeHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading history:', error.message);
    jokeHistory = [];
  }
}

// Save joke history to file
function saveHistory() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(jokeHistory, null, 2));
  } catch (error) {
    console.error('Error saving history:', error.message);
  }
}

// Log to file and console
function logEvent(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  console.log(logMessage);
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  } catch (error) {
    console.error('Error writing to log file:', error.message);
  }
}

// Validate required environment variables
if (!SLACK_BOT_TOKEN) {
  console.error('Error: SLACK_BOT_TOKEN is required');
  process.exit(1);
}

if (!CHANNEL_ID) {
  console.error('Error: SLACK_CHANNEL_ID is required');
  process.exit(1);
}

// Initialize Slack client
const slack = new WebClient(SLACK_BOT_TOKEN);

// Fallback jokes for when API is down
const FALLBACK_JOKES = [
  "Why don't scientists trust atoms? Because they make up everything!",
  "I told my wife she was drawing her eyebrows too high. She looked surprised.",
  "Why did the scarecrow win an award? He was outstanding in his field!",
  "What do you call a fake noodle? An impasta!",
  "I used to hate facial hair, but then it grew on me.",
];

/**
 * Fetches a random dad joke from icanhazdadjoke.com
 * Filters for safe-for-work jokes only (offensive flag = false)
 */
async function getDadJoke(retries = 3) {
  const maxAttempts = retries;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get('https://icanhazdadjoke.com/', {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Dad Joke Slack Bot (https://github.com/yourusername/dad-joke-bot)',
        },
        timeout: 5000,
      });

      const joke = response.data.joke;
      const isOffensive = response.data.offensive || false;

      // Skip offensive jokes
      if (isOffensive) {
        logEvent(`Skipped offensive joke (attempt ${attempt}/${maxAttempts})`, 'DEBUG');
        continue;
      }

      // Check if joke was recently posted
      if (jokeHistory.includes(joke)) {
        logEvent(`Skipped recently posted joke (attempt ${attempt}/${maxAttempts})`, 'DEBUG');
        continue;
      }

      return joke;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const waitTime = Math.min(1000 * attempt, 5000);
        logEvent(`Retry ${attempt}/${maxAttempts} failed, waiting ${waitTime}ms...`, 'WARN');
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // If all retries failed, use fallback joke
  logEvent(`All ${maxAttempts} attempts failed: ${lastError?.message}. Using fallback joke.`, 'WARN');
  return FALLBACK_JOKES[Math.floor(Math.random() * FALLBACK_JOKES.length)];
}

/**
 * Posts a dad joke to the configured Slack channel with rich formatting
 */
async function postJokeToSlack() {
  try {
    const joke = await getDadJoke();

    // Create rich message blocks
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `_${joke}_`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '😄 Have a groan-worthy day!',
          },
        ],
      },
    ];

    // Create a promise that rejects after 10 seconds
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Slack API timeout after 10 seconds')), 10000)
    );

    // Try to join the channel first (in case bot isn't a member)
    try {
      await Promise.race([
        slack.conversations.join({ channel: CHANNEL_ID }),
        timeoutPromise,
      ]);
      logEvent('Joined channel successfully');
    } catch (joinError) {
      logEvent(`Could not join channel (may already be member): ${joinError.message}`);
    }

    await Promise.race([
      slack.chat.postMessage({
        channel: CHANNEL_ID,
        blocks: blocks,
        text: joke,
        unfurl_links: false,
        icon_emoji: BOT_EMOJI,
        username: 'Dad Joke Bot',
      }),
      timeoutPromise,
    ]);

    // Add to history and save
    jokeHistory.push(joke);
    if (jokeHistory.length > MAX_HISTORY) {
      jokeHistory.shift();
    }
    saveHistory();

    logEvent(`Posted joke: "${joke}"`);
    return joke;
  } catch (error) {
    logEvent(`Error posting to Slack: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Main execution
async function main() {
  logEvent('Dad Joke Bot starting up...');
  logEvent(`Schedule: ${CRON_SCHEDULE}`);
  logEvent(`Channel: ${CHANNEL_ID}`);

  // Load joke history from file
  loadHistory();
  logEvent(`Loaded ${jokeHistory.length} jokes from history`);

  // Validate cron expression
  if (!cron.validate(CRON_SCHEDULE)) {
    logEvent(`Invalid cron expression: ${CRON_SCHEDULE}`, 'ERROR');
    process.exit(1);
  }

  // Check if running in GitHub Actions
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

  // Post an initial joke on startup
  logEvent('Posting initial joke...');
  try {
    await postJokeToSlack();
    if (isGitHubActions) {
      logEvent('Running in GitHub Actions - exiting after post');
      process.exit(0);
    }
  } catch (error) {
    logEvent(`Failed to post initial joke: ${error.message}`, 'ERROR');
    if (isGitHubActions) {
      process.exit(1);
    }
  }

  // Schedule future jokes (only if NOT in GitHub Actions)
  logEvent(`Scheduled to post jokes on cron: ${CRON_SCHEDULE}`);
  cron.schedule(CRON_SCHEDULE, async () => {
    try {
      await postJokeToSlack();
    } catch (error) {
      logEvent(`Scheduled post failed: ${error.message}`, 'ERROR');
    }
  });
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    logEvent(`Fatal error: ${error.message}`, 'FATAL');
    process.exit(1);
  });
}

// Export for use in serverless environments (e.g., AWS Lambda, GitHub Actions)
module.exports = { getDadJoke, postJokeToSlack };

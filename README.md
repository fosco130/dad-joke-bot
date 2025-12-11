# Dad Joke Slack Bot

Automatically posts terrible dad jokes to a Slack channel on a schedule.

## Setup

### 1. Create a Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it "Dad Joke Bot" and select your workspace
4. Go to **OAuth & Permissions** in the left sidebar
5. Under **Scopes**, add these bot token scopes:
   - `chat:write`
   - `channels:read`
6. Click **Install to Workspace** and authorize
7. Copy your **Bot User OAuth Token** (starts with `xoxb-`)

### 2. Get Your Channel ID

1. In Slack, right-click the channel where you want jokes posted
2. Select "Copy channel ID" (or go to channel details)
3. It'll look like: `C12345678ABC`

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env`
2. Add your Slack bot token and channel ID:
   ```
   SLACK_BOT_TOKEN=xoxb-your-token-here
   SLACK_CHANNEL_ID=C12345678
   CRON_SCHEDULE=0 9 * * *
   ```

### 5. Run Locally

```bash
npm start
```

You should see the bot post a test joke immediately, then subsequent jokes on your schedule.

## Scheduling

The `CRON_SCHEDULE` environment variable controls when jokes are posted. Uses standard cron format (5 fields):

```
minute hour day month day-of-week
```

**Examples:**
- `0 9 * * *` — Every day at 9:00 AM
- `0 9 * * 1-5` — Weekdays at 9:00 AM
- `0 */4 * * *` — Every 4 hours
- `*/30 * * * *` — Every 30 minutes
- `0 10,14,18 * * *` — At 10am, 2pm, and 6pm daily

## Deployment Options

### Option A: AWS Lambda (Serverless - Easiest for Always-On)

1. Create a new Lambda function with Node.js 18
2. Add environment variables in Lambda configuration
3. Create a CloudWatch Event Rule to trigger on schedule
4. Update the handler to call `postJokeToSlack()` directly

**Pros:** Free tier generous, always running, no server management
**Cons:** Slightly more setup

### Option B: Replit (Free, Easy)

1. Push code to Replit
2. Keep the process running with `npm start`
3. Use Replit's "Always On" feature (paid tier) or UptimeRobot to keep it alive

**Pros:** Very simple, integrated deployment
**Cons:** May need paid features for reliability

### Option C: Your Own Server

Run this on any server with Node.js (VPS, home server, etc.):

```bash
# Install dependencies
npm install

# Run with PM2 to keep it alive
npm install -g pm2
pm2 start index.js --name "dad-joke-bot"
pm2 startup
pm2 save
```

**Pros:** Full control, can be free if you have existing infrastructure
**Cons:** Need to manage the server

### Option D: GitHub Actions (No Server Required!)

Create `.github/workflows/dad-jokes.yml`:

```yaml
name: Daily Dad Jokes

on:
  schedule:
    - cron: '0 9 * * *'  # 9am UTC daily

jobs:
  post-joke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          SLACK_CHANNEL_ID: ${{ secrets.SLACK_CHANNEL_ID }}
        run: node -e "require('./index.js')"
```

**Pros:** Completely free, no server to manage, GitHub handles scheduling
**Cons:** Runs at specific times (not continuously)

## Customization

### Modify the joke source

The bot uses `icanhazdadjoke.com` which has thousands of jokes. To use a different source:

```javascript
// Replace the getDadJoke() function with your API

async function getDadJoke() {
  const response = await axios.get('https://api.example.com/random-joke');
  return response.data.punchline; // Adjust based on API response
}
```

### Add joke formatting

Modify the `postJokeToSlack()` function:

```javascript
await slack.chat.postMessage({
  channel: CHANNEL_ID,
  text: `😂 *Dad Joke of the moment:*\n\n${joke}`,
  blocks: [  // Use blocks for richer formatting
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `😂 *${joke}*`
      }
    }
  ]
});
```

### Filter jokes by category

The `icanhazdadjoke.com` API supports searching. Modify:

```javascript
const response = await axios.get('https://icanhazdadjoke.com/search', {
  params: { query: 'programming' },  // Filter by topic
  headers: { Accept: 'application/json' }
});
```

## Troubleshooting

**"Error posting to Slack: not_in_channel"**
- Make sure the bot is invited to the channel. Go to the channel and add the bot.

**"invalid_auth"**
- Check your bot token is correct and has the right scopes

**"channel_not_found"**
- Verify your channel ID is correct (should start with C)

**Jokes aren't posting**
- Check logs: `console.log()` will show in your deployment's logs
- Make sure your cron schedule is correct (use `crontab.guru` to validate)

## License

MIT

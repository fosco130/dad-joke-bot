# Deployment Guide

This guide covers how to deploy and run the Dad Joke Bot on various platforms.

## Prerequisites

- Node.js 14+ installed
- Valid Slack Bot Token
- Target Slack Channel ID

## Local Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Test locally:
   ```bash
   npm start
   ```

## Deployment Options

### Option 1: PM2 (Recommended for VPS/Servers)

PM2 keeps your bot running 24/7 with automatic restarts.

#### Installation

```bash
npm install -g pm2
```

#### Start the Bot

```bash
pm2 start ecosystem.config.js
pm2 save              # Save startup configuration
pm2 startup           # Generate startup script
```

#### Useful PM2 Commands

```bash
pm2 list              # Show all running processes
pm2 logs dad-joke-bot # View real-time logs
pm2 stop dad-joke-bot # Stop the bot
pm2 restart dad-joke-bot # Restart the bot
pm2 delete dad-joke-bot # Remove from PM2
```

#### View Logs

- **Application logs**: `data/bot.log`
- **PM2 error logs**: `~/.pm2/logs/dad-joke-bot-error.log`
- **PM2 output logs**: `~/.pm2/logs/dad-joke-bot-out.log`

### Option 2: GitHub Actions (Serverless - No Server Needed)

Schedule the bot to run using GitHub Actions. No server required!

1. **Enable GitHub Actions** in your repository settings
2. **Create** `.github/workflows/schedule-joke.yml`:

```yaml
name: Schedule Dad Joke

on:
  schedule:
    # Runs at 5 PM UTC every weekday (adjust as needed)
    - cron: '0 17 * * 1-5'

jobs:
  post-joke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Post joke
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          SLACK_CHANNEL_ID: ${{ secrets.SLACK_CHANNEL_ID }}
          BOT_EMOJI: ':man_with_mustache:'
        run: node index.js
```

3. **Add secrets** in GitHub:
   - Go to Settings → Secrets and Variables → Actions
   - Add `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID`

### Option 3: Docker

Deploy using Docker for consistent environments.

1. **Create** `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

CMD ["node", "index.js"]
```

2. **Build and run**:

```bash
docker build -t dad-joke-bot .
docker run --env-file .env dad-joke-bot
```

### Option 4: Replit

Deploy for free on Replit:

1. Fork the project to Replit
2. Add `.env` file with your credentials
3. Click "Run" to start the bot
4. Enable "Always On" for continuous operation (paid feature)

### Option 5: AWS Lambda

Deploy as a serverless function triggered by EventBridge (CloudWatch Events):

1. **Package your code** for Lambda
2. **Set environment variables** in Lambda configuration
3. **Create EventBridge rule** to trigger on your cron schedule
4. Update `ecosystem.config.js` timeout settings for Lambda

## Monitoring

### Check Logs

```bash
# View application logs
tail -f data/bot.log

# View PM2 logs
pm2 logs dad-joke-bot
```

### Check if Running

```bash
# With PM2
pm2 status

# Check if process is listening
ps aux | grep "node index.js"
```

### Troubleshooting

**Bot not posting?**
- Check `.env` file has valid tokens
- Verify cron schedule with `crontab -e`
- Check logs: `tail -f data/bot.log`
- Ensure bot has permissions in the Slack channel

**API errors?**
- Check internet connection
- Verify icanhazdadjoke.com API is up
- Check Slack API token is still valid

**Memory issues?**
- PM2 has a 100MB memory limit by default
- Increase in `ecosystem.config.js` if needed

## Updates

To update the bot:

```bash
# Pull latest changes
git pull

# Reinstall dependencies if changed
npm install

# Restart if using PM2
pm2 restart dad-joke-bot
```

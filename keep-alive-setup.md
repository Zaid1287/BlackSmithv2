# Keep Alive Setup for BlackSmith Traders

## Overview

Your BlackSmith Traders app deployment spins down after 15 minutes of inactivity. This setup prevents that by automatically pinging your app every 10 minutes.

## Quick Setup

### 1. Repository Setup
Copy the `.github/workflows/keep-alive.yml` file to your `keep-me-alive` repository or create a new repository with this workflow.

### 2. App URL Configuration
The workflow is pre-configured with your app URL: `https://blacksmithv2-1.onrender.com`

No additional secrets configuration needed.

### 3. Workflow Features

**Automatic Pings:**
- Runs every 10 minutes (before 15-minute timeout)
- Pings `/ping` endpoint for health status
- Also checks key API endpoints to keep them warm

**Manual Extended Sessions:**
- Go to **Actions** tab → **Keep BlackSmith Traders App Alive**
- Click **Run workflow** for 30-ping extended session
- Simulates real user traffic with random delays

## Ping Endpoint Details

Your app now has a `/ping` endpoint that returns:

```json
{
  "status": "healthy",
  "timestamp": "2025-06-25T07:33:30.000Z", 
  "uptime": 123.45,
  "status_code": 200
}
```

## Monitoring

The workflow will:
- Show ✅ when app is alive (200 response)
- Show ❌ when app might be down
- Log timestamps for each ping
- Exit with error if app is unreachable

## Local Testing

Test your ping endpoint:
```bash
curl https://blacksmithv2-1.onrender.com/ping
```

Or run the Python script:
```bash
python ping_backend.py
```

## Advanced Configuration

You can modify the workflow to:
- Change ping frequency (modify cron schedule)
- Add more endpoints to keep warm
- Adjust extended session duration
- Add Slack/Discord notifications

This setup ensures your BlackSmith Traders app stays active and responsive for your users.
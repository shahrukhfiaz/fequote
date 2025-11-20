# Railway Deployment Guide

## Quick Deploy to Railway

### 1. Prerequisites

- GitHub account with your code pushed
- Railway account (free tier works)
- Insurance Toolkits account with valid credentials

### 2. Connect Repository

1. Go to [Railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will auto-detect Node.js and Puppeteer

### 3. Configure Environment Variables

In Railway dashboard, add these variables:

#### Required Variables:

```bash
# Server
PORT=3000

# Insurance Toolkits (REQUIRED)
INSURANCE_TOOLKITS_ENABLED=true
INSURANCE_TOOLKITS_EMAIL=your-email@insurancetoolkits.com
INSURANCE_TOOLKITS_PASSWORD=your-secure-password

# Other Providers (Optional - set to false)
PROVIDER_A_ENABLED=false
PROVIDER_B_ENABLED=false

# Mock Provider (set to false for REAL quotes only)
# Only enable this for testing API structure without real credentials
MOCK_PROVIDER_ENABLED=false
```

#### To Add Variables in Railway:

1. Click on your service
2. Go to "Variables" tab
3. Click "New Variable"
4. Add each variable name and value
5. Click "Add" for each one

### 4. Deploy

Railway will automatically:
- Install Node.js dependencies
- Install Chrome/Chromium for Puppeteer
- Build and start your application

### 5. Get Your API URL

After deployment:
1. Go to "Settings" tab
2. Click "Generate Domain"
3. Your API will be available at: `https://your-app.up.railway.app`

## Testing Your Deployment

### Health Check

```bash
curl https://your-app.up.railway.app/
```

Expected response:
```json
{
  "ok": true,
  "message": "Final Expense Quote API is running",
  "timestamp": "2025-11-20T20:45:00.000Z"
}
```

### Check Provider Status

```bash
curl https://your-app.up.railway.app/providers
```

Expected response:
```json
{
  "providers": [
    {
      "provider": "InsuranceToolkits",
      "enabled": true,
      "session": {
        "isLoggedIn": true,
        "browserConnected": true,
        "lastActivityTime": "2025-11-20T20:45:00.000Z",
        "sessionAge": 2
      }
    }
  ]
}
```

### Test Quote Request

```bash
curl -X POST https://your-app.up.railway.app/quote \
  -H "Content-Type: application/json" \
  -d '{
    "faceAmount": 15000,
    "coverageType": "Level",
    "sex": "Male",
    "state": "TX",
    "dobMonth": "05",
    "dobDay": "10",
    "dobYear": "1958",
    "heightFeet": "5",
    "heightInches": "9",
    "weight": "175",
    "tobaccoUse": "None",
    "paymentType": "Bank Draft/EFT",
    "conditions": ["Type 2 diabetes"],
    "medications": ["Metformin 500mg"]
  }'
```

## Monitoring Logs

### View Real-Time Logs

In Railway dashboard:
1. Click on your service
2. Go to "Deployments" tab
3. Click on the latest deployment
4. View logs in real-time

### What to Look For:

✅ **Successful startup:**
```
Final Expense Quote API listening on port 3000
```

✅ **Session established:**
```
🚀 Launching persistent browser instance...
✅ Browser instance ready
🔐 Logging in to Insurance Toolkits...
✅ Login successful - session established
```

✅ **Session reuse:**
```
✅ Using existing session (logged in)
📝 Navigating to quote page...
📋 Filling quote form...
🚀 Submitting form...
⏳ Waiting for results...
📊 Extracting quotes...
✅ Found 5 quote(s) from Insurance Toolkits
```

✅ **Session monitoring:**
```
💚 Session active - 5 minutes old
💚 Session active - 10 minutes old
```

⚠️ **Errors to watch for:**
```
❌ Error scraping Insurance Toolkits: [error message]
⏰ Session expired, re-logging in...
```

## Troubleshooting

### Issue: Deployment Fails

**Solution:** Check build logs in Railway. Common issues:
- Missing environment variables
- Syntax errors in code
- Network timeout during build

### Issue: Browser Fails to Launch

**Error:** `Error: Failed to launch the browser process`

**Solution:** Railway automatically installs Chrome dependencies. If this fails:
1. Check Railway logs for specific error
2. Ensure you're on a Railway plan that supports Puppeteer
3. Try redeploying

### Issue: Login Fails

**Error:** `INSURANCE_TOOLKITS_EMAIL and INSURANCE_TOOLKITS_PASSWORD must be set`

**Solution:** 
1. Verify environment variables are set in Railway
2. Check for typos in variable names
3. Ensure credentials are correct by testing on insurancetoolkits.com manually

### Issue: Timeout Errors

**Error:** `TimeoutError: waiting for selector failed`

**Solution:**
1. Check if insurancetoolkits.com is accessible
2. Increase timeout values in `insuranceToolkitsScraper.js`
3. Check Railway logs to see which selector is failing

### Issue: No Quotes Returned

**Error:** `No quotes found on results page`

**Solutions:**
1. Form validation may have failed on Insurance Toolkits
2. No carriers available for the given criteria
3. Results page structure may have changed

**Debug steps:**
1. Check Railway logs for form submission details
2. Test the same request manually on insurancetoolkits.com
3. Verify all required fields are being sent

### Issue: Session Keeps Expiring

**Error:** `⏰ Session expired, re-logging in...`

**Solutions:**
1. This is normal after 24 hours of inactivity
2. If happening too frequently, check if browser is crashing
3. Look for memory issues in Railway metrics

### Issue: High Memory Usage

**Symptom:** Service crashes or restarts frequently

**Solutions:**
1. Puppeteer uses ~100-300MB of RAM for the browser
2. Upgrade Railway plan if needed
3. Consider implementing request queuing to limit concurrent requests

## Performance Optimization

### Expected Response Times:

| Scenario | Time |
|----------|------|
| First request (with login) | 5-10 seconds |
| Subsequent requests (session reuse) | 1-2 seconds |
| Session re-login | 5-10 seconds |

### Scaling Considerations:

**Single Instance (Free/Hobby Tier):**
- Handles ~100 requests/hour comfortably
- One persistent browser session
- Sequential request processing

**Multiple Instances (Pro Tier):**
- Each instance maintains its own session
- Load balancer distributes requests
- Higher concurrency

## Railway-Specific Tips

### 1. Automatic Redeploys

Railway auto-deploys on every push to main/master:
```bash
git add .
git commit -m "Update scraper"
git push origin main
# Railway automatically deploys
```

### 2. Environment Variable Updates

Changing environment variables requires a redeploy:
1. Update variable in Railway dashboard
2. Manually click "Redeploy" or push a new commit

### 3. Persistent Storage

Railway provides ephemeral storage (lost on redeploy). For persistent data:
- Use Railway's PostgreSQL plugin
- Use external storage service

### 4. Custom Domains

To use your own domain:
1. Go to "Settings" tab
2. Click "Custom Domain"
3. Add your domain and configure DNS

### 5. Service Monitoring

Railway provides:
- CPU usage metrics
- Memory usage metrics
- Network traffic
- Request logs

Access via "Metrics" tab in your service.

## Security Best Practices

### 1. Protect Environment Variables

- ✅ Never commit `.env` file to Git
- ✅ Use Railway's secure variable storage
- ✅ Rotate credentials periodically

### 2. API Security

Consider adding:
- API key authentication
- Rate limiting
- IP whitelisting (for n8n integration)

Example with API key middleware:

```javascript
// Add to index.js
const API_KEY = process.env.API_KEY;

app.use('/quote', (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

### 3. CORS Configuration

Current setup allows all origins. To restrict:

```javascript
// In index.js
app.use(cors({
  origin: ['https://your-n8n-instance.com']
}));
```

## Cost Estimation

### Railway Pricing (as of 2024):

**Hobby Plan ($5/month):**
- $5 credit included
- Pay for usage beyond credit
- ~500 hours of runtime
- Suitable for development/light production

**Pro Plan ($20/month):**
- $20 credit included
- Better for production
- Higher limits

### This App's Usage:

- **Memory:** ~200-400MB (with browser)
- **CPU:** Low (spikes during scraping)
- **Estimated cost:** $5-15/month depending on traffic

## Backup and Recovery

### Backup Your Code

Always maintain a Git repository:
```bash
git remote add backup https://github.com/yourusername/backup-repo.git
git push backup main
```

### Quick Recovery

If deployment fails:
1. Check Railway logs for errors
2. Roll back to previous deployment in Railway dashboard
3. Fix issue locally and redeploy

### Database Backup (if using)

If you add a database later:
```bash
# Railway provides automatic backups
# Access via Railway CLI or dashboard
```

## Next Steps

After successful deployment:
1. ✅ Test all endpoints
2. ✅ Monitor logs for 24 hours
3. ✅ Set up alerting (Railway webhooks)
4. ✅ Integrate with n8n
5. ✅ Document your API for team members

## Support

**Railway Support:**
- Discord: [railway.app/discord](https://discord.gg/railway)
- Docs: [docs.railway.app](https://docs.railway.app)

**This Project:**
- Check GitHub issues
- Review logs in Railway dashboard
- Test locally first with `npm run dev`


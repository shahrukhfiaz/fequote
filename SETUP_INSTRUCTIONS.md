# Setup Instructions for Insurance Toolkits Scraper

## Overview

The Insurance Toolkits scraper is now integrated into your Final Expense Quotes API. However, you need to customize the scraper with the actual form selectors from insurancetoolkits.com.

## Step-by-Step Setup

### 1. Install Dependencies Locally

```bash
npm install
```

### 2. Inspect Insurance Toolkits Website

You need to find the actual CSS selectors for the quote form. Here's how:

1. **Login to insurancetoolkits.com** manually in your browser
2. **Navigate to the quote page** (find the URL after login)
3. **Open Developer Tools** (F12 or right-click → Inspect)
4. **Inspect each form field** to find the correct selectors

### 3. Update the Scraper Configuration

Open `insuranceToolkitsScraper.js` and update:

#### A. Quote Page URL (Line 8)

```javascript
const QUOTE_URL = "https://insurancetoolkits.com/quote"; // Replace with actual URL
```

To find the quote page URL:
- After logging in, navigate to where you would normally get quotes
- Copy the URL from your browser's address bar

#### B. Form Field Selectors (Lines 75-115)

Update each selector to match the actual form fields. Here's how to find them:

**Example: Face Amount Field**

1. Right-click on the face amount input field → Inspect
2. Look for attributes like `name`, `id`, or `class`
3. Update the selector in the code

```javascript
// Example if the field has name="coverageAmount":
await page.type('input[name="coverageAmount"]', String(normalizedRequest.faceAmount));

// Example if the field has id="faceAmt":
await page.type('#faceAmt', String(normalizedRequest.faceAmount));

// Example if the field has class="amount-input":
await page.type('.amount-input', String(normalizedRequest.faceAmount));
```

**Common Selectors to Update:**

```javascript
// Face Amount
await page.type('input[name="YOUR_FIELD_NAME"]', String(normalizedRequest.faceAmount));

// Coverage Type (if it's a dropdown/select)
await page.select('select[name="YOUR_FIELD_NAME"]', normalizedRequest.coverageType);

// Sex/Gender
await page.select('select[name="YOUR_FIELD_NAME"]', normalizedRequest.sex);

// State
await page.type('input[name="YOUR_FIELD_NAME"]', normalizedRequest.state);

// Date of Birth fields
await page.type('input[name="YOUR_MONTH_FIELD"]', normalizedRequest.dob.month);
await page.type('input[name="YOUR_DAY_FIELD"]', normalizedRequest.dob.day);
await page.type('input[name="YOUR_YEAR_FIELD"]', normalizedRequest.dob.year);

// Height
await page.type('input[name="YOUR_FEET_FIELD"]', String(normalizedRequest.heightWeight.feet));
await page.type('input[name="YOUR_INCHES_FIELD"]', String(normalizedRequest.heightWeight.inches));

// Weight
await page.type('input[name="YOUR_WEIGHT_FIELD"]', String(normalizedRequest.heightWeight.weight));

// Tobacco Use
await page.select('select[name="YOUR_FIELD_NAME"]', normalizedRequest.tobaccoUse);
```

#### C. Submit Button Selector (Line 118)

Find the submit button selector:

```javascript
// If button has type="submit":
page.click('button[type="submit"]')

// If button has a specific class:
page.click('.submit-button')

// If button has an id:
page.click('#submitQuote')
```

#### D. Results Page Selectors (Lines 123-155)

After submitting the form, you need to extract the quotes from the results page.

1. **Wait for results selector** (Line 123)
   ```javascript
   // Update this to match an element that appears when results load
   await page.waitForSelector('.quote-results', { timeout: 30000 });
   ```

2. **Quote card/result selectors** (Lines 127-155)
   
   Find what wraps each individual quote result:
   ```javascript
   // Update this to match the container for each quote
   const quoteElements = document.querySelectorAll('.quote-card, .quote-result, .insurance-quote');
   ```

3. **Individual field selectors within each quote:**
   ```javascript
   // Provider/Carrier name
   const provider = element.querySelector('.provider-name')?.textContent?.trim();
   
   // Product/Plan name
   const productName = element.querySelector('.product-name')?.textContent?.trim();
   
   // Monthly premium amount
   const monthlyPremium = element.querySelector('.monthly-premium')?.textContent?.trim();
   
   // Face amount
   const faceAmount = element.querySelector('.face-amount')?.textContent?.trim();
   
   // Coverage type
   const coverageType = element.querySelector('.coverage-type')?.textContent?.trim();
   ```

### 4. Create Local .env File

Create a `.env` file in the project root:

```bash
# Copy the example
cp .env.example .env
```

Edit `.env` with your credentials:

```env
PORT=3000

# Insurance Toolkits
INSURANCE_TOOLKITS_ENABLED=true
INSURANCE_TOOLKITS_EMAIL=your-email@insurancetoolkits.com
INSURANCE_TOOLKITS_PASSWORD=your-password

# Disable other providers for now
PROVIDER_A_ENABLED=false
PROVIDER_B_ENABLED=false

# Keep mock provider for comparison
MOCK_PROVIDER_ENABLED=true
```

### 5. Test Locally

Start the server:

```bash
npm run dev
```

Test with a POST request:

```bash
curl -X POST http://localhost:3000/quote \
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

Or use Postman/Insomnia with the same JSON payload.

### 6. Debug Common Issues

**Issue: "Cannot find element"**
- The selector is wrong or the page structure changed
- Open the browser in non-headless mode to see what's happening:
  ```javascript
  // In insuranceToolkitsScraper.js, change line 23:
  headless: false, // Set to false to see the browser
  ```

**Issue: "Timeout waiting for selector"**
- The page is taking longer to load
- Increase timeout values
- Check if you're logged in correctly

**Issue: "Login fails"**
- Double-check credentials in .env
- Verify the login form selectors on lines 54-61

**Issue: "No quotes found"**
- The results page selectors are wrong
- Use browser developer tools to inspect the results page structure

### 7. Deploy to Railway

Once testing works locally:

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add Insurance Toolkits scraper"
   git push
   ```

2. **Configure Railway Environment Variables:**
   - Go to your Railway project dashboard
   - Add the same environment variables from your `.env` file
   - **Important:** Railway automatically installs Chrome for Puppeteer

3. **Deploy:**
   - Railway will auto-deploy when you push to GitHub
   - Check logs for any errors

### 8. Monitor in Production

Check Railway logs to see:
- If login is successful
- If quotes are being scraped correctly
- Any timeout or error messages

## Advanced Customization

### Handling Different Coverage Types

If Insurance Toolkits has different forms for different coverage types:

```javascript
// Add conditional logic based on coverage type
if (normalizedRequest.coverageType === "Level") {
  await page.click('#levelCoverage');
} else if (normalizedRequest.coverageType === "Guaranteed") {
  await page.click('#guaranteedCoverage');
}
```

### Handling Conditional Fields

Some fields might only appear based on previous selections:

```javascript
// Wait for field to appear before filling it
if (normalizedRequest.tobaccoUse) {
  await page.waitForSelector('select[name="tobacco"]', { timeout: 5000 });
  await page.select('select[name="tobacco"]', normalizedRequest.tobaccoUse);
}
```

### Session Management

The scraper maintains a browser session for 30 minutes. To adjust:

```javascript
// Line 11 in insuranceToolkitsScraper.js
const SESSION_TIMEOUT = 30 * 60 * 1000; // Change to desired milliseconds
```

## Need Help?

If you get stuck:

1. Check the console logs - they show what's happening
2. Run in non-headless mode (see debug tips above)
3. Use screenshots to debug:
   ```javascript
   await page.screenshot({ path: 'debug.png', fullPage: true });
   ```

## Troubleshooting Checklist

- [ ] Updated `QUOTE_URL` with actual quote page URL
- [ ] Updated all form field selectors
- [ ] Updated submit button selector
- [ ] Updated results page wait selector
- [ ] Updated quote card/container selector
- [ ] Updated individual field selectors within quotes
- [ ] Set correct credentials in .env
- [ ] Tested login manually on insurancetoolkits.com
- [ ] Tested locally with curl/Postman
- [ ] Verified quotes are returned correctly
- [ ] Added environment variables to Railway
- [ ] Deployed and checked Railway logs


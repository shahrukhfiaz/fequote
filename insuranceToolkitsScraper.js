// insuranceToolkitsScraper.js
import puppeteer from "puppeteer";
import dotenv from "dotenv";

dotenv.config();

const LOGIN_URL = "https://insurancetoolkits.com/login";
const QUOTE_URL = "https://app.insurancetoolkits.com/fex/quoter";

// Persistent session management
let browserInstance = null;
let pageInstance = null;
let isLoggedIn = false;
let lastActivityTime = null;
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours - reuse session for a day

/**
 * Initialize browser and keep it running
 */
async function initBrowser() {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  console.log("🚀 Launching persistent browser instance...");
  browserInstance = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });

  // Keep a persistent page open
  const pages = await browserInstance.pages();
  pageInstance = pages[0] || (await browserInstance.newPage());

  console.log("✅ Browser instance ready");
  return browserInstance;
}

/**
 * Login to Insurance Toolkits (only once)
 */
async function ensureLoggedIn() {
  const email = process.env.INSURANCE_TOOLKITS_EMAIL;
  const password = process.env.INSURANCE_TOOLKITS_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "INSURANCE_TOOLKITS_EMAIL and INSURANCE_TOOLKITS_PASSWORD must be set in environment variables"
    );
  }

  // Check if session is still valid
  if (isLoggedIn && lastActivityTime) {
    const timeSinceLastActivity = Date.now() - lastActivityTime;
    if (timeSinceLastActivity < SESSION_TIMEOUT) {
      console.log("✅ Using existing session (logged in)");
      return;
    }
    console.log("⏰ Session expired, re-logging in...");
    isLoggedIn = false;
  }

  await initBrowser();

  console.log("🔐 Logging in to Insurance Toolkits...");
  await pageInstance.goto(LOGIN_URL, { waitUntil: "networkidle2", timeout: 30000 });

  // Fill in login form
  await pageInstance.waitForSelector('input[name="email"]', { timeout: 10000 });
  await pageInstance.type('input[name="email"]', email, { delay: 50 });
  await pageInstance.type('input[name="password"]', password, { delay: 50 });

  // Click submit and wait for navigation
  await Promise.all([
    pageInstance.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }),
    pageInstance.click('button[type="submit"]'),
  ]);

  console.log("✅ Login successful - session established");
  isLoggedIn = true;
  lastActivityTime = Date.now();
}

/**
 * Clear a form field before typing
 */
async function clearAndType(selector, value, delayMs = 0) {
  await pageInstance.waitForSelector(selector, { timeout: 10000 });
  await pageInstance.click(selector, { clickCount: 3 }); // Select all
  await pageInstance.keyboard.press("Backspace");
  await pageInstance.type(selector, value, { delay: delayMs });
}

/**
 * Get a quote from Insurance Toolkits using persistent session
 */
export async function getInsuranceToolkitsQuote(normalizedRequest) {
  if (process.env.INSURANCE_TOOLKITS_ENABLED !== "true") {
    return null;
  }

  try {
    // Ensure we're logged in (reuses session if already logged in)
    await ensureLoggedIn();

    console.log("📝 Navigating to quote page...");
    await pageInstance.goto(QUOTE_URL, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for form to be ready
    await pageInstance.waitForSelector('input[formcontrolname="faceAmount"]', { timeout: 10000 });

    console.log("📋 Filling quote form...");

    // Face Amount or Premium
    if (normalizedRequest.faceAmount) {
      await clearAndType('input[formcontrolname="faceAmount"]', String(normalizedRequest.faceAmount));
    }

    if (normalizedRequest.premium) {
      await clearAndType('input[formcontrolname="premium"]', String(normalizedRequest.premium));
    }

    // Coverage Type
    if (normalizedRequest.coverageType) {
      await pageInstance.select(
        'itk-coverage-type-select[formcontrolname="coverageType"] select',
        normalizedRequest.coverageType
      );
    }

    // Sex - click the appropriate button
    if (normalizedRequest.sex) {
      const sexButtonSelector = normalizedRequest.sex === "Male"
        ? 'itk-sex-picker button:first-child'
        : 'itk-sex-picker button:nth-child(2)';
      await pageInstance.click(sexButtonSelector);
    }

    // State
    if (normalizedRequest.state) {
      await pageInstance.select(
        'itk-state-select[formcontrolname="state"] select',
        normalizedRequest.state
      );
    }

    // Date of Birth or Age
    if (normalizedRequest.dob) {
      await clearAndType('input[formcontrolname="month"]', normalizedRequest.dob.month);
      await clearAndType('input[formcontrolname="day"]', normalizedRequest.dob.day);
      await clearAndType('input[formcontrolname="year"]', normalizedRequest.dob.year);
    } else if (normalizedRequest.age) {
      await clearAndType('input[formcontrolname="age"]', String(normalizedRequest.age));
    }

    // Height and Weight (optional)
    if (normalizedRequest.heightWeight?.feet) {
      await clearAndType('input[formcontrolname="feet"]', String(normalizedRequest.heightWeight.feet));
    }
    if (normalizedRequest.heightWeight?.inches) {
      await clearAndType('input[formcontrolname="inches"]', String(normalizedRequest.heightWeight.inches));
    }
    if (normalizedRequest.heightWeight?.weight) {
      await clearAndType('input[formcontrolname="weight"]', String(normalizedRequest.heightWeight.weight));
    }

    // Nicotine/Tobacco Use
    if (normalizedRequest.tobaccoUse) {
      await pageInstance.select(
        'itk-nicotine-select[formcontrolname="tobacco"] select',
        normalizedRequest.tobaccoUse
      );
    }

    // Payment Type
    if (normalizedRequest.paymentType) {
      await pageInstance.select(
        'itk-payment-type-select[formcontrolname="paymentType"] select',
        normalizedRequest.paymentType
      );
    }

    // Health Conditions (optional)
    if (normalizedRequest.conditions && normalizedRequest.conditions.length > 0) {
      const conditionSelector = 'input[placeholder="Enter Health Condition / Personal History"]';
      for (const condition of normalizedRequest.conditions) {
        await pageInstance.type(conditionSelector, condition);
        await pageInstance.keyboard.press("Enter");
        await pageInstance.waitForTimeout(500);
      }
    }

    // Medications (optional)
    if (normalizedRequest.medications && normalizedRequest.medications.length > 0) {
      const medicationSelector = 'input[placeholder="Enter Medication"]';
      for (const medication of normalizedRequest.medications) {
        await pageInstance.type(medicationSelector, medication);
        await pageInstance.keyboard.press("Enter");
        await pageInstance.waitForTimeout(500);
      }
    }

    console.log("🚀 Submitting form...");
    
    // Click "Get Quote" button
    await Promise.all([
      pageInstance.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
      pageInstance.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const getQuoteButton = buttons.find(btn => btn.textContent.trim().includes('Get Quote'));
        if (getQuoteButton) getQuoteButton.click();
      }),
    ]);

    // Wait for results to load - adjust this selector based on actual results page
    console.log("⏳ Waiting for results...");
    await pageInstance.waitForTimeout(3000); // Give time for results to render

    // Extract quote data from results page
    console.log("📊 Extracting quotes...");
    const quotes = await pageInstance.evaluate(() => {
      const results = [];
      
      // Try multiple possible selectors for quote results
      const quoteElements = document.querySelectorAll(
        '.quote-result, .quote-card, [class*="quote"], [class*="carrier"], [class*="product"]'
      );

      // If we found specific quote elements
      if (quoteElements.length > 0) {
        quoteElements.forEach((element) => {
          // Extract text content and look for patterns
          const text = element.textContent || '';
          
          // Try to find provider/carrier name
          const providerElement = element.querySelector('[class*="provider"], [class*="carrier"], [class*="company"]');
          const provider = providerElement?.textContent?.trim() || 'Unknown';
          
          // Try to find product name
          const productElement = element.querySelector('[class*="product"], [class*="plan"], [class*="name"]');
          const productName = productElement?.textContent?.trim() || 'Unknown Plan';
          
          // Try to find premium amount
          const premiumElement = element.querySelector('[class*="premium"], [class*="price"], [class*="cost"]');
          const premiumText = premiumElement?.textContent?.trim() || '';
          const premiumMatch = premiumText.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
          const monthlyPremium = premiumMatch ? parseFloat(premiumMatch[1].replace(/,/g, '')) : null;
          
          // Try to find face amount
          const faceElement = element.querySelector('[class*="face"], [class*="coverage"], [class*="amount"]');
          const faceText = faceElement?.textContent?.trim() || '';
          const faceMatch = faceText.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
          const faceAmount = faceMatch ? parseFloat(faceMatch[1].replace(/,/g, '')) : null;

          if (provider !== 'Unknown' || monthlyPremium !== null) {
            results.push({
              provider,
              productName,
              coverageType: null,
              monthlyPremium,
              faceAmount,
              underwritingType: null,
              issueAgeRange: null,
            });
          }
        });
      }

      // If no structured results found, try to extract from table or list
      if (results.length === 0) {
        const rows = document.querySelectorAll('tr, .list-item, [class*="row"]');
        rows.forEach((row) => {
          const cells = row.querySelectorAll('td, div, span');
          if (cells.length >= 2) {
            const allText = Array.from(cells).map(c => c.textContent.trim()).join(' ');
            const premiumMatch = allText.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
            
            if (premiumMatch) {
              results.push({
                provider: cells[0]?.textContent?.trim() || 'Unknown',
                productName: cells[1]?.textContent?.trim() || 'Unknown Plan',
                coverageType: null,
                monthlyPremium: parseFloat(premiumMatch[1].replace(/,/g, '')),
                faceAmount: null,
                underwritingType: null,
                issueAgeRange: null,
              });
            }
          }
        });
      }

      return results;
    });

    // Update last activity time
    lastActivityTime = Date.now();

    if (quotes.length > 0) {
      console.log(`✅ Found ${quotes.length} quote(s) from Insurance Toolkits`);
      return quotes;
    } else {
      console.log("⚠️ No quotes found on results page");
      return [{
        provider: "InsuranceToolkits",
        error: true,
        errorMessage: "No quotes found on results page - form may have validation errors or no carriers available",
      }];
    }

  } catch (err) {
    console.error("❌ Error scraping Insurance Toolkits:", err.message);
    
    // If session error, mark as not logged in so it will retry
    if (err.message.includes("Session") || err.message.includes("login")) {
      isLoggedIn = false;
    }

    return {
      provider: "InsuranceToolkits",
      error: true,
      errorMessage: err.message,
    };
  }
}

/**
 * Get session status
 */
export function getSessionStatus() {
  return {
    isLoggedIn,
    browserConnected: browserInstance?.connected || false,
    lastActivityTime: lastActivityTime ? new Date(lastActivityTime).toISOString() : null,
    sessionAge: lastActivityTime ? Math.floor((Date.now() - lastActivityTime) / 1000 / 60) : null, // minutes
  };
}

/**
 * Force re-login (useful for debugging or session refresh)
 */
export async function forceRelogin() {
  isLoggedIn = false;
  lastActivityTime = null;
  await ensureLoggedIn();
}

/**
 * Close browser (for graceful shutdown)
 */
export async function closeBrowser() {
  console.log("🛑 Closing browser instance...");
  if (pageInstance) {
    await pageInstance.close().catch(() => {});
    pageInstance = null;
  }
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
  isLoggedIn = false;
  lastActivityTime = null;
  console.log("✅ Browser closed");
}

// Cleanup on process exit
process.on("SIGINT", async () => {
  await closeBrowser();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeBrowser();
  process.exit(0);
});

// Keep process alive and log session status periodically (optional)
if (process.env.INSURANCE_TOOLKITS_ENABLED === "true") {
  setInterval(() => {
    const status = getSessionStatus();
    if (status.isLoggedIn) {
      console.log(`💚 Session active - ${status.sessionAge} minutes old`);
    }
  }, 5 * 60 * 1000); // Log every 5 minutes
}

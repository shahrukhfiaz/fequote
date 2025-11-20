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
  
  const launchOptions = {
    headless: "new", // Headless mode for production (set to false for debugging)
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-blink-features=AutomationControlled",
    ],
  };

  browserInstance = await puppeteer.launch(launchOptions);

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
  await pageInstance.goto(LOGIN_URL, { waitUntil: "networkidle2", timeout: 90000 });

  // Fill in login form
  await pageInstance.waitForSelector('input[name="email"]', { timeout: 10000 });
  await pageInstance.type('input[name="email"]', email, { delay: 50 });
  await pageInstance.type('input[name="password"]', password, { delay: 50 });

  // Click submit and wait for navigation
  await Promise.all([
    pageInstance.waitForNavigation({ waitUntil: "networkidle2", timeout: 90000 }),
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
    await pageInstance.goto(QUOTE_URL, { waitUntil: "networkidle2", timeout: 90000 });

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
    
    // Click "Get Quote" button (don't wait for full navigation)
    await pageInstance.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const getQuoteButton = buttons.find(btn => btn.textContent.trim().includes('Get Quote'));
      if (getQuoteButton) getQuoteButton.click();
    });

    // Wait for results to load (wait for quote panels to appear)
    console.log("⏳ Waiting for quote results to appear...");
    await pageInstance.waitForSelector('itk-included-quote-panel', { timeout: 60000 });
    
    // Give it a moment for all quotes to fully render
    console.log("⏳ Waiting for all quotes to render...");
    await pageInstance.waitForTimeout(3000);

    // Extract quote data from results page
    console.log("📊 Extracting quotes...");
    const quotes = await pageInstance.evaluate(() => {
      const results = [];
      
      // Find all quote panels
      const quotePanels = document.querySelectorAll('itk-included-quote-panel');
      
      quotePanels.forEach((panel) => {
        try {
          // Extract company name from image src
          const img = panel.querySelector('img');
          let provider = 'Unknown';
          if (img && img.src) {
            const src = img.src.toLowerCase();
            // Map common image filenames to proper company names
            if (src.includes('aflac')) provider = 'Aflac';
            else if (src.includes('moo')) provider = 'Mutual of Omaha';
            else if (src.includes('ahl')) provider = 'American Home Life';
            else if (src.includes('securio')) provider = 'Securico';
            else if (src.includes('transam')) provider = 'Transamerica';
            else if (src.includes('security_national')) provider = 'Security National';
            else if (src.includes('gtl')) provider = 'Guarantee Trust Life';
            else if (src.includes('aig')) provider = 'AIG';
            else if (src.includes('foresters')) provider = 'Foresters';
            else if (src.includes('americo')) provider = 'Americo';
            else if (src.includes('prosperity')) provider = 'Prosperity';
            else {
              // Fallback: try to extract and format from filename
              const srcMatch = img.src.match(/\/([^\/]+)\.(png|jpg|jpeg)/i);
              if (srcMatch) {
                provider = srcMatch[1]
                  .replace(/_/g, ' ')
                  .replace(/-/g, ' ')
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
              }
            }
          }
          
          // Extract from desktop section
          const desktopSection = panel.querySelector('.top-section-desktop');
          const bottomSection = panel.querySelector('.bottom-section-desktop');
          const mobileSection = panel.querySelector('.mobile .info');
          
          let monthlyPremium = null;
          let annualPremium = null;
          let coverageType = null;
          let compensationInfo = null;
          let planInfo = null;
          
          if (desktopSection) {
            const divs = desktopSection.querySelectorAll('div');
            
            // Find monthly premium (format: $XX.XX)
            for (let div of divs) {
              const text = div.textContent?.trim();
              if (text && text.match(/^\$\d+\.\d{2}$/)) {
                monthlyPremium = parseFloat(text.replace('$', ''));
                break;
              }
            }
            
            // Find coverage type
            for (let div of divs) {
              const text = div.textContent?.trim();
              if (text && (
                text.includes('Level') || 
                text.includes('Preferred') || 
                text.includes('Standard') ||
                text.includes('Graded') ||
                text.includes('Guaranteed') ||
                text.includes('Select') ||
                text.includes('Express') ||
                text.includes('Modified')
              ) && text.length < 50) {
                coverageType = text;
                break;
              }
            }
            
            // Extract compensation info (green $ icon)
            // Look in the entire panel for compensation info
            const compensationIcon = panel.querySelector('svg-icon[key="attach-money"]');
            if (compensationIcon) {
              // Try to find associated text - it might be in a sibling or parent's sibling
              let current = compensationIcon.parentElement;
              while (current && current !== panel) {
                if (current.nextElementSibling && current.nextElementSibling.textContent) {
                  const text = current.nextElementSibling.textContent.trim();
                  if (text.length > 10 && (text.includes('commission') || text.includes('cut') || text.includes('%'))) {
                    compensationInfo = text;
                    break;
                  }
                }
                current = current.parentElement;
              }
            }
            
            // Extract plan info from mobile section (more reliable)
            const mobileSectionInfo = panel.querySelector('.mobile .info');
            if (mobileSectionInfo) {
              const spans = mobileSectionInfo.querySelectorAll('span');
              let foundYearInfo = false;
              const yearDetails = [];
              
              for (let span of spans) {
                const text = span.textContent?.trim();
                // Look for year-based coverage info
                if (text && (text.startsWith('Year') || text.startsWith('Years') || text.includes('ROP'))) {
                  yearDetails.push(text);
                  foundYearInfo = true;
                } else if (foundYearInfo && text && text.includes('face amount')) {
                  yearDetails.push(text);
                } else if (foundYearInfo && yearDetails.length > 0 && (!text || text.length > 50)) {
                  // Stop if we hit something that's not part of the year details
                  break;
                }
              }
              
              if (yearDetails.length > 0) {
                planInfo = yearDetails.join(' | ');
              }
            }
          }
          
          // Extract annual premium from bottom section or mobile section
          if (bottomSection) {
            const annualText = bottomSection.textContent || '';
            const annualMatch = annualText.match(/Annual Rate:\s*\$?([\d,]+\.?\d*)/i);
            if (annualMatch) {
              annualPremium = parseFloat(annualMatch[1].replace(/,/g, ''));
            }
          } else if (mobileSection) {
            // Fallback to mobile section if desktop not available
            const spans = mobileSection.querySelectorAll('span');
            for (let i = 0; i < spans.length; i++) {
              const text = spans[i].textContent?.trim();
              if (text === 'Annual') {
                const valueSpan = spans[i + 1];
                if (valueSpan) {
                  const annualText = valueSpan.textContent?.trim();
                  const match = annualText?.match(/\$?([\d,]+\.?\d*)/);
                  if (match) {
                    annualPremium = parseFloat(match[1].replace(/,/g, ''));
                  }
                }
                break;
              }
            }
          }
          
          if (monthlyPremium !== null) {
            results.push({
              provider,
              productName: coverageType || 'Unknown Plan',
              coverageType,
              monthlyPremium,
              annualPremium,
              faceAmount: null,
              underwritingType: null,
              issueAgeRange: null,
              compensationInfo,
              planInfo,
            });
          }
        } catch (err) {
          console.error('Error parsing quote panel:', err);
        }
      });

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

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getQuoteFromProviderA, getQuoteFromProviderB } from './src/providers.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Simple health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Final Expense Quotes API running' });
});

app.post('/get-quotes', async (req, res) => {
  try {
    const input = req.body;

    // Basic validation
    if (!input.coverageType || !input.sex || !input.state) {
      return res.status(400).json({
        error: 'Missing required fields: coverageType, sex, state'
      });
    }

    if (!input.faceAmount && !input.premium) {
      return res.status(400).json({
        error: 'You must provide at least faceAmount or premium'
      });
    }

    if (!input.age && !input.birthday) {
      return res.status(400).json({
        error: 'You must provide either age or birthday'
      });
    }

    const payload = {
      faceAmount: input.faceAmount ? Number(input.faceAmount) : null,
      premium: input.premium ? Number(input.premium) : null,
      coverageType: input.coverageType,
      sex: input.sex,
      state: input.state,

      age: input.age ? Number(input.age) : null,
      birthday: input.birthday || null, // { month, day, year }

      heightWeight: input.heightWeight || null,
      tobacco: input.tobacco || 'None',
      paymentType: input.paymentType || 'Bank Draft/EFT',

      healthConditions: Array.isArray(input.healthConditions)
        ? input.healthConditions
        : (input.healthConditions ? [input.healthConditions] : []),

      medications: Array.isArray(input.medications)
        ? input.medications
        : (input.medications ? [input.medications] : [])
    };

    // Call multiple providers in parallel
    const [providerA, providerB] = await Promise.allSettled([
      getQuoteFromProviderA(payload),
      getQuoteFromProviderB(payload)
    ]);

    const quotes = [];
    if (providerA.status === 'fulfilled' && providerA.value) quotes.push(providerA.value);
    if (providerB.status === 'fulfilled' && providerB.value) quotes.push(providerB.value);

    if (!quotes.length) {
      return res.status(502).json({ error: 'No quotes returned from providers.' });
    }

    res.json({ quotes });
  } catch (err) {
    console.error('Error in /get-quotes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import axios from 'axios';

// This is where you map to real carrier / quote engine APIs.
// Right now it just returns mock data so you can test with n8n and Railway.

export async function getQuoteFromProviderA(payload) {
  // Example: here you would map payload → Provider A API body
  // const response = await axios.post(process.env.PROVIDER_A_URL, { ...mapped });
  // return response.data;

  return {
    provider: 'Provider A',
    planName: 'Level Benefit Plan',
    coverageType: payload.coverageType,
    faceAmount: payload.faceAmount || 10000,
    monthlyPremium: 52.34,
    notes: 'Mock quote from Provider A'
  };
}

export async function getQuoteFromProviderB(payload) {
  // Same idea here for Provider B
  // const response = await axios.post(process.env.PROVIDER_B_URL, { ...mapped });
  // return response.data;

  return {
    provider: 'Provider B',
    planName: 'Graded Benefit Plan',
    coverageType: payload.coverageType,
    faceAmount: payload.faceAmount || 8000,
    monthlyPremium: 47.20,
    notes: 'Mock quote from Provider B'
  };
}

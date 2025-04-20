import axios from 'axios';

// Create an Axios instance with the base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
export const getAssets = async () => {
  try {
    const response = await api.get('/assets');
    return response.data;
  } catch (error) {
    console.error('Error fetching assets:', error);
    throw error;
  }
};

export const getTestForAsset = async (assetSymbol) => {
  try {
    const response = await api.get(`/test/${assetSymbol}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching test for ${assetSymbol}:`, error);
    throw error;
  }
};

export const submitTestAnswers = async (assetSymbol, sessionId, answers) => {
  try {
    const response = await api.post(`/test/${assetSymbol}?session_id=${sessionId}`, answers);
    return response.data;
  } catch (error) {
    console.error(`Error submitting test answers for ${assetSymbol}:`, error);
    throw error;
  }
};

export default api;
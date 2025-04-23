import axios from 'axios';

// Create an Axios instance with the base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log request for debugging
api.interceptors.request.use(request => {
  console.log('API Request:', request.method.toUpperCase(), request.baseURL + request.url);
  return request;
});

// Log response for debugging
api.interceptors.response.use(
  response => {
    console.log('API Response:', response.status, response.config.url, response.data);
    return response;
  },
  error => {
    console.error('API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return Promise.reject(error);
  }
);

// API functions
export const getAssets = async () => {
  try {
    console.log('Fetching assets from:', api.defaults.baseURL + '/assets');
    const response = await api.get('/assets');
    
    if (!response.data) {
      console.error('Empty response data from assets endpoint');
      return [];
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching assets:', error);
    // Return empty array on error so application doesn't crash
    return [];
  }
};

// Get a random asset from available assets
export const getRandomAsset = async () => {
  try {
    const assets = await getAssets();
    // Combine crypto and equity assets
    const allAssets = [
      ...(assets.crypto || []),
      ...(assets.equity || [])
    ];
    
    if (allAssets.length === 0) {
      throw new Error('No assets available');
    }
    
    // Pick a random asset
    const randomIndex = Math.floor(Math.random() * allAssets.length);
    return allAssets[randomIndex];
  } catch (error) {
    console.error('Error getting random asset:', error);
    throw error;
  }
};

// Get a test with random questions from different assets
export const getRandomCrossAssetTest = async (timeframe = 'random', sessionId = null) => {
  try {
    let url = '/test/random';
    const params = {};
    
    // Add timeframe parameter if specified
    if (timeframe) {
      params.timeframe = timeframe;
    }
    
    // Add session ID for retakes if provided
    if (sessionId) {
      params.session_id = sessionId;
    }
    
    const response = await api.get(url, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching random cross-asset test:', error);
    throw error;
  }
};

export const getTestForAsset = async (assetSymbol, timeframe = 'random', sessionId = null) => {
  try {
    let url = `/test/${assetSymbol}`;
    const params = {};
    
    // Add timeframe parameter if specified
    if (timeframe) {
      params.timeframe = timeframe;
    }
    
    // Add session ID for retakes if provided
    if (sessionId) {
      params.session_id = sessionId;
    }
    
    const response = await api.get(url, { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching test for ${assetSymbol}:`, error);
    throw error;
  }
};

export const submitTestAnswers = async (assetSymbol, sessionId, answers) => {
  try {
    console.log(`Submitting answers for ${assetSymbol} with session ${sessionId}:`, answers);
    const response = await api.post(`/test/${assetSymbol}?session_id=${sessionId}`, answers);
    console.log('Submission response:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error submitting test answers for ${assetSymbol}:`, error);
    throw error;
  }
};

export default api;
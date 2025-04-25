import axios from 'axios';

// Determine base URL based on environment
const isProduction = process.env.NODE_ENV === 'production';
const baseURL = isProduction ? '/api' : 'http://localhost:8000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for adding authentication token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle unauthorized errors
    if (error.response && error.response.status === 401) {
      // Redirect to login or clear token
      localStorage.removeItem('token');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Export the getAssets function
export const getAssets = async () => {
  try {
    const response = await api.get('/assets');
    return response.data;
  } catch (error) {
    console.error('Error fetching assets:', error);
    throw error;
  }
};

// Export the getRandomCrossAssetTest function
export const getRandomCrossAssetTest = async (timeframe) => {
  try {
    const response = await api.get(`/charting_exams/random?timeframe=${timeframe}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching random cross-asset test:', error);
    throw error;
  }
};

// Export the getTestForAsset function
export const getTestForAsset = async (assetSymbol, timeframe) => {
  try {
    const response = await api.get(`/test/${assetSymbol}?timeframe=${timeframe}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching test for asset ${assetSymbol}:`, error);
    throw error;
  }
};

// Export the submitTestAnswers function
export const submitTestAnswers = async (assetSymbol, sessionId, answers) => {
  try {
    const response = await api.post(`/test/${assetSymbol}`, answers, {
      params: { session_id: sessionId }
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting test answers:', error);
    throw error;
  }
};

// Charting exam API functions - use correct backend endpoint patterns with underscore
export const getChartingExamInfo = async (examType) => {
  try {
    const response = await api.get(`/charting_exam/${examType}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching charting exam info for ${examType}:`, error);
    throw error;
  }
};

export const getPracticeChart = async (examType, section = '', chartNum = 1) => {
  try {
    let url = `/charting_exam/${examType}/practice`;
    const params = new URLSearchParams();
    if (section) params.append('section', section);
    if (chartNum) params.append('chart_num', chartNum);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching practice chart for ${examType}:`, error);
    throw error;
  }
};

export const getNextChart = async (examType, section = '', chartCount = 1) => {
  try {
    const params = {
      exam_type: examType,
      section: section,
      chart_count: chartCount
    };
    
    const response = await api.get('/charting_exam/next_chart', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching next chart:', error);
    throw error;
  }
};

export const validateChartingExam = async (examType, data) => {
  try {
    const response = await api.post(`/charting_exam/${examType}/validate`, data);
    return response.data;
  } catch (error) {
    console.error('Error validating charting exam:', error);
    throw error;
  }
};

// API wrapper methods
export default {
  // Auth endpoints
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  
  // User endpoints
  getCurrentUser: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/profile', data),
  
  // Charting exam endpoints - Ensure consistent naming with backend
  getExams: () => api.get('/charting_exams'),
  getExamDetails: (examId) => api.get(`/charting_exams/${examId}`),
  getChartingExamInfo: (examType) => api.get(`/charting_exam/${examType}`),
  getPracticeChart: (examType, section, chartNum) => {
    let url = `/charting_exam/${examType}/practice`;
    const params = new URLSearchParams();
    if (section) params.append('section', section);
    if (chartNum) params.append('chart_num', chartNum);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return api.get(url);
  },
  getNextChart: (params) => api.get('/charting_exam/next_chart', { params }),
  validateChartingExam: (examType, data) => api.post(`/charting_exam/${examType}/validate`, data),
  get: (endpoint) => api.get(endpoint),
  post: (endpoint, data) => api.post(endpoint, data),
  put: (endpoint, data) => api.put(endpoint, data),
  delete: (endpoint) => api.delete(endpoint)
};
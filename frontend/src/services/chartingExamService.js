/**
 * Service for Charting Exam APIs
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

/**
 * Get all available charting exam types
 */
export const getChartingExams = async () => {
  try {
    const response = await fetch(`${API_URL}/charting_exams`);
    if (!response.ok) {
      throw new Error(`Error fetching exam types: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch charting exams:', error);
    throw error;
  }
};

/**
 * Get information about a specific exam type
 * @param {string} examType - The exam type identifier
 */
export const getExamInfo = async (examType) => {
  try {
    const response = await fetch(`${API_URL}/charting_exam/${examType}`);
    if (!response.ok) {
      throw new Error(`Error fetching exam info: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch exam info for ${examType}:`, error);
    throw error;
  }
};

/**
 * Get a chart for practice in a specific exam section
 * @param {string} examType - The exam type identifier
 * @param {string} section - The exam section
 * @param {number} chartNum - The chart number (1-5)
 */
export const getPracticeChart = async (examType, section, chartNum = 1) => {
  try {
    const response = await fetch(
      `${API_URL}/charting_exam/${examType}/practice?section=${section}&chart_num=${chartNum}`
    );
    if (!response.ok) {
      throw new Error(`Error fetching practice chart: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch practice chart:', error);
    throw error;
  }
};

/**
 * Validate the user's answers for a chart
 * @param {string} examType - The exam type identifier
 * @param {object} data - The user's drawing data and answers
 */
export const validateAnswers = async (examType, data) => {
  try {
    const response = await fetch(`${API_URL}/charting_exam/${examType}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Error validating answers: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to validate answers:', error);
    throw error;
  }
}; 
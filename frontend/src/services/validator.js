/**
 * Validator service for charting exams
 */

// Helper function to validate swing points
const validateSwingPoints = (drawings, chartData) => {
  const result = {
    score: 0,
    feedback: 'Swing point analysis validation completed.',
    matches: [],
    misses: []
  };
  
  // Mock validation - would connect to backend in a real implementation
  const totalPoints = drawings.length;
  result.score = Math.min(Math.floor(totalPoints * 25), 100);
  
  return result;
};

// Helper function to validate fibonacci retracement
const validateFibonacci = (drawings, chartData) => {
  const result = {
    score: 0,
    feedback: 'Fibonacci retracement validation completed.',
    matches: [],
    misses: []
  };
  
  // Check if high and low points are identified
  const highPoint = drawings.find(d => d.type === 'high');
  const lowPoint = drawings.find(d => d.type === 'low');
  
  if (highPoint && lowPoint) {
    result.score = 80;
    result.feedback = 'You correctly identified the high and low points for the Fibonacci retracement.';
  } else if (highPoint || lowPoint) {
    result.score = 40;
    result.feedback = 'You identified only one of the required points. Fibonacci retracement requires both high and low points.';
  } else {
    result.score = 0;
    result.feedback = 'No valid Fibonacci points identified. Please mark both high and low points.';
  }
  
  return result;
};

// Helper function to validate fair value gaps
const validateFairValueGap = (drawings, chartData) => {
  const result = {
    score: 0,
    feedback: 'Fair Value Gap validation completed.',
    matches: [],
    misses: []
  };
  
  // Count bullish and bearish FVGs
  const bullishFVGs = drawings.filter(d => d.type === 'bullishFVG');
  const bearishFVGs = drawings.filter(d => d.type === 'bearishFVG');
  
  const totalFVGs = bullishFVGs.length + bearishFVGs.length;
  
  if (totalFVGs === 0) {
    result.score = 0;
    result.feedback = 'No Fair Value Gaps identified. Try looking for areas where price moves quickly, creating gaps between candles.';
  } else if (totalFVGs > 0 && totalFVGs <= 5) {
    // Simple scoring logic - in a real app this would validate actual FVG locations
    result.score = Math.min(totalFVGs * 20, 100);
    result.feedback = `You identified ${totalFVGs} Fair Value Gaps. ${bullishFVGs.length} bullish and ${bearishFVGs.length} bearish.`;
  } else {
    result.score = 50;
    result.feedback = 'You identified too many Fair Value Gaps. Focus on the most significant gaps only.';
  }
  
  return result;
};

/**
 * Validate drawings against chart data
 * @param {Array} drawings - Array of drawn elements
 * @param {Object} chartData - Chart data with expected answers
 * @param {string} examType - Type of exam (swing-analysis, fibonacci-retracement, fair-value-gap)
 * @returns {Object} Validation result with score and feedback
 */
export const validateDrawings = (drawings, chartData, examType) => {
  if (!drawings || !chartData) {
    return {
      score: 0,
      feedback: 'No drawings or chart data provided.'
    };
  }
  
  // Choose validation function based on exam type
  switch (examType) {
    case 'swing-analysis':
      return validateSwingPoints(drawings, chartData);
    case 'fibonacci-retracement':
      return validateFibonacci(drawings, chartData);
    case 'fair-value-gap':
      return validateFairValueGap(drawings, chartData);
    default:
      return {
        score: 0,
        feedback: `Validation for ${examType} not implemented yet.`
      };
  }
}; 
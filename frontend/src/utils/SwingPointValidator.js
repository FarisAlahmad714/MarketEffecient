/**
 * Utility class for validating swing points
 */
class SwingPointValidator {
  constructor(options = {}) {
    this.expectedPoints = {
      highs: [],
      lows: []
    };
    this.tolerance = options.tolerance || 0.005; // 0.5% price tolerance
    this.timeTolerance = options.timeTolerance || 7200; // 2 hours in seconds
  }

  /**
   * Set expected points
   * @param {Object} points - Object with highs and lows arrays
   */
  setExpectedPoints(points) {
    if (points && points.highs && points.lows) {
      this.expectedPoints = points;
    }
  }

  /**
   * Detect swing points in price data
   * @param {Array} priceData - Array of OHLC data
   * @param {Number} highLookback - Lookback period for highs
   * @param {Number} lowLookback - Lookback period for lows
   * @returns {Object} Object with highs and lows arrays
   */
  detectSwingPoints(priceData, highLookback = 3, lowLookback = 3) {
    const result = {
      highs: [],
      lows: []
    };

    // Detect major swing points (lookback of 5)
    this._detectPoints(priceData, 5, 5, result, 'major');
    
    // Detect minor swing points
    this._detectPoints(priceData, highLookback, lowLookback, result, 'minor');
    
    // Save as expected points
    this.expectedPoints = result;
    
    return result;
  }

  /**
   * Helper function to detect swing points
   * @private
   */
  _detectPoints(priceData, highLookback, lowLookback, result, significance) {
    // Detect swing highs
    for (let i = highLookback; i < priceData.length - highLookback; i++) {
      let isSwingHigh = true;
      const currentHigh = priceData[i].high;
      
      // Skip if already detected as a major point
      if (significance === 'minor' && result.highs.some(p => p.index === i)) {
        continue;
      }
      
      for (let j = 1; j <= highLookback; j++) {
        if (currentHigh <= priceData[i-j].high || currentHigh <= priceData[i+j].high) {
          isSwingHigh = false;
          break;
        }
      }
      
      if (isSwingHigh) {
        result.highs.push({
          type: 'high',
          price: currentHigh,
          time: priceData[i].time,
          index: i,
          significance: significance
        });
      }
    }
    
    // Detect swing lows
    for (let i = lowLookback; i < priceData.length - lowLookback; i++) {
      let isSwingLow = true;
      const currentLow = priceData[i].low;
      
      // Skip if already detected as a major point
      if (significance === 'minor' && result.lows.some(p => p.index === i)) {
        continue;
      }
      
      for (let j = 1; j <= lowLookback; j++) {
        if (currentLow >= priceData[i-j].low || currentLow >= priceData[i+j].low) {
          isSwingLow = false;
          break;
        }
      }
      
      if (isSwingLow) {
        result.lows.push({
          type: 'low',
          price: currentLow,
          time: priceData[i].time,
          index: i,
          significance: significance
        });
      }
    }
  }

  /**
   * Validate all user drawn points against expected points
   * @param {Array} userPoints - Array of points drawn by user
   * @returns {Object} Validation result with score and feedback
   */
  validateAllPoints(userPoints) {
    const result = {
      score: 0,
      totalExpected: this.expectedPoints.highs.length + this.expectedPoints.lows.length,
      feedback: {
        correct: [],
        incorrect: []
      }
    };

    // Track which expected points have been matched
    const matchedHighs = new Set();
    const matchedLows = new Set();

    // Check each user point against expected points
    userPoints.forEach(point => {
      // Try to match with highs
      let matched = false;
      this.expectedPoints.highs.forEach((expected, index) => {
        if (matchedHighs.has(index)) return; // Skip already matched points
        
        const priceDiff = Math.abs(expected.price - point.price) / expected.price;
        const timeDiff = Math.abs(expected.time - point.time) / 1000; // Convert to seconds
        
        if (priceDiff <= this.tolerance && timeDiff <= this.timeTolerance) {
          matchedHighs.add(index);
          matched = true;
          result.score++;
          result.feedback.correct.push({
            type: 'high',
            significance: expected.significance,
            userPoint: point,
            expectedPoint: expected,
            message: `Good job! You correctly identified a ${expected.significance} swing high at price ${expected.price.toFixed(2)}.`
          });
        }
      });

      // If not matched with highs, try lows
      if (!matched) {
        this.expectedPoints.lows.forEach((expected, index) => {
          if (matchedLows.has(index)) return; // Skip already matched points
          
          const priceDiff = Math.abs(expected.price - point.price) / expected.price;
          const timeDiff = Math.abs(expected.time - point.time) / 1000; // Convert to seconds
          
          if (priceDiff <= this.tolerance && timeDiff <= this.timeTolerance) {
            matchedLows.add(index);
            matched = true;
            result.score++;
            result.feedback.correct.push({
              type: 'low',
              significance: expected.significance,
              userPoint: point,
              expectedPoint: expected,
              message: `Good job! You correctly identified a ${expected.significance} swing low at price ${expected.price.toFixed(2)}.`
            });
          }
        });
      }

      // If still not matched, it's incorrect
      if (!matched) {
        result.feedback.incorrect.push({
          userPoint: point,
          message: `This point at price ${point.price.toFixed(2)} doesn't match any significant swing point.`
        });
      }
    });

    // Record any expected points that were missed
    this.expectedPoints.highs.forEach((expected, index) => {
      if (!matchedHighs.has(index)) {
        result.feedback.incorrect.push({
          type: 'missed_high',
          significance: expected.significance,
          expectedPoint: expected,
          message: `You missed a ${expected.significance} swing high at price ${expected.price.toFixed(2)}.`
        });
      }
    });

    this.expectedPoints.lows.forEach((expected, index) => {
      if (!matchedLows.has(index)) {
        result.feedback.incorrect.push({
          type: 'missed_low',
          significance: expected.significance,
          expectedPoint: expected,
          message: `You missed a ${expected.significance} swing low at price ${expected.price.toFixed(2)}.`
        });
      }
    });

    // Calculate total possible score
    let totalPossible = 0;
    [...this.expectedPoints.highs, ...this.expectedPoints.lows].forEach(point => {
      totalPossible += point.significance === 'major' ? 2 : 1;
    });
    
    result.totalPossiblePoints = totalPossible;
    result.percentage = Math.round((result.score / totalPossible) * 100);

    return result;
  }
}

export default SwingPointValidator; 
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TradingViewChart from './TradingViewChart';
import DrawingTools from './DrawingTools';
import LoadingSpinner from './LoadingSpinner';
import api from '../services/api';
import { validateDrawings } from '../services/validator';
import './ChartingExamPractice.css';

// Mock tutorial content for each exam type
const tutorialContent = {
  'swing_analysis': {
    title: 'Swing Analysis Tutorial',
    content: `
      <h3>Identifying Swing Highs and Lows</h3>
      <p>A swing high is formed when a price peak is higher than surrounding price action and is followed by a reversal.</p>
      <p>A swing low is formed when a price trough is lower than surrounding price action and is followed by a reversal.</p>
      <img src="/charting_exam/images/swing-analysis-example.jpg" alt="Swing Analysis Example" />
      <h4>Key Points:</h4>
      <ul>
        <li>Use the pointer tool to mark swing highs and lows</li>
        <li>Focus on significant price movements, not minor fluctuations</li>
        <li>Consider the overall trend direction when identifying swings</li>
      </ul>
    `
  },
  'fibonacci_retracement': {
    title: 'Fibonacci Retracement Tutorial',
    content: `
      <h3>Applying Fibonacci Retracement</h3>
      <p>Fibonacci retracement is used to identify potential support and resistance levels based on Fibonacci ratios.</p>
      <p>To apply a Fibonacci retracement:</p>
      <ol>
        <li>Identify a significant swing high and swing low</li>
        <li>Mark the swing high using the High tool</li>
        <li>Mark the swing low using the Low tool</li>
      </ol>
      <img src="/charting_exam/images/fibonacci-example.jpg" alt="Fibonacci Example" />
      <h4>Key Levels:</h4>
      <ul>
        <li>23.6%, 38.2%, 50%, 61.8%, and 78.6%</li>
        <li>Look for price reactions at these levels</li>
      </ul>
    `
  },
  'gap_analysis': {
    title: 'Fair Value Gap Analysis Tutorial',
    content: `
      <h3>Identifying Fair Value Gaps (FVGs)</h3>
      <p>A Fair Value Gap is created when price moves aggressively in one direction, leaving an imbalance between buyers and sellers.</p>
      <p>Types of FVGs:</p>
      <ul>
        <li><strong>Bullish FVG:</strong> When price gaps up, creating a void below current price</li>
        <li><strong>Bearish FVG:</strong> When price gaps down, creating a void above current price</li>
      </ul>
      <img src="/charting_exam/images/fvg-example.jpg" alt="FVG Example" />
      <h4>Tips for Identification:</h4>
      <ul>
        <li>Look for three consecutive candles with no overlap</li>
        <li>Use the bullish or bearish FVG tool to mark the gap</li>
        <li>FVGs often act as magnets for price to return to later</li>
      </ul>
    `
  }
};

const ChartingExamPractice = () => {
  const { examType } = useParams();
  const navigate = useNavigate();
  
  // Chart state
  const [chartData, setChartData] = useState([]);
  const [chartIndex, setChartIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drawings, setDrawings] = useState([]);
  const [showTutorial, setShowTutorial] = useState(true);
  
  // Exam state
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [currentScore, setCurrentScore] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [activeTool, setActiveTool] = useState(null);
  const [chartInstance, setChartInstance] = useState(null);
  
  // References
  const chartContainerRef = useRef(null);
  
  // Memoize exam type to avoid unnecessary re-renders
  const examTypeName = useMemo(() => {
    // Convert hyphenated exam types to underscore format if needed
    const normalizedExamType = examType.replace(/-/g, '_');
    
    switch (normalizedExamType) {
      case 'swing_analysis':
        return 'Swing Analysis';
      case 'fibonacci_retracement':
        return 'Fibonacci Retracement';
      case 'gap_analysis':
        return 'Fair Value Gap Analysis';
      default:
        return 'Charting Exam';
    }
  }, [examType]);
  
  // Load chart data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Convert hyphenated exam types to underscore format if needed
        const normalizedExamType = examType.replace(/-/g, '_');
        const params = new URLSearchParams(window.location.search);
        const section = params.get('section') || '';
        
        console.log(`Fetching chart data for ${normalizedExamType} exam, section: ${section}`);
        
        // Construct the correct endpoint based on section parameter
        let endpoint = `/charting_exam/${normalizedExamType}`;
        if (section) {
          endpoint = `${endpoint}/practice?section=${section}`;
        }
        
        const response = await api.get(endpoint);
        
        // Check if we got valid data and properly handle the different response formats
        if (response.data) {
          let chartEntry;
          
          // Handle the response structure which might vary based on endpoint
          if (Array.isArray(response.data.chart_data)) {
            // Direct chart_data array format
            chartEntry = {
              data: response.data.chart_data,
              symbol: response.data.symbol || 'UNKNOWN',
              timeframe: response.data.timeframe || '1d',
              instructions: response.data.instructions || ''
            };
          } else if (response.data.chart_data) {
            // Object with nested chart_data property
            chartEntry = {
              data: response.data.chart_data,
              symbol: response.data.symbol || 'UNKNOWN',
              timeframe: response.data.timeframe || '1d',
              instructions: response.data.instructions || ''
            };
          } else if (Array.isArray(response.data)) {
            // Direct array of candles
            chartEntry = {
              data: response.data,
              symbol: 'UNKNOWN',
              timeframe: '1d',
              instructions: 'Mark the significant patterns on this chart.'
            };
          }
          
          if (chartEntry && Array.isArray(chartEntry.data) && chartEntry.data.length > 0) {
            console.log(`Successfully loaded chart data: ${chartEntry.data.length} candles`);
            setChartData([chartEntry]); // Put the single chart in an array
            
            // Initialize answers array with a single empty entry
            const initialAnswers = [{ 
              drawings: [],
              score: 0,
              feedback: ''
            }];
            setAnswers(initialAnswers);
            setLoading(false);
            return; // Exit if we successfully loaded data
          }
        }
        
        // If we got here, there was insufficient chart data
        console.warn('Response contained insufficient chart data, retrying with delay...');
        
        // Attempt retry with a delay to avoid immediate rate limit issues
        setTimeout(async () => {
          try {
            // Try a second time with different endpoint if needed
            const retryEndpoint = `/charting_exam/${normalizedExamType}/practice`;
            const retryResponse = await api.get(retryEndpoint);
            
            if (retryResponse.data && 
                ((Array.isArray(retryResponse.data.chart_data) && retryResponse.data.chart_data.length > 0) ||
                 (Array.isArray(retryResponse.data) && retryResponse.data.length > 0))) {
              
              let chartEntry;
              if (retryResponse.data.chart_data) {
                chartEntry = {
                  data: retryResponse.data.chart_data,
                  symbol: retryResponse.data.symbol || 'UNKNOWN',
                  timeframe: retryResponse.data.timeframe || '1d',
                  instructions: retryResponse.data.instructions || ''
                };
              } else {
                chartEntry = {
                  data: retryResponse.data,
                  symbol: 'UNKNOWN',
                  timeframe: '1d',
                  instructions: 'Mark the significant patterns on this chart.'
                };
              }
              
              setChartData([chartEntry]);
              
              const initialAnswers = [{ 
                drawings: [],
                score: 0,
                feedback: ''
              }];
              setAnswers(initialAnswers);
              setLoading(false);
              console.log('Successfully loaded chart data on retry');
            } else {
              // If both attempts fail, use fallback data
              handleFallbackData();
            }
          } catch (retryErr) {
            console.error('Error on retry, using fallback data', retryErr);
            handleFallbackData();
          }
        }, 1500); // 1.5 second delay before retry
      } catch (err) {
        console.error('Error fetching chart data:', err);
        handleFallbackData();
      }
    };
    
    fetchData();
  }, [examType]);
  
  // Generate fallback chart data
  const generateFallbackData = (symbol, count = 100) => {
    console.log(`Generating fallback data for ${symbol}`);
    const data = [];
    // Use a much more reasonable base price (around 100)
    let basePrice = 100;
    
    // Don't scale based on symbol name - keep everything in a reasonable range
    if (symbol.toUpperCase().includes('BTC') || symbol.toUpperCase() === 'BITCOIN') {
      basePrice = 120;
    } else if (symbol.toUpperCase().includes('ETH') || symbol.toUpperCase() === 'ETHEREUM') {
      basePrice = 80;
    }
    
    // Generate candlestick data
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    for (let i = 0; i < count; i++) {
      // Create a more visually interesting chart with more reasonable price movements
      const change = (Math.random() * 2 - 1) / 100; // -1% to +1%
      
      // Add a subtle trend
      const trend = Math.sin(i / 20) * 0.02; // Creates a wave pattern
      
      const open = basePrice * (1 + (i > 0 ? change : 0) + trend);
      const close = open * (1 + (Math.random() * 0.01 - 0.005)); // Smaller random changes
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);
      
      data.push({
        time: now - (count - i) * 86400, // One day apart
        open,
        high,
        low,
        close
      });
      
      basePrice = close;
    }
    
    return data;
  };
  
  // Handle fallback data generation when API fails
  const handleFallbackData = useCallback(() => {
    console.log('Using fallback data due to API failure');
    const fallbackSymbol = 'FALLBACK';
    const fallbackData = generateFallbackData(fallbackSymbol, 100);
    
    const chartEntry = {
      data: fallbackData,
      symbol: fallbackSymbol,
      timeframe: '1d',
      instructions: 'This is simulated data for practice. Mark the significant patterns on this chart.'
    };
    
    setChartData([chartEntry]);
    
    const initialAnswers = [{ 
      drawings: [],
      score: 0,
      feedback: ''
    }];
    setAnswers(initialAnswers);
    setLoading(false);
    setError(null);
  }, []);
  
  // Handle drawing changes
  const handleDrawingsChange = useCallback((newDrawings) => {
    setDrawings(newDrawings);
  }, []);
  
  // Handle chart instance reference
  const handleChartInstance = useCallback((instance) => {
    setChartInstance(instance);
  }, []);
  
  // Handle submit action
  const handleSubmit = useCallback(() => {
    // Normalize exam type format
    const normalizedExamType = examType.replace(/-/g, '_');
    
    // Validate the current drawings against expected answers
    const result = validateDrawings(drawings, chartData[chartIndex], normalizedExamType);
    
    // Update answers
    const updatedAnswers = [...answers];
    updatedAnswers[chartIndex] = {
      drawings: [...drawings],
      score: result.score,
      feedback: result.feedback
    };
    
    setAnswers(updatedAnswers);
    setCurrentAnswer(updatedAnswers[chartIndex]);
    setCurrentScore(result.score);
    
    // Calculate total score
    const total = updatedAnswers.reduce((sum, answer) => sum + (answer.score || 0), 0);
    setTotalScore(total);
    
  }, [drawings, chartData, chartIndex, answers, examType]);
  
  // Handle continue to next chart
  const handleContinue = useCallback(() => {
    if (chartIndex < chartData.length - 1) {
      // Move to next chart
      setChartIndex(chartIndex + 1);
      setDrawings([]);
      setCurrentAnswer(null);
      setCurrentScore(null);
    } else {
      // Show final results
      setShowResults(true);
    }
  }, [chartIndex, chartData.length]);
  
  // Handle finish exam
  const handleFinish = useCallback(() => {
    navigate('/charting_exam');
  }, [navigate]);
  
  // Handle tool selection
  const handleToolSelect = useCallback((tool) => {
    setActiveTool(activeTool === tool ? null : tool);
  }, [activeTool]);
  
  // Handle tutorial close
  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);
  
  // Determine available tools based on exam type
  const availableTools = useMemo(() => {
    // Convert hyphenated exam types to underscore format if needed
    const normalizedExamType = examType.replace(/-/g, '_');
    
    switch (normalizedExamType) {
      case 'swing_analysis':
        return [
          { id: 'high', label: 'Swing High', icon: 'arrow-up' },
          { id: 'low', label: 'Swing Low', icon: 'arrow-down' }
        ];
      case 'fibonacci_retracement':
        return [
          { id: 'high', label: 'High Point', icon: 'arrow-up' },
          { id: 'low', label: 'Low Point', icon: 'arrow-down' }
        ];
      case 'gap_analysis':
        return [
          { id: 'bullishFVG', label: 'Bullish FVG', icon: 'arrow-up' },
          { id: 'bearishFVG', label: 'Bearish FVG', icon: 'arrow-down' }
        ];
      default:
        return [];
    }
  }, [examType]);
  
  // Update prepare chart data function to ensure proper formatting
  const prepareChartData = useCallback((rawChartData) => {
    if (!rawChartData || !Array.isArray(rawChartData) || rawChartData.length === 0) {
      console.error('Invalid or empty chart data received');
      const fallbackData = generateFallbackData('FALLBACK', 100);
      return fallbackData;
    }

    try {
      // Ensure each candle has the required fields and correct types
      const validCandles = rawChartData.map(candle => {
        // If the data is already in the correct format, just return it
        if (candle && 
            typeof candle.time === 'number' && 
            typeof candle.open === 'number' && 
            typeof candle.high === 'number' && 
            typeof candle.low === 'number' && 
            typeof candle.close === 'number') {
          return candle;
        }
        
        // Log invalid candle data for debugging
        console.warn('Invalid candle format detected, attempting to transform:', candle);
        
        // Try to transform from API format to chart format
        if (Array.isArray(candle) && candle.length >= 5) {
          return {
            time: typeof candle[0] === 'number' ? Math.floor(candle[0] / 1000) : Date.parse(candle[0]) / 1000,
            open: Number(candle[1]),
            high: Number(candle[2]),
            low: Number(candle[3]),
            close: Number(candle[4])
          };
        }
        
        // Convert string values to numbers if necessary
        return {
          time: typeof candle.time === 'string' ? parseInt(candle.time, 10) : candle.time,
          open: typeof candle.open === 'string' ? parseFloat(candle.open) : candle.open,
          high: typeof candle.high === 'string' ? parseFloat(candle.high) : candle.high,
          low: typeof candle.low === 'string' ? parseFloat(candle.low) : candle.low,
          close: typeof candle.close === 'string' ? parseFloat(candle.close) : candle.close
        };
      }).filter(candle => 
        candle !== null && 
        !isNaN(candle.time) && 
        !isNaN(candle.open) && 
        !isNaN(candle.high) && 
        !isNaN(candle.low) && 
        !isNaN(candle.close)
      );

      if (validCandles.length === 0) {
        console.warn('No valid candles after filtering');
        return generateFallbackData('FALLBACK', 100);
      }

      console.log(`Prepared ${validCandles.length} valid candles for chart rendering`);
      return validCandles;
    } catch (error) {
      console.error('Error formatting chart data:', error);
      return generateFallbackData('ERROR', 100);
    }
  }, []);
  
  // Render error message if any
  const renderError = () => {
    if (!error) return null;
    
    return (
      <div className="error-notification">
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button className="error-close" onClick={() => setError(null)}>×</button>
        </div>
      </div>
    );
  };
  
  // Show loading spinner while chart data is loading
  if (loading) {
    return (
      <div className="charting-exam-practice-container">
        <h1>{examTypeName}</h1>
        <div className="loading-container">
          <LoadingSpinner />
          <p>Loading chart data...</p>
        </div>
      </div>
    );
  }

  // Show error message if there's an error
  if (error) {
    return (
      <div className="charting-exam-practice-container">
        <h1>{examTypeName}</h1>
        <div className="error-container">
          <div className="error-message">
            <h3>Error Loading Chart Data</h3>
            <p>{error}</p>
            <button className="primary-button" onClick={() => window.location.reload()}>
              Retry
            </button>
            <button className="secondary-button" onClick={() => navigate('/charting-exams')}>
              Back to Exams
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (showResults) {
    // Calculate percentage score
    const maxPossibleScore = chartData.length * 100;
    const percentScore = Math.round((totalScore / maxPossibleScore) * 100);
    
    return (
      <div className="exam-results">
        <h2>Exam Results</h2>
        <div className="score-display">
          <div className="score-circle">
            <span className="score-percent">{percentScore}%</span>
          </div>
        </div>
        <div className="result-details">
          <p>You scored {totalScore} out of a possible {maxPossibleScore} points.</p>
          <p>
            {percentScore >= 80 ? 'Excellent work! You have a strong understanding of this analysis technique.' :
             percentScore >= 60 ? 'Good job! You have a solid grasp of the concepts, but there\'s room for improvement.' :
             'You might need more practice with this technique. Consider reviewing the tutorial again.'}
          </p>
          
          <h3>Chart by Chart Breakdown</h3>
          <div className="chart-breakdown">
            {answers.map((answer, index) => (
              <div key={index} className="chart-result">
                <h4>Chart {index + 1}</h4>
                <p>Score: {answer.score || 0}/100</p>
                <p>{answer.feedback || 'No feedback available'}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="action-buttons">
          <button onClick={handleFinish}>Back to Exams</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="charting-exam-practice">
      {/* Show error notification if present */}
      {renderError()}
      
      {showTutorial ? (
        <div className="tutorial-overlay">
          <div className="tutorial-content">
            <h2>Welcome to {examTypeName} Practice</h2>
            <div dangerouslySetInnerHTML={{ __html: tutorialContent[examType]?.content || 'No tutorial available for this exam type.' }} />
            <button className="start-practice-btn" onClick={() => setShowTutorial(false)}>
              Start Practice
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="chart-header">
            <h2>{examTypeName} Practice</h2>
            <div className="chart-info">
              <span>{chartData[chartIndex]?.symbol || 'Unknown'}</span>
              <span>{chartData[chartIndex]?.timeframe || '1d'}</span>
            </div>
          </div>
          
          <div className="chart-container" ref={chartContainerRef}>
            {loading ? (
              <LoadingSpinner />
            ) : (
              <>
                <TradingViewChart 
                  data={prepareChartData(chartData[chartIndex]?.data || [])} 
                  onChartInstance={setChartInstance}
                  onChartReady={() => console.log('Chart ready')}
                />
                {chartInstance && (
                  <DrawingTools 
                    chartContainer={chartContainerRef.current} 
                    onDrawingsChange={handleDrawingsChange}
                    chartInstance={chartInstance}
                  />
                )}
              </>
            )}
          </div>
          
          <div className="chart-instructions">
            <p>{chartData[chartIndex]?.instructions || 'Mark the significant patterns on this chart.'}</p>
          </div>
          
          <div className="chart-actions">
            {!currentScore ? (
              <button 
                className="submit-btn" 
                onClick={handleSubmit}
                disabled={drawings.length === 0}
              >
                Submit Answer
              </button>
            ) : (
              <button 
                className="next-btn" 
                onClick={handleContinue}
              >
                Next
              </button>
            )}
          </div>
          
          {currentScore !== null && (
            <div className="results-panel">
              <h3>Your Score: {currentScore.score}/{currentScore.totalExpectedPoints}</h3>
              <div className="feedback">
                {currentScore.feedback.correct.length > 0 && (
                  <div className="correct-feedback">
                    <h4>Correct</h4>
                    <ul>
                      {currentScore.feedback.correct.map((item, i) => (
                        <li key={`correct-${i}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {currentScore.feedback.incorrect.length > 0 && (
                  <div className="incorrect-feedback">
                    <h4>Improvements</h4>
                    <ul>
                      {currentScore.feedback.incorrect.map((item, i) => (
                        <li key={`incorrect-${i}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {showResults && (
            <div className="final-results">
              <h3>Final Score: {totalScore}/{answers.length * 10}</h3>
              <button 
                className="restart-btn" 
                onClick={handleFinish}
              >
                Practice Again
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ChartingExamPractice; 
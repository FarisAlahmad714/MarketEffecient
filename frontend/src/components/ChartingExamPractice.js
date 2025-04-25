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
        const response = await api.get(`/charting_exam/${normalizedExamType}`);
        
        // The API returns chart_data directly, not nested in a charts array
        if (response.data && response.data.chart_data && Array.isArray(response.data.chart_data)) {
          // Create a single chart entry with the data from the API
          const chartEntry = {
            data: response.data.chart_data,
            symbol: response.data.symbol || 'UNKNOWN',
            timeframe: response.data.timeframe || '1d',
            instructions: response.data.instructions || ''
          };
          
          // Check if data array is empty
          if (response.data.chart_data.length === 0) {
            console.warn('API returned empty chart data array, generating fallback data');
            // Generate fallback data
            chartEntry.data = generateFallbackData(chartEntry.symbol, 100);
          }
          
          setChartData([chartEntry]); // Put the single chart in an array
          
          // Initialize answers array with a single empty entry
          const initialAnswers = [{ 
            drawings: [],
            score: 0,
            feedback: ''
          }];
          setAnswers(initialAnswers);
          setLoading(false);
        } else {
          console.warn('Response contained no chart data, retrying...');
          // Try one more time with a slight delay
          setTimeout(async () => {
            try {
              const retryResponse = await api.get(`/charting_exam/${normalizedExamType}`);
              
              if (retryResponse.data && retryResponse.data.chart_data && Array.isArray(retryResponse.data.chart_data)) {
                const chartEntry = {
                  data: retryResponse.data.chart_data,
                  symbol: retryResponse.data.symbol || 'UNKNOWN',
                  timeframe: retryResponse.data.timeframe || '1d',
                  instructions: retryResponse.data.instructions || ''
                };
                
                // Check if data array is empty
                if (retryResponse.data.chart_data.length === 0) {
                  console.warn('API retry returned empty chart data array, generating fallback data');
                  // Generate fallback data
                  chartEntry.data = generateFallbackData(chartEntry.symbol, 100);
                }
                
                setChartData([chartEntry]);
                
                const initialAnswers = [{ 
                  drawings: [],
                  score: 0,
                  feedback: ''
                }];
                setAnswers(initialAnswers);
                setLoading(false);
              } else {
                // Generate fallback data if all attempts fail
                const fallbackChartEntry = {
                  data: generateFallbackData('FALLBACK', 100),
                  symbol: 'FALLBACK',
                  timeframe: '1d',
                  instructions: 'Fallback chart - API failed to return data'
                };
                
                setChartData([fallbackChartEntry]);
                
                const initialAnswers = [{ 
                  drawings: [],
                  score: 0,
                  feedback: ''
                }];
                setAnswers(initialAnswers);
                setLoading(false);
                
                console.warn('Using fallback chart data due to API failures');
              }
            } catch (retryErr) {
              console.error('Error on retry:', retryErr);
              
              // Generate fallback data if all attempts fail
              const fallbackChartEntry = {
                data: generateFallbackData('ERROR', 100),
                symbol: 'ERROR',
                timeframe: '1d',
                instructions: 'Error fetching chart data - using fallback'
              };
              
              setChartData([fallbackChartEntry]);
              
              const initialAnswers = [{ 
                drawings: [],
                score: 0,
                feedback: ''
              }];
              setAnswers(initialAnswers);
              setLoading(false);
            }
          }, 2000);
        }
      } catch (err) {
        console.error('Error fetching chart data:', err);
        
        // Generate fallback data if API call fails completely
        const fallbackChartEntry = {
          data: generateFallbackData('ERROR', 100),
          symbol: 'ERROR',
          timeframe: '1d',
          instructions: 'Error fetching chart data - using fallback'
        };
        
        setChartData([fallbackChartEntry]);
        
        const initialAnswers = [{ 
          drawings: [],
          score: 0,
          feedback: ''
        }];
        setAnswers(initialAnswers);
        setLoading(false);
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
  
  // Prepare chart data for TradingViewChart
  const prepareChartData = useCallback((rawChartData) => {
    if (!rawChartData || !Array.isArray(rawChartData) || rawChartData.length === 0) {
      console.error('Invalid or empty chart data received');
      // Generate fallback data instead of returning empty
      const fallbackData = generateFallbackData('FALLBACK', 100);
      return { candles: fallbackData, volume: [] };
    }

    try {
      // Ensure each candle has the required fields and correct types
      const validCandles = rawChartData.map(candle => {
        // Check if the candle object has the required properties
        if (!candle || typeof candle.time !== 'number' || 
            typeof candle.open !== 'number' || 
            typeof candle.high !== 'number' || 
            typeof candle.low !== 'number' || 
            typeof candle.close !== 'number') {
          
          // Log invalid candle data for debugging
          console.warn('Invalid candle format detected:', candle);
          return null;
        }
        
        return {
          time: candle.time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close
        };
      }).filter(candle => candle !== null);

      if (validCandles.length === 0) {
        console.warn('No valid candles after filtering');
        // Generate fallback data if all candles were invalid
        return { candles: generateFallbackData('FALLBACK', 100), volume: [] };
      }

      return { candles: validCandles, volume: [] };
    } catch (error) {
      console.error('Error formatting chart data:', error);
      // Generate fallback data on error
      return { candles: generateFallbackData('ERROR', 100), volume: [] };
    }
  }, []);
  
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
      <div className="exam-header">
        <h2>{examTypeName} - Chart {chartIndex + 1} of {chartData.length}</h2>
        <div className="progress-indicator">
          {chartData.map((_, index) => (
            <div 
              key={index} 
              className={`progress-dot ${index === chartIndex ? 'active' : ''} ${answers[index]?.score ? 'completed' : ''}`}
            />
          ))}
        </div>
      </div>
      
      {showTutorial && (
        <div className="tutorial-overlay">
          <div className="tutorial-content">
            <h2>{tutorialContent[examType]?.title || 'Tutorial'}</h2>
            <div dangerouslySetInnerHTML={{ __html: tutorialContent[examType]?.content || 'No tutorial content available' }} />
            <button onClick={handleCloseTutorial}>Start Practice</button>
          </div>
        </div>
      )}
      
      <div className="chart-container" ref={chartContainerRef}>
        {chartData[chartIndex] && (
          <TradingViewChart 
            data={prepareChartData(chartData[chartIndex].data)} 
            symbol={chartData[chartIndex].symbol || 'UNKNOWN'}
            onChartInstance={handleChartInstance}
          />
        )}
        
        {chartInstance && (
          <DrawingTools 
            chartInstance={chartInstance}
            activeTool={activeTool}
            examType={examType}
            onDrawingsChange={handleDrawingsChange}
          />
        )}
      </div>
      
      <div className="tools-panel">
        <div className="tool-buttons">
          {availableTools.map((tool) => (
            <button 
              key={tool.id}
              className={`tool-button ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => handleToolSelect(tool.id)}
            >
              <i className={`fas fa-${tool.icon}`}></i>
              {tool.label}
            </button>
          ))}
        </div>
        
        <div className="action-buttons">
          {currentAnswer ? (
            <>
              <div className="score-display">
                <span>Score: </span>
                <span className="score-value">{currentScore}/100</span>
              </div>
              <button className="next-button" onClick={handleContinue}>
                {chartIndex < chartData.length - 1 ? 'Next Chart' : 'See Results'}
              </button>
            </>
          ) : (
            <button 
              className="submit-button"
              onClick={handleSubmit} 
              disabled={drawings.length === 0}
            >
              Submit Answer
            </button>
          )}
        </div>
      </div>
      
      {currentAnswer && (
        <div className="feedback-panel">
          <h3>Feedback</h3>
          <p>{currentAnswer.feedback}</p>
        </div>
      )}
    </div>
  );
};

export default ChartingExamPractice; 
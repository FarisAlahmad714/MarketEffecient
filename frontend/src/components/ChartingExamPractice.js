import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getPracticeChart, validateAnswers } from '../services/chartingExamService';
import './ChartingExamPractice.css';
import DrawingTools from './DrawingTools';

const ChartingExamPractice = () => {
  const { examType } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get the section from query parameter
  const queryParams = new URLSearchParams(location.search);
  const section = queryParams.get('section') || 'default';
  
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ chartCount: 1, totalScore: 0 });
  const [result, setResult] = useState(null);
  const chartContainerRef = useRef(null);
  
  // Load chart data
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        const data = await getPracticeChart(examType, section, progress.chartCount);
        setChartData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError('Failed to load chart data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [examType, section, progress.chartCount]);
  
  // Handle submission
  const handleSubmit = async () => {
    // Show loading overlay
    document.getElementById('loading-overlay').classList.add('active');
    
    try {
      // Get drawing data from drawing layer
      const drawingData = window.drawingLayer ? {
        drawings: window.drawingLayer.drawings.map(d => ({
          type: d.tagName.toLowerCase(),
          attributes: Array.from(d.attributes).reduce((obj, attr) => {
            obj[attr.name] = attr.value;
            return obj;
          }, {})
        }))
      } : { drawings: [] };
      
      // Call API to validate answers
      const validationResult = await validateAnswers(examType, {
        examType,
        section,
        chartNumber: progress.chartCount,
        drawingData
      });
      
      setResult(validationResult);
      
      // Hide loading overlay and show results
      document.getElementById('loading-overlay').classList.remove('active');
      document.getElementById('results-section').classList.add('visible');
    } catch (err) {
      console.error('Error validating answers:', err);
      document.getElementById('loading-overlay').classList.remove('active');
      alert('Failed to validate your answers. Please try again.');
    }
  };
  
  // Handle continuing to next chart
  const handleContinue = () => {
    // Hide results
    document.getElementById('results-section').classList.remove('visible');
    
    // Update progress
    if (progress.chartCount < 5) {
      setProgress(prev => ({
        chartCount: prev.chartCount + 1,
        totalScore: prev.totalScore + (result ? result.score : 0)
      }));
      
      // Clear result for next chart
      setResult(null);
    } else {
      // Exam completed
      alert(`Section completed! Your total score: ${progress.totalScore + (result ? result.score : 0)}/500`);
      navigate('/charting-exams');
    }
  };
  
  if (loading) {
    return <div className="loading">Loading chart data...</div>;
  }
  
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  return (
    <div className="exam-practice-container">
      <h2>{section.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Analysis</h2>
      <p className="instructions">{chartData.instructions}</p>
      
      {/* Progress indicator */}
      <div className="exam-progress">
        <span className="chart-indicator">Chart <span id="current-chart">{progress.chartCount}</span>/5</span>
        <div className="chart-progress-bar">
          <div className="chart-progress" style={{ width: `${(progress.chartCount / 5) * 100}%` }}></div>
        </div>
      </div>
      
      {/* Chart and results container */}
      <div className="exam-container">
        {/* Left side: Chart area */}
        <div className="chart-section">
          <h3 id="chart-symbol">Symbol: {chartData.symbol}</h3>
          <div 
            id="chart-container" 
            ref={chartContainerRef}
            className="chart-canvas"
          >
            {/* Placeholder for chart */}
            <div className="chart-placeholder">
              <p>Chart display would be implemented here with a charting library</p>
            </div>
          </div>
          
          {/* Initialize drawing tools */}
          {chartContainerRef.current && <DrawingTools chartContainer={chartContainerRef.current} />}
          
          <div className="toolbar">
            {examType === 'gap_analysis' && (
              <button id="box-tool" className="tool-btn">Box Tool</button>
            )}
            <button id="line-tool" className="tool-btn">Line Tool</button>
            <button id="pointer-tool" className="tool-btn">Pointer</button>
            <button id="clear-btn" className="tool-btn secondary">Clear</button>
            <button id="undo-btn" className="tool-btn secondary">Undo</button>
            <button id="submit-btn" className="tool-btn submit" onClick={handleSubmit}>Submit Answer</button>
          </div>
          
          {/* Conditional tool panels based on exam type */}
          {examType === 'fibonacci_retracement' && (
            <div className="fibonacci-levels">
              <h4>Fibonacci Levels</h4>
              <div className="fib-levels-container">
                {[0.236, 0.382, 0.5, 0.618, 0.786].map(level => (
                  <div key={level} className="fib-level" data-level={level}>
                    <span className="level-name">{level.toFixed(3)}</span>
                    <span className="level-price" id={`fib-price-${level * 1000}`}>-</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Right side: Results panel (initially hidden) */}
        <div id="results-section" className="results-section">
          <div className="results-header">
            <h3>Analysis Results</h3>
          </div>
          <div id="results-content" className="results-content">
            <p>{result ? result.feedback : 'Great job! You correctly identified the pattern.'}</p>
            <div className="score-display">
              <div className="score-circle">
                <span className="score-value">{result ? result.score : '85'}</span>
                <span className="score-label">Score</span>
              </div>
            </div>
            <div className="feedback-section">
              <h4>Feedback</h4>
              <p>You've identified the main pattern correctly. For even better results, pay attention to the smaller swing points as well.</p>
            </div>
          </div>
          <div className="results-footer">
            <button id="continue-btn" className="continue-btn" onClick={handleContinue}>Continue</button>
          </div>
        </div>
      </div>
      
      {/* Loading overlay */}
      <div id="loading-overlay" className="loading-overlay">
        <div className="loading-content">
          <div className="spinner"></div>
          <div className="loading-text">Analyzing your answers...</div>
        </div>
      </div>
    </div>
  );
};

export default ChartingExamPractice; 
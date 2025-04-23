import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CandlestickChart from './CandlestickChart';
import './Results.css';

const Results = () => {
  const { assetSymbol } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const sessionId = queryParams.get('session_id');
  
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!sessionId) {
      setError('No session ID found. Please start a new test.');
      setLoading(false);
      return;
    }
    
    const fetchResults = async () => {
      try {
        const api = axios.create({
          baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log(`Fetching results for ${assetSymbol} with session ${sessionId}`);
        const response = await api.get(`/results/${assetSymbol}?session_id=${sessionId}`);
        console.log('Results data:', response.data);
        
        setResults(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching results:', err);
        if (err.response) {
          console.error('Response status:', err.response.status);
          console.error('Response data:', err.response.data);
          setError(`Failed to load results: ${err.response.data.detail || err.message}`);
        } else {
          setError(`Failed to load results: ${err.message}`);
        }
        setLoading(false);
      }
    };
    
    fetchResults();
  }, [assetSymbol, sessionId]);
  
  // If still loading, show loading indicator
  if (loading) {
    return <div className="loading">Loading results...</div>;
  }
  
  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={() => navigate('/')} className="back-button">
          Back to Asset Selection
        </button>
      </div>
    );
  }
  
  // If no results found
  if (!results) {
    return (
      <div className="error">
        <p>No results found. Please try taking the test again.</p>
        <button onClick={() => navigate('/')} className="back-button">
          Back to Asset Selection
        </button>
      </div>
    );
  }
  
  // Function to get a user-friendly timeframe label
  const getTimeframeLabel = (tf) => {
    const labels = {
      '4h': '4-Hour',
      'daily': 'Daily',
      'weekly': 'Weekly',
      'monthly': 'Monthly',
      'random': 'Mixed'
    };
    return labels[tf] || 'Unknown';
  };
  
  const handleTakeAnotherTest = () => {
    navigate(`/test/${assetSymbol}`);
  };
  
  const handleBackToAssets = () => {
    navigate('/');
  };

  return (
    <div className="results">
      <h1>{results.asset_name} Bias Test Results</h1>
      
      <div className="score-summary">
        <p>Your score: {results.score} / {results.total}</p>
        <div className="score-percentage">
          {Math.round((results.score / results.total) * 100)}%
        </div>
      </div>
      
      <h2>Review Your Answers</h2>
      
      {results.answers.map((answer, index) => (
        <div key={answer.test_id} className={`result-item ${answer.is_correct ? 'correct' : 'incorrect'}`}>
          <h3>Question {index + 1}
            <span className="timeframe-label"> - {getTimeframeLabel(answer.timeframe)} Timeframe</span>
          </h3>
          
          <div className="charts-container">
            <div className="chart-wrapper">
              <p>Setup Chart:</p>
              {answer.ohlc_data ? (
                <CandlestickChart 
                  data={answer.ohlc_data} 
                  title={`Setup Chart - ${getTimeframeLabel(answer.timeframe)}`}
                  height={350}
                />
              ) : answer.setup_chart_url ? (
                <img
                  src={`http://localhost:8000${answer.setup_chart_url}`}
                  alt="Setup Chart"
                  className="chart"
                />
              ) : (
                <div className="chart-error">No setup chart data available</div>
              )}
            </div>
            
            <div className="chart-wrapper">
              <p>Outcome Chart:</p>
              {answer.outcome_ohlc_data ? (
                <CandlestickChart 
                  data={answer.outcome_ohlc_data} 
                  title={`Outcome Chart - ${getTimeframeLabel(answer.timeframe)}`}
                  height={350}
                />
              ) : answer.outcome_chart_url ? (
                <img
                  src={`http://localhost:8000${answer.outcome_chart_url}`}
                  alt="Outcome Chart"
                  className="chart"
                />
              ) : (
                <div className="chart-error">No outcome chart data available</div>
              )}
            </div>
          </div>
          
          <div className="ohlc-data">
            <p>Setup OHLC for {new Date(answer.date).toLocaleDateString()}:</p>
            <ul>
              <li>Open: {answer.ohlc.open.toFixed(2)}</li>
              <li>High: {answer.ohlc.high.toFixed(2)}</li>
              <li>Low: {answer.ohlc.low.toFixed(2)}</li>
              <li>Close: {answer.ohlc.close.toFixed(2)}</li>
            </ul>
          </div>
          
          {answer.outcome_ohlc && (
            <div className="ohlc-data outcome-ohlc">
              <p>Outcome OHLC for {new Date(answer.outcome_date || new Date(answer.date).getTime() + 86400000).toLocaleDateString()}:</p>
              <ul>
                <li>Open: {answer.outcome_ohlc.open.toFixed(2)}</li>
                <li>High: {answer.outcome_ohlc.high.toFixed(2)}</li>
                <li>Low: {answer.outcome_ohlc.low.toFixed(2)}</li>
                <li>Close: {answer.outcome_ohlc.close.toFixed(2)}</li>
              </ul>
            </div>
          )}
          
          <div className="prediction-result">
            <p>Your Prediction: <strong>{answer.user_prediction}</strong></p>
            <p>Correct Answer: <strong>{answer.correct_answer}</strong></p>
            <p className="result-label">
              {answer.is_correct ? '✓ Correct' : '✗ Incorrect'}
            </p>
          </div>
        </div>
      ))}
      
      <div className="actions">
        <button onClick={handleTakeAnotherTest} className="action-button">
          Take Another Test
        </button>
        <button onClick={handleBackToAssets} className="action-button">
          Back to Asset Selection
        </button>
      </div>
    </div>
  );
};

export default Results;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getTestForAsset, submitTestAnswers, getRandomCrossAssetTest } from '../services/api';
import './BiasTest.css';

const BiasTest = () => {
  const { assetSymbol } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get timeframe from URL query params
  const queryParams = new URLSearchParams(location.search);
  const timeframe = queryParams.get('timeframe') || 'random';
  
  const [testData, setTestData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actualAssetSymbol, setActualAssetSymbol] = useState('');
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        console.log(`Fetching test for asset: ${assetSymbol} with timeframe: ${timeframe}`);
        
        let testData;
        if (assetSymbol === 'random') {
          testData = await getRandomCrossAssetTest(timeframe);
          setActualAssetSymbol('random'); // Use 'random' as the symbol for submission
        } else {
          testData = await getTestForAsset(assetSymbol, timeframe);
          setActualAssetSymbol(assetSymbol);
        }
        
        setTestData(testData);
        setSessionId(testData.session_id);
      } catch (err) {
        console.error('Detailed error fetching test:', err);
        setError(`Failed to load test. Please try again later. (${err.message})`);
      }
    };

    fetchTest();
  }, [assetSymbol, timeframe]);

  const handleAnswerChange = (questionId, prediction) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: prediction
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if all questions are answered
    const unanswered = Object.values(answers).some(a => a === null);
    if (unanswered) {
      alert('Please answer all questions before submitting.');
      return;
    }
    
    try {
      setSubmitting(true);
      const result = await submitTestAnswers(assetSymbol, sessionId, { answers });
      
      // Navigate to results page
      navigate(`/results/${assetSymbol}?session_id=${sessionId}`);
    } catch (err) {
      console.error('Error submitting answers:', err);
      setError(`Failed to submit test answers. Please try again. (${err.message})`);
      setSubmitting(false);
    }
  };

  // Get a human-readable timeframe label
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

  // Show loading indicator while data is being fetched
  if (!testData) {
    return <div className="loading">Loading test data...</div>;
  }

  // Only show the "no questions" message if we have no data
  if (!testData.questions || testData.questions.length === 0) {
    return (
      <div className="error">
        <p>No test questions available for this asset.</p>
        <button onClick={() => navigate('/')} className="back-button">
          Back to Asset Selection
        </button>
      </div>
    );
  }

  return (
    <div className="bias-test">
      <h1>{testData.asset_name} Bias Test</h1>
      <div className="test-info">
        <span className="timeframe-badge">
          {testData.selected_timeframe === 'random' ? 'Mixed Timeframes' : `${getTimeframeLabel(testData.selected_timeframe)} Timeframe`}
        </span>
      </div>
      
      <form onSubmit={handleSubmit}>
        {testData.questions.map((question, index) => (
          <div key={question.id} className="question">
            <h3>Question {index + 1}
              <span className="timeframe-label"> - {getTimeframeLabel(question.timeframe)} Timeframe</span>
              
              {assetSymbol === 'random' && (
                <span className="asset-label"> - {testData.asset_name === "Random Mix" ? "Mixed Assets" : testData.asset_name}</span>
              )}
            </h3>
            
            <div className="chart-container">
              <img
                src={`http://localhost:8000${question.setup_chart_url}`}
                alt={`Setup chart for ${testData.asset_symbol}`}
                className="chart"
              />
            </div>
            
            <div className="ohlc-data">
              <p>OHLC for {new Date(question.date).toLocaleDateString()}:</p>
              <ul>
                <li>Open: {question.ohlc.open.toFixed(2)}</li>
                <li>High: {question.ohlc.high.toFixed(2)}</li>
                <li>Low: {question.ohlc.low.toFixed(2)}</li>
                <li>Close: {question.ohlc.close.toFixed(2)}</li>
              </ul>
            </div>
            
            <div className="prediction">
              <p>Predict the next {question.timeframe} sentiment:</p>
              <label>
                <input
                  type="radio"
                  name={`prediction_${question.id}`}
                  value="Bullish"
                  checked={answers[question.id] === "Bullish"}
                  onChange={() => handleAnswerChange(question.id, "Bullish")}
                  required
                />
                Bullish
              </label>
              <label>
                <input
                  type="radio"
                  name={`prediction_${question.id}`}
                  value="Bearish"
                  checked={answers[question.id] === "Bearish"}
                  onChange={() => handleAnswerChange(question.id, "Bearish")}
                />
                Bearish
              </label>
            </div>
          </div>
        ))}
        
        <button type="submit" disabled={submitting} className="submit-button">
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
};

export default BiasTest;
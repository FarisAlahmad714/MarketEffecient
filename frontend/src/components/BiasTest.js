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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actualAssetSymbol, setActualAssetSymbol] = useState('');

  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        
        // If assetSymbol is 'random', use the cross-asset endpoint
        if (assetSymbol === 'random') {
          try {
            console.log(`Fetching random cross-asset test with timeframe: ${timeframe}`);
            const data = await getRandomCrossAssetTest(timeframe);
            setTestData(data);
            setActualAssetSymbol('random'); // Use 'random' as the symbol for submission
            
            // Initialize answers object
            const initialAnswers = {};
            data.questions.forEach(q => {
              initialAnswers[q.id] = null;
            });
            setAnswers(initialAnswers);
            
            setLoading(false);
          } catch (randomError) {
            console.error('Error fetching random cross-asset test:', randomError);
            setError(`Failed to load random test. Please try again later. (${randomError.message})`);
            setLoading(false);
          }
        } else {
          // For a specific asset
          setActualAssetSymbol(assetSymbol);
          console.log(`Fetching test for asset: ${assetSymbol} with timeframe: ${timeframe}`);
          const data = await getTestForAsset(assetSymbol, timeframe);
          setTestData(data);
          
          // Initialize answers object
          const initialAnswers = {};
          data.questions.forEach(q => {
            initialAnswers[q.id] = null;
          });
          setAnswers(initialAnswers);
          
          setLoading(false);
        }
      } catch (err) {
        console.error('Detailed error fetching test:', err);
        setError(`Failed to load test. Please try again later. (${err.message})`);
        setLoading(false);
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
      
      // Format answers for API
      const formattedAnswers = Object.entries(answers).map(([test_id, prediction]) => ({
        test_id: parseInt(test_id),
        prediction
      }));
      
      console.log('Submitting answers for asset:', actualAssetSymbol);
      const results = await submitTestAnswers(
        actualAssetSymbol, 
        testData.session_id, 
        formattedAnswers
      );
      
      // Navigate to results page with data
      navigate(`/results/${actualAssetSymbol}`, { state: { results } });
      
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

  if (loading) {
    return <div className="loading">Loading test data...</div>;
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

  if (!testData || !testData.questions || testData.questions.length === 0) {
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
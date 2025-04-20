import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTestForAsset, submitTestAnswers } from '../services/api';
import './BiasTest.css';

const BiasTest = () => {
  const { assetSymbol } = useParams();
  const navigate = useNavigate();
  
  const [testData, setTestData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        setLoading(true);
        const data = await getTestForAsset(assetSymbol);
        setTestData(data);
        
        // Initialize answers object
        const initialAnswers = {};
        data.questions.forEach(q => {
          initialAnswers[q.id] = null;
        });
        setAnswers(initialAnswers);
        
        setLoading(false);
      } catch (err) {
        setError(`Failed to load test for ${assetSymbol}. Please try again later.`);
        setLoading(false);
        console.error('Error fetching test:', err);
      }
    };

    fetchTest();
  }, [assetSymbol]);

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
      
      const results = await submitTestAnswers(
        assetSymbol, 
        testData.session_id, 
        formattedAnswers
      );
      
      // Navigate to results page with data
      navigate(`/results/${assetSymbol}`, { state: { results } });
      
    } catch (err) {
      setError('Failed to submit test answers. Please try again.');
      setSubmitting(false);
      console.error('Error submitting answers:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading test data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!testData || !testData.questions || testData.questions.length === 0) {
    return <div className="error">No test questions available for this asset.</div>;
  }

  return (
    <div className="bias-test">
      <h1>{testData.asset_name} Daily Bias Test</h1>
      
      <form onSubmit={handleSubmit}>
        {testData.questions.map((question, index) => (
          <div key={question.id} className="question">
            <h3>Question {index + 1}</h3>
            
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
              <p>Predict the next day's sentiment:</p>
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
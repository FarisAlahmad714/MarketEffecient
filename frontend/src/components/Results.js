import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import './Results.css';

const Results = () => {
  const { assetSymbol } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get results from location state (passed from BiasTest component)
  const results = location.state?.results;
  
  // If no results found, redirect to asset selector
  if (!results) {
    navigate('/');
    return null;
  }
  
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
          <h3>Question {index + 1}</h3>
          
          <div className="charts-container">
            <div className="chart-wrapper">
              <p>Setup Chart:</p>
              <img
                src={`http://localhost:8000${answer.setup_chart_url || ''}`}
                alt="Setup Chart"
                className="chart"
              />
            </div>
            
            <div className="chart-wrapper">
              <p>Outcome Chart:</p>
              <img
                src={`http://localhost:8000${answer.outcome_chart_url || ''}`}
                alt="Outcome Chart"
                className="chart"
              />
            </div>
          </div>
          
          <div className="ohlc-data">
            <p>OHLC for {new Date(answer.date).toLocaleDateString()}:</p>
            <ul>
              <li>Open: {answer.ohlc.open.toFixed(2)}</li>
              <li>High: {answer.ohlc.high.toFixed(2)}</li>
              <li>Low: {answer.ohlc.low.toFixed(2)}</li>
              <li>Close: {answer.ohlc.close.toFixed(2)}</li>
            </ul>
          </div>
          
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
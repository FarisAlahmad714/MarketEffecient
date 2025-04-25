import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="homepage">
      <div className="hero-section">
        <h1>Trading Analysis Platform</h1>
        <p>Improve your trading skills with our interactive tools</p>
      </div>
      
      <div className="features-section">
        <div className="feature-card">
          <div className="feature-icon">
            <i className="fas fa-chart-line"></i>
          </div>
          <h2>Daily Bias Test</h2>
          <p>Test your ability to predict market direction based on historical price data.</p>
          <Link to="/bias-test" className="feature-button">Start Testing</Link>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">
            <i className="fas fa-drafting-compass"></i>
          </div>
          <h2>Charting Exams</h2>
          <p>Practice technical analysis with interactive charting exercises.</p>
          <Link to="/charting_exam" className="feature-button">Start Learning</Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 
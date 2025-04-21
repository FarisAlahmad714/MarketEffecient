import React from 'react';
import './TimeframeModal.css';

const TimeframeModal = ({ onClose, onSelect, assetName }) => {
  const handleTimeframeSelect = (timeframe) => {
    onSelect(timeframe);
    onClose();
  };

  return (
    <div className="timeframe-modal-overlay">
      <div className="timeframe-modal">
        <div className="timeframe-modal-header">
          <h2>Select Timeframe for {assetName}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="timeframe-options">
          <div 
            className="timeframe-option" 
            onClick={() => handleTimeframeSelect('random')}
          >
            <div className="option-icon">
              <i className="fas fa-random"></i>
            </div>
            <h3>Mixed Timeframes</h3>
            <p>Test your skills across different timeframes - 4H, Daily, Weekly, and Monthly charts.</p>
          </div>

          <div 
            className="timeframe-option" 
            onClick={() => handleTimeframeSelect('4h')}
          >
            <div className="option-icon">
              <i className="fas fa-clock"></i>
            </div>
            <h3>4-Hour Charts</h3>
            <p>Short-term price action for active traders who monitor intraday movements.</p>
          </div>

          <div 
            className="timeframe-option" 
            onClick={() => handleTimeframeSelect('daily')}
          >
            <div className="option-icon">
              <i className="fas fa-calendar-day"></i>
            </div>
            <h3>Daily Charts</h3>
            <p>Standard daily price action for swing traders and position traders.</p>
          </div>

          <div 
            className="timeframe-option" 
            onClick={() => handleTimeframeSelect('weekly')}
          >
            <div className="option-icon">
              <i className="fas fa-calendar-week"></i>
            </div>
            <h3>Weekly Charts</h3>
            <p>Medium-term price action focusing on weekly market movements.</p>
          </div>

          <div 
            className="timeframe-option" 
            onClick={() => handleTimeframeSelect('monthly')}
          >
            <div className="option-icon">
              <i className="fas fa-calendar-alt"></i>
            </div>
            <h3>Monthly Charts</h3>
            <p>Long-term price action for investors focusing on macro trends.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeframeModal; 
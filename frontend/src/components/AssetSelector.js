import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAssets } from '../services/api';
import TimeframeModal from './TimeframeModal';
import './AssetSelector.css';

const AssetSelector = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        const data = await getAssets();
        
        // Group assets by type
        const grouped = data.reduce((acc, asset) => {
          if (!acc[asset.type]) {
            acc[asset.type] = [];
          }
          acc[asset.type].push(asset);
          return acc;
        }, {});
        
        setAssets(grouped);
        setLoading(false);
      } catch (err) {
        setError('Failed to load assets. Please try again later.');
        setLoading(false);
        console.error('Error fetching assets:', err);
      }
    };

    fetchAssets();
  }, []);

  const handleAssetSelect = (assetSymbol, assetName) => {
    setSelectedAsset({ symbol: assetSymbol, name: assetName });
    setShowModal(true);
  };

  const handleTimeframeSelect = (timeframe) => {
    // Navigate to test page with selected asset and timeframe
    const params = new URLSearchParams();
    params.append('timeframe', timeframe);
    navigate(`/test/${selectedAsset.symbol}?${params.toString()}`);
  };

  // For the random test option (cross-asset)
  const handleRandomTest = () => {
    setSelectedAsset({ symbol: 'random', name: 'Random Mix' });
    setShowModal(true);
  };

  if (loading) {
    return <div className="loading">Loading assets...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="bias-selection-container">
      <div className="section-header">
        <h1>Candle Bias <span className="highlight">Prediction</span></h1>
        <p>Test your ability to predict market direction based on chart patterns</p>
      </div>
      
      <div className="quick-access-grid">
        {/* Random Daily Bias Card */}
        <div className="quick-card random-bias">
          <div className="quick-card-inner">
            <div className="quick-icon">
              <i className="fas fa-random"></i>
            </div>
            <h3>Random Daily Bias</h3>
            <p>Challenge yourself with a variety of market conditions and scenarios across different assets. This test includes diverse chart patterns from multiple markets.</p>
            <div className="tool-info">
              <i className="fas fa-info-circle"></i> Mixed Markets & Timeframes
            </div>
            <button onClick={handleRandomTest} className="quick-btn">
              Start Test <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
        
        {/* BTC Card */}
        <div className="quick-card btc">
          <div className="quick-card-inner">
            <div className="quick-icon">
              <i className="fab fa-bitcoin"></i>
            </div>
            <h3>BTC</h3>
            <p>Focus on Bitcoin price action from the recent market. Perfect for crypto traders looking to hone their Bitcoin-specific prediction skills.</p>
            <div className="tool-info">
              <i className="fas fa-info-circle"></i> Bitcoin Focused Charts
            </div>
            <button onClick={() => handleAssetSelect('btc', 'Bitcoin')} className="quick-btn">
              Start Test <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>

        {/* ETH Card */}
        <div className="quick-card eth">
          <div className="quick-card-inner">
            <div className="quick-icon">
              <i className="fab fa-ethereum"></i>
            </div>
            <h3>ETH</h3>
            <p>Analyze Ethereum price action from recent market data. Ideal for traders focusing on Ethereum's unique market behavior.</p>
            <div className="tool-info">
              <i className="fas fa-info-circle"></i> Ethereum Focused Charts
            </div>
            <button onClick={() => handleAssetSelect('eth', 'Ethereum')} className="quick-btn">
              Start Test <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>

        {/* SOL Card */}
        <div className="quick-card sol">
          <div className="quick-card-inner">
            <div className="quick-icon">
              <i className="fas fa-bolt"></i>
            </div>
            <h3>SOL</h3>
            <p>Explore Solana price action from recent market data. Test your skills with this high-speed blockchain's price movements.</p>
            <div className="tool-info">
              <i className="fas fa-info-circle"></i> Solana Focused Charts
            </div>
            <button onClick={() => handleAssetSelect('sol', 'Solana')} className="quick-btn">
              Start Test <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>

        {/* NVDA Card */}
        <div className="quick-card nvda">
          <div className="quick-card-inner">
            <div className="quick-icon">
              <i className="fas fa-microchip"></i>
            </div>
            <h3>NVDA</h3>
            <p>Test your bias prediction skills on Nvidia stock, one of the most influential tech companies driving the AI revolution.</p>
            <div className="tool-info">
              <i className="fas fa-info-circle"></i> Tech Stock Analysis
            </div>
            <button onClick={() => handleAssetSelect('nvda', 'NVIDIA')} className="quick-btn">
              Start Test <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>

        {/* AAPL Card */}
        <div className="quick-card aapl">
          <div className="quick-card-inner">
            <div className="quick-icon">
              <i className="fab fa-apple"></i>
            </div>
            <h3>AAPL</h3>
            <p>Practice predicting Apple stock movements. A perfect choice for those interested in major tech companies and consumer electronics.</p>
            <div className="tool-info">
              <i className="fas fa-info-circle"></i> Consumer Tech Analysis
            </div>
            <button onClick={() => handleAssetSelect('aapl', 'Apple')} className="quick-btn">
              Start Test <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>

        {/* TSLA Card */}
        <div className="quick-card tsla">
          <div className="quick-card-inner">
            <div className="quick-icon">
              <i className="fas fa-car"></i>
            </div>
            <h3>TSLA</h3>
            <p>Study Tesla stock patterns and test your ability to predict its notoriously volatile price movements.</p>
            <div className="tool-info">
              <i className="fas fa-info-circle"></i> EV Market Leader
            </div>
            <button onClick={() => handleAssetSelect('tsla', 'Tesla')} className="quick-btn">
              Start Test <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
        
        {/* GLD Card */}
        <div className="quick-card gld">
          <div className="quick-card-inner">
            <div className="quick-icon">
              <i className="fas fa-coins"></i>
            </div>
            <h3>GLD</h3>
            <p>Test your prediction skills on gold price movements. Perfect for those interested in precious metals and safe haven assets.</p>
            <div className="tool-info">
              <i className="fas fa-info-circle"></i> Gold ETF Analysis
            </div>
            <button onClick={() => handleAssetSelect('gld', 'Gold ETF')} className="quick-btn">
              Start Test <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="prediction-guide">
        <div className="guide-header">
          <h2>How It Works</h2>
          <p>Test your ability to predict market direction after analyzing chart patterns</p>
        </div>
        
        <div className="guide-steps">
          <div className="guide-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Analyze the Chart</h3>
              <p>Review historical price action and identify key patterns</p>
            </div>
          </div>
          
          <div className="guide-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Make Your Prediction</h3>
              <p>Decide if price will move bullish or bearish</p>
            </div>
          </div>
          
          <div className="guide-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>See the Outcome</h3>
              <p>Review what actually happened and learn from the result</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Timeframe Selection Modal */}
      <TimeframeModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelect={handleTimeframeSelect}
        assetSymbol={selectedAsset?.symbol}
        assetName={selectedAsset?.name}
      />
    </div>
  );
};

export default AssetSelector;
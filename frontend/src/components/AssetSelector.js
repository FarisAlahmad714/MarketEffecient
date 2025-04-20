import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAssets } from '../services/api';
import './AssetSelector.css';

const AssetSelector = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  const startTest = (assetSymbol) => {
    navigate(`/test/${assetSymbol}`);
  };

  if (loading) {
    return <div className="loading">Loading assets...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="asset-selector">
      <h1>Welcome to the Daily Bias Test App</h1>
      <p>Select an asset to start your bias test:</p>
      
      {assets.crypto && (
        <div className="asset-group">
          <h2>Cryptocurrencies</h2>
          <ul>
            {assets.crypto.map((asset) => (
              <li key={asset.id}>
                <button onClick={() => startTest(asset.symbol)}>
                  {asset.name} ({asset.symbol.toUpperCase()})
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {assets.equity && (
        <div className="asset-group">
          <h2>Equities</h2>
          <ul>
            {assets.equity.map((asset) => (
              <li key={asset.id}>
                <button onClick={() => startTest(asset.symbol)}>
                  {asset.name} ({asset.symbol.toUpperCase()})
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AssetSelector;
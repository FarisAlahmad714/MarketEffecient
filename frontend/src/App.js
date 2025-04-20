import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AssetSelector from './components/AssetSelector';
import BiasTest from './components/BiasTest';
import Results from './components/Results';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<AssetSelector />} />
          <Route path="/test/:assetSymbol" element={<BiasTest />} />
          <Route path="/results/:assetSymbol" element={<Results />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
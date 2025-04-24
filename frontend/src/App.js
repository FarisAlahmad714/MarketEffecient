import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AssetSelector from './components/AssetSelector';
import BiasTest from './components/BiasTest';
import Results from './components/Results';
import ThemeToggle from './components/ThemeToggle';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="app">
          <ThemeToggle />
          <main>
            <Routes>
              <Route path="/" element={<AssetSelector />} />
              <Route path="/test/:assetSymbol" element={<BiasTest />} />
              <Route path="/results/:assetSymbol" element={<Results />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
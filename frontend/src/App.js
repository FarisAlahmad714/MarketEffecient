import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import AssetSelector from './components/AssetSelector';
import BiasTest from './components/BiasTest';
import Results from './components/Results';
import ChartingExams from './components/ChartingExams';
import ChartingExamIntro from './components/ChartingExamIntro';
import ChartingExamPractice from './components/ChartingExamPractice';
import ThemeToggle from './components/ThemeToggle';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="app">
          <Navbar />
          <ThemeToggle />
          <main>
            <Routes>
              {/* Home Route */}
              <Route path="/" element={<HomePage />} />
              
              {/* Bias Test Routes */}
              <Route path="/bias-test" element={<AssetSelector />} />
              <Route path="/test/:assetSymbol" element={<BiasTest />} />
              <Route path="/results/:assetSymbol" element={<Results />} />
              
              {/* Charting Exam Routes */}
              <Route path="/charting-exams" element={<ChartingExams />} />
              <Route path="/charting-exam/:examType" element={<ChartingExamIntro />} />
              <Route path="/charting-exam/:examType/practice" element={<ChartingExamPractice />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
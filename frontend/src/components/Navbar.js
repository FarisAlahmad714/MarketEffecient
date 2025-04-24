import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="main-navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Trading Toolkit
        </Link>
        <div className="navbar-menu">
          <Link to="/" className="navbar-item">Home</Link>
          <Link to="/bias-test" className="navbar-item">Daily Bias Test</Link>
          <Link to="/charting-exams" className="navbar-item">Charting Exams</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 
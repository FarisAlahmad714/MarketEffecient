import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getChartingExams } from '../services/chartingExamService';
import './ChartingExams.css';

const ChartingExams = () => {
  const [examTypes, setExamTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExamTypes = async () => {
      try {
        setLoading(true);
        const data = await getChartingExams();
        setExamTypes(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching exam types:', err);
        setError('Failed to load exam types. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchExamTypes();
  }, []);

  if (loading) {
    return <div className="loading">Loading exam types...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="charting-exams-container">
      <h1>Charting Exams</h1>
      <p className="lead">Improve your technical analysis skills with interactive charting exercises</p>
      
      <div className="exam-grid">
        {examTypes.map(exam => (
          <div key={exam.id} className={`exam-card ${exam.difficulty}`}>
            <div className="exam-icon">
              <i className={`fas fa-${exam.id === 'swing_analysis' ? 'chart-line' : 
                             exam.id === 'fibonacci_retracement' ? 'ruler' : 'expand'}`}></i>
            </div>
            <div className="exam-info">
              <h2>{exam.title}</h2>
              <span className={`difficulty-badge ${exam.difficulty}`}>
                {exam.difficulty.charAt(0).toUpperCase() + exam.difficulty.slice(1)}
              </span>
              <p>{exam.description}</p>
              <Link to={`/charting-exam/${exam.id}`} className="start-exam-btn">
                Start Exam
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartingExams; 
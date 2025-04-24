import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getExamInfo } from '../services/chartingExamService';
import './ChartingExamIntro.css';

const ChartingExamIntro = () => {
  const { examType } = useParams();
  const [examInfo, setExamInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchExamInfo = async () => {
      try {
        setLoading(true);
        const data = await getExamInfo(examType);
        setExamInfo(data);
        setError(null);
      } catch (err) {
        console.error(`Error fetching info for exam ${examType}:`, err);
        setError('Failed to load exam information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchExamInfo();
  }, [examType]);
  
  if (loading) {
    return <div className="loading">Loading exam information...</div>;
  }
  
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  if (!examInfo) {
    return <div className="error">Exam type not found</div>;
  }
  
  return (
    <div className="exam-intro-container">
      <div className="exam-intro-header">
        <h1>{examInfo.title}</h1>
        <div className="exam-difficulty">
          {examType === 'swing_analysis' && (
            <span className="difficulty beginner">Beginner</span>
          )}
          {examType === 'fibonacci_retracement' && (
            <span className="difficulty intermediate">Intermediate</span>
          )}
          {examType === 'gap_analysis' && (
            <span className="difficulty advanced">Advanced</span>
          )}
        </div>
      </div>
      
      <div className="exam-intro-body">
        <div className="exam-description">
          <h2>Overview</h2>
          <p>{examInfo.description}</p>
        </div>
        
        <div className="exam-details">
          <div className="exam-sections">
            <h2>Exam Sections</h2>
            <ul className="section-list">
              {examInfo.sections.map((section, index) => (
                <li key={section}>
                  <span className="section-icon">{index + 1}</span>
                  <span className="section-name">
                    {section.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="exam-tools">
            <h2>Required Tools</h2>
            <div className="tool-badges">
              {examInfo.tools_required.map(tool => (
                <span key={tool} className="tool-badge">
                  {tool.charAt(0).toUpperCase() + tool.slice(1)}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <div className="exam-instructions">
          <h2>Instructions</h2>
          <div className="instruction-container">
            <p>{examInfo.instructions}</p>
            <ul className="instruction-list">
              <li>You will be presented with 5 charts for each section</li>
              <li>Use the provided tools to identify the required patterns</li>
              <li>Submit your analysis and receive immediate feedback</li>
              <li>Complete all sections to finish the exam</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="exam-intro-footer">
        <Link to={`/charting-exam/${examType}/practice?section=${examInfo.sections[0]}`} className="btn-begin-practice">
          Begin Practice
        </Link>
        <Link to="/charting-exams" className="btn-back">
          Back to Exams
        </Link>
      </div>
    </div>
  );
};

export default ChartingExamIntro; 
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import TradingViewChart from './TradingViewChart';
import ChartDrawingTools from './ChartDrawingTools';
import axios from 'axios';
import './ChartExamWrapper.css';

interface ExamParams {
  examType: string;
  section?: string;
  chartNum?: number;
}

const ChartExamWrapper: React.FC = () => {
  const { examType = 'swing_analysis' } = useParams<{ examType: string }>();
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section') || '';
  const chartNum = parseInt(searchParams.get('chart_num') || '1', 10);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [examInfo, setExamInfo] = useState<any>({});
  const [chartWidth, setChartWidth] = useState(800);
  const [chartHeight, setChartHeight] = useState(600);
  const [drawings, setDrawings] = useState<any[]>([]);
  const [chartCount, setChartCount] = useState(1);
  const [feedback, setFeedback] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [scores, setScores] = useState<any[]>([]);
  
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Fetch exam info on initial load
  useEffect(() => {
    fetchExamInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examType]);
  
  // Fetch practice chart when section or chart number changes
  useEffect(() => {
    if (examInfo && Object.keys(examInfo).length > 0) {
      fetchPracticeChart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examType, section, chartNum, examInfo]);
  
  // Update chart dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (chartRef.current) {
        const { clientWidth, clientHeight } = chartRef.current;
        setChartWidth(clientWidth);
        setChartHeight(clientHeight);
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);
  
  const fetchExamInfo = async () => {
    try {
      const response = await axios.get(`/api/charting_exam/${examType}`);
      setExamInfo(response.data);
    } catch (err: any) {
      setError(`Error fetching exam info: ${err.message}`);
      console.error('Error fetching exam info:', err);
    }
  };
  
  const fetchPracticeChart = async () => {
    setLoading(true);
    try {
      let url = `/api/charting_exam/${examType}/practice`;
      if (section) {
        url += `?section=${section}`;
      }
      if (chartNum) {
        url += `${section ? '&' : '?'}chart_num=${chartNum}`;
      }
      
      const response = await axios.get(url);
      
      // Format the candle data for TradingViewChart
      const formattedCandles = response.data.chart_data.map((candle: any) => ({
        time: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close
      }));
      
      setChartData(formattedCandles);
      setChartCount(response.data.progress.chart_count || 1);
    } catch (err: any) {
      setError(`Error fetching practice chart: ${err.message}`);
      console.error('Error fetching practice chart:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchNextChart = async () => {
    if (chartCount >= 5) {
      showFinalResults();
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get('/api/charting_exam/next_chart', {
        params: { 
          exam_type: examType,
          section: section,
          chart_count: chartCount + 1
        }
      });
      
      const formattedCandles = response.data.chart_data.map((candle: any) => ({
        time: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close
      }));
      
      setChartData(formattedCandles);
      setChartCount(response.data.chart_count || chartCount + 1);
      setDrawings([]);
      setShowResults(false);
      setFeedback(null);
    } catch (err: any) {
      setError(`Error fetching next chart: ${err.message}`);
      console.error('Error fetching next chart:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleChartReady = () => {
    console.log('Chart is ready');
  };
  
  const handleSaveDrawings = (newDrawings: any[]) => {
    setDrawings(newDrawings);
  };
  
  const handleSubmitDrawings = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/api/charting_exam/validate', {
        examType: examType,
        section: section,
        drawings: drawings,
        chartNumber: chartCount
      });
      
      setFeedback(response.data);
      setShowResults(true);
      
      // Add to scores
      setScores(prev => [...prev, {
        chart: chartCount,
        score: response.data.score,
        totalPoints: response.data.totalExpectedPoints
      }]);
    } catch (err: any) {
      setError(`Error validating drawings: ${err.message}`);
      console.error('Error validating drawings:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const showFinalResults = () => {
    const totalScore = scores.reduce((sum, item) => sum + item.score, 0);
    const totalPossible = scores.reduce((sum, item) => sum + item.totalPoints, 0);
    const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
    
    setFeedback({
      finalResults: true,
      totalScore,
      totalPossible,
      percentage,
      chartScores: scores
    });
    
    setShowResults(true);
  };

  const resetExam = () => {
    setChartCount(1);
    setScores([]);
    setDrawings([]);
    setShowResults(false);
    setFeedback(null);
    fetchPracticeChart();
  };
  
  // Calculate price to Y coordinate and Y to price functions for the ChartDrawingTools
  const getChartDimensions = () => {
    if (!chartData || chartData.length === 0) {
      return {
        minPrice: 0,
        maxPrice: 0,
        minTime: 0,
        maxTime: 0
      };
    }
    
    const prices = chartData.flatMap(candle => [candle.low, candle.high]);
    const times = chartData.map(candle => candle.time);
    
    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    };
  };
  
  const { minPrice, maxPrice, minTime, maxTime } = getChartDimensions();
  
  const priceToY = (price: number): number => {
    if (maxPrice === minPrice) return 0;
    return chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;
  };
  
  const yToPrice = (y: number): number => {
    if (maxPrice === minPrice) return 0;
    return maxPrice - (y / chartHeight) * (maxPrice - minPrice);
  };
  
  const dateToX = (date: Date): number => {
    if (maxTime === minTime) return 0;
    return ((date.getTime() / 1000 - minTime) / (maxTime - minTime)) * chartWidth;
  };
  
  const xToDate = (x: number): Date => {
    if (maxTime === minTime) return new Date(0);
    const timestamp = minTime + (x / chartWidth) * (maxTime - minTime);
    return new Date(timestamp * 1000);
  };
  
  const renderToolbar = () => {
    // Get the appropriate tools based on exam type
    let tools: string[] = [];
    
    if (examInfo && examInfo.tools_required) {
      tools = examInfo.tools_required;
    } else {
      // Default tools based on exam type if not specified
      switch (examType) {
        case 'swing_analysis':
          tools = ['pointer', 'line', 'horizontalLine'];
          break;
        case 'fibonacci_retracement':
          tools = ['fibonacci'];
          break;
        case 'gap_analysis':
          tools = ['box', 'line'];
          break;
        default:
          tools = ['pointer', 'line', 'horizontalLine', 'box', 'fibonacci'];
      }
    }
    
    return (
      <div className="chart-exam-toolbar">
        <div className="tool-section">
          <h3>Drawing Tools</h3>
          <div className="tools-container">
            {/* Drawing tools will be managed by the ChartDrawingTools component */}
          </div>
        </div>
        
        <div className="action-section">
          <button 
            className="btn-submit"
            onClick={handleSubmitDrawings}
            disabled={drawings.length === 0}
          >
            Submit Answer
          </button>
        </div>
      </div>
    );
  };
  
  const renderFeedback = () => {
    if (!feedback) return null;
    
    if (feedback.finalResults) {
      // Render final results
      return (
        <div className="feedback-container final-results">
          <h3>Exam Complete!</h3>
          <div className="final-score">
            <span className="score-value">{feedback.totalScore}/{feedback.totalPossible}</span>
            <span className="score-percentage">{feedback.percentage}%</span>
          </div>
          
          <div className="score-bar">
            <div 
              className="score-progress" 
              style={{ width: `${feedback.percentage}%` }}
            ></div>
          </div>
          
          <div className="chart-breakdown">
            <h4>Chart by Chart Breakdown</h4>
            <ul className="chart-scores">
              {feedback.chartScores.map((score: any, index: number) => (
                <li key={index} className="chart-score-item">
                  <span className="chart-number">Chart {score.chart}</span>
                  <span className="chart-score">{score.score}/{score.totalPoints}</span>
                  <div className="chart-mini-bar">
                    <div 
                      className="chart-mini-progress" 
                      style={{ width: `${(score.score/score.totalPoints) * 100}%` }}
                    ></div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="feedback-actions">
            <button className="btn-primary" onClick={resetExam}>
              Try Again
            </button>
            <a href="/charting_exams" className="btn-secondary">
              Return to Exams
            </a>
          </div>
        </div>
      );
    }
    
    // Render analysis feedback
    return (
      <div className="feedback-container">
        <h3>Analysis Results</h3>
        
        <div className="score-summary">
          <span className="score-label">Score:</span>
          <span className={`score-value ${feedback.score > 0 ? 'positive' : 'negative'}`}>
            {feedback.score}/{feedback.totalExpectedPoints}
          </span>
        </div>
        
        <div className="score-bar">
          <div 
            className="score-progress" 
            style={{ width: `${(feedback.score/feedback.totalExpectedPoints) * 100}%` }}
          ></div>
        </div>
        
        {feedback.feedback && (
          <div className="feedback-details">
            {feedback.feedback.correct && feedback.feedback.correct.length > 0 && (
              <div className="correct-section">
                <h4>Correct Identifications</h4>
                <ul className="feedback-list">
                  {feedback.feedback.correct.map((item: any, index: number) => (
                    <li key={index} className="feedback-item correct">
                      <span className="feedback-type">{item.type}</span>
                      <p className="feedback-advice">{item.advice}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {feedback.feedback.incorrect && feedback.feedback.incorrect.length > 0 && (
              <div className="incorrect-section">
                <h4>Areas for Improvement</h4>
                <ul className="feedback-list">
                  {feedback.feedback.incorrect.map((item: any, index: number) => (
                    <li key={index} className="feedback-item incorrect">
                      <span className="feedback-type">{item.type || 'Error'}</span>
                      <p className="feedback-advice">{item.advice}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        <div className="feedback-actions">
          <button className="btn-primary" onClick={fetchNextChart}>
            {chartCount >= 5 ? 'Show Final Results' : 'Next Chart'}
          </button>
        </div>
      </div>
    );
  };
  
  if (error) {
    return (
      <div className="chart-exam-error">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={fetchPracticeChart}>Retry</button>
      </div>
    );
  }
  
  return (
    <div className="chart-exam-wrapper">
      <h2 className="exam-title">
        {examInfo.title || `${examType.replace('_', ' ')} Exam`}
      </h2>
      
      <div className="exam-description">
        <p>{examInfo.description || 'Chart analysis exercise'}</p>
      </div>
      
      <div className="exam-progress">
        <span className="chart-indicator">Chart {chartCount}/5</span>
        <div className="progress-bar">
          <div 
            className="progress" 
            style={{ width: `${(chartCount / 5) * 100}%` }}
          ></div>
        </div>
      </div>
      
      <div className={`chart-container ${showResults ? 'with-results' : ''}`}>
        <div className="chart-section" ref={chartRef}>
          {loading ? (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <p>Loading chart...</p>
            </div>
          ) : (
            <>
              <div className="chart-header">
                <h3>{chartData[0]?.symbol || 'BTC/USD'}</h3>
              </div>
              <div className="chart-view">
                <TradingViewChart
                  data={{ candles: chartData }}
                  onChartReady={handleChartReady}
                  options={{
                    height: chartHeight,
                    width: chartWidth
                  }}
                />
                
                <ChartDrawingTools
                  chartRef={chartRef}
                  chartWidth={chartWidth}
                  chartHeight={chartHeight}
                  priceToY={priceToY}
                  yToPrice={yToPrice}
                  dateToX={dateToX}
                  xToDate={xToDate}
                  onSaveDrawings={handleSaveDrawings}
                  savedDrawings={drawings}
                />
              </div>
              
              {renderToolbar()}
            </>
          )}
        </div>
        
        {showResults && (
          <div className="results-section">
            {renderFeedback()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartExamWrapper; 
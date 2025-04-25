import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import TradingViewChart from './TradingViewChart';
import ChartDrawingTools from './ChartDrawingTools';
import api, { getChartingExamInfo, getPracticeChart, getNextChart, validateChartingExam } from '../services/api';
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
  
  // Define available tools for each exam type
  const examTools = {
    'swing_analysis': ['pointer', 'line'],
    'fibonacci_retracement': ['fibonacci'],
    'gap_analysis': ['box', 'line'],
    'order_blocks': ['box', 'line', 'pointer']
  };
  
  // Get the tools for the current exam type
  const getAvailableTools = (): string[] => {
    const normalizedExamType = examType.replace(/-/g, '_');
    return examTools[normalizedExamType as keyof typeof examTools] || ['pointer', 'line'];
  };
  
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
      const data = await getChartingExamInfo(examType);
      setExamInfo(data);
    } catch (err: any) {
      setError(`Error fetching exam info: ${err.message}`);
      console.error('Error fetching exam info:', err);
    }
  };
  
  const fetchPracticeChart = async () => {
    setLoading(true);
    try {
      const data = await getPracticeChart(examType, section, chartNum);
      
      // Format the candle data for TradingViewChart
      const formattedCandles = data.chart_data.map((candle: any) => ({
        time: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close
      }));
      
      setChartData(formattedCandles);
      setChartCount(data.progress.chart_count || 1);
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
      const data = await getNextChart(examType, section, chartCount + 1);
      
      const formattedCandles = data.chart_data.map((candle: any) => ({
        time: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close
      }));
      
      setChartData(formattedCandles);
      setChartCount(data.chart_count || chartCount + 1);
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
      // Format the drawings for validation
      // Ensure each drawing has time and price information
      const formattedDrawings = drawings.map(drawing => {
        // For pointer/swing point drawings
        if (drawing.type === 'pointer') {
          // Make sure to include point type (high or low)
          return {
            type: 'pointer',
            pointType: drawing.pointType || 'high',
            time: drawing.time || xToDate(drawing.points[0].x).getTime() / 1000,
            price: drawing.price || yToPrice(drawing.points[0].y),
            points: drawing.points
          };
        }
        // For other drawing types
        return {
          ...drawing,
          time: drawing.time || (drawing.points && drawing.points.length > 0 ? xToDate(drawing.points[0].x).getTime() / 1000 : 0),
          price: drawing.price || (drawing.points && drawing.points.length > 0 ? yToPrice(drawing.points[0].y) : 0)
        };
      });
      
      const data = {
        examType: examType,
        section: section,
        drawings: formattedDrawings,
        chartNumber: chartCount,
        chartData: chartData, // Include the chart data for validation
        interval: examInfo.timeframe || 'daily'
      };
      
      const result = await validateChartingExam(examType, data);
      
      setFeedback(result);
      setShowResults(true);
      
      // Add to scores
      setScores(prev => [...prev, {
        chart: chartCount,
        score: result.score,
        totalPoints: result.totalExpectedPoints
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
    
    // Calculate min and max prices from chart data
    const prices = chartData.flatMap(candle => [candle.high, candle.low]);
    const times = chartData.map(candle => candle.time);
    
    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    };
  };

  // Convert price to Y coordinate
  const priceToY = (price: number): number => {
    const { minPrice, maxPrice } = getChartDimensions();
    return chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;
  };
  
  // Convert Y coordinate to price
  const yToPrice = (y: number): number => {
    const { minPrice, maxPrice } = getChartDimensions();
    return minPrice + ((chartHeight - y) / chartHeight) * (maxPrice - minPrice);
  };
  
  // Convert date to X coordinate
  const dateToX = (date: Date): number => {
    const { minTime, maxTime } = getChartDimensions();
    const time = date.getTime() / 1000;
    return ((time - minTime) / (maxTime - minTime)) * chartWidth;
  };
  
  // Convert X coordinate to date
  const xToDate = (x: number): Date => {
    const { minTime, maxTime } = getChartDimensions();
    const time = minTime + (x / chartWidth) * (maxTime - minTime);
    return new Date(time * 1000);
  };
  
  const renderToolbar = () => {
    const availableTools = getAvailableTools();
    
    // Get exam-specific instructions
    let instructions = '';
    if (examType === 'swing_analysis') {
      instructions = 'Mark all significant swing highs and lows using the pointer tool';
    } else if (examType === 'fibonacci_retracement') {
      instructions = 'Draw a Fibonacci retracement from the significant swing high to swing low';
    } else if (examType === 'gap_analysis') {
      instructions = 'Identify and mark fair value gaps using the box tool';
    } else if (examType === 'order_blocks') {
      instructions = 'Identify and mark order blocks and liquidity using the box tool';
    }
    
    return (
      <div className="charting-toolbar">
        <div className="exam-info">
          <h3>{examInfo.title || 'Charting Exam'}</h3>
          <p className="instructions">{instructions}</p>
          <div className="exam-progress">
            Chart {chartCount} of 5
          </div>
        </div>
        <div className="tool-container">
          {availableTools.includes('pointer') && (
            <button
              className={`tool-button ${drawings.some(d => d.type === 'pointer') ? 'active' : ''}`}
              title="Mark swing points"
            >
              Pointer Tool
            </button>
          )}
          {availableTools.includes('line') && (
            <button
              className={`tool-button ${drawings.some(d => d.type === 'line') ? 'active' : ''}`}
              title="Draw trend lines"
            >
              Line Tool
            </button>
          )}
          {availableTools.includes('box') && (
            <button
              className={`tool-button ${drawings.some(d => d.type === 'box') ? 'active' : ''}`}
              title="Draw boxes for gaps or zones"
            >
              Box Tool
            </button>
          )}
          {availableTools.includes('fibonacci') && (
            <button
              className={`tool-button ${drawings.some(d => d.type === 'fibonacci') ? 'active' : ''}`}
              title="Draw Fibonacci retracement levels"
            >
              Fibonacci Tool
            </button>
          )}
        </div>
        <button 
          className="submit-button" 
          onClick={handleSubmitDrawings}
        >
          Submit Analysis
        </button>
      </div>
    );
  };
  
  const renderFeedback = () => {
    if (!feedback) return null;
    
    if (feedback.finalResults) {
      return (
        <div className="feedback-container final-results">
          <h3>Exam Results</h3>
          <div className="score-summary">
            <p>Your score: {feedback.totalScore} / {feedback.totalPossible}</p>
            <p>Percentage: {feedback.percentage}%</p>
          </div>
          <div className="chart-scores">
            <h4>Scores by Chart</h4>
            <ul>
              {feedback.chartScores.map((score, index) => (
                <li key={index}>
                  Chart {score.chart}: {score.score} / {score.totalPoints}
                </li>
              ))}
            </ul>
          </div>
          <button className="reset-button" onClick={resetExam}>
            Start New Exam
          </button>
        </div>
      );
    }
    
    return (
      <div className="feedback-container">
        <h3>Chart {chartCount} Feedback</h3>
        <p>Score: {feedback.score} / {feedback.totalExpectedPoints}</p>
        <div className="feedback-sections">
          {feedback.feedback && feedback.feedback.correct && (
            <div className="correct-feedback">
              <h4>Correct Elements:</h4>
              <ul>
                {feedback.feedback.correct.map((item, index) => (
                  <li key={`correct-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {feedback.feedback && feedback.feedback.incorrect && (
            <div className="incorrect-feedback">
              <h4>Needs Improvement:</h4>
              <ul>
                {feedback.feedback.incorrect.map((item, index) => (
                  <li key={`incorrect-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="navigation-buttons">
          {chartCount < 5 ? (
            <button className="next-button" onClick={fetchNextChart}>
              Next Chart
            </button>
          ) : (
            <button className="finish-button" onClick={showFinalResults}>
              View Final Results
            </button>
          )}
        </div>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading chart data...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container">
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={fetchPracticeChart}>Retry</button>
      </div>
    );
  }
  
  return (
    <div className="chart-exam-container">
      {renderToolbar()}
      
      <div className="chart-container" ref={chartRef}>
        {chartData.length > 0 && (
          <>
            <TradingViewChart 
              data={chartData} 
              onChartReady={handleChartReady}
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
              candleData={chartData}
              availableTools={getAvailableTools() as any[]}
              examType={examType}
            />
          </>
        )}
      </div>
      
      {showResults && renderFeedback()}
    </div>
  );
};

export default ChartExamWrapper; 
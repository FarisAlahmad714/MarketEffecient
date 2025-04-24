import React, { useRef, useState, useEffect } from 'react';
import ChartDrawingTools from './ChartDrawingTools';

const MOCK_CHART_DATA = [
  { date: new Date('2023-01-01'), price: 150 },
  { date: new Date('2023-01-02'), price: 155 },
  { date: new Date('2023-01-03'), price: 153 },
  { date: new Date('2023-01-04'), price: 158 },
  { date: new Date('2023-01-05'), price: 160 },
  { date: new Date('2023-01-06'), price: 157 },
  { date: new Date('2023-01-07'), price: 162 },
  { date: new Date('2023-01-08'), price: 165 },
  { date: new Date('2023-01-09'), price: 168 },
  { date: new Date('2023-01-10'), price: 170 },
];

const ChartDrawingToolsDemo: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(800);
  const [chartHeight, setChartHeight] = useState(400);
  const [savedDrawings, setSavedDrawings] = useState<any[]>([]);
  
  // Calculate chart dimensions on mount and resize
  useEffect(() => {
    const updateChartDimensions = () => {
      if (chartRef.current) {
        setChartWidth(chartRef.current.clientWidth);
        setChartHeight(chartRef.current.clientHeight);
      }
    };
    
    updateChartDimensions();
    window.addEventListener('resize', updateChartDimensions);
    
    return () => {
      window.removeEventListener('resize', updateChartDimensions);
    };
  }, []);
  
  // Calculate the min and max prices for the Y axis
  const minPrice = Math.min(...MOCK_CHART_DATA.map(d => d.price)) - 10;
  const maxPrice = Math.max(...MOCK_CHART_DATA.map(d => d.price)) + 10;
  
  // Calculate the min and max dates for the X axis
  const minDate = MOCK_CHART_DATA[0].date;
  const maxDate = MOCK_CHART_DATA[MOCK_CHART_DATA.length - 1].date;
  
  // Define the conversion functions for coordinates
  const priceToY = (price: number): number => {
    return chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;
  };
  
  const yToPrice = (y: number): number => {
    return maxPrice - (y / chartHeight) * (maxPrice - minPrice);
  };
  
  const dateToX = (date: Date): number => {
    const dateTime = date.getTime();
    const minDateTime = minDate.getTime();
    const maxDateTime = maxDate.getTime();
    return ((dateTime - minDateTime) / (maxDateTime - minDateTime)) * chartWidth;
  };
  
  const xToDate = (x: number): Date => {
    const minDateTime = minDate.getTime();
    const maxDateTime = maxDate.getTime();
    const dateTime = minDateTime + (x / chartWidth) * (maxDateTime - minDateTime);
    return new Date(dateTime);
  };
  
  // Handler for saving drawings
  const handleSaveDrawings = (drawings: any[]) => {
    setSavedDrawings(drawings);
    console.log('Drawings saved:', drawings);
    
    // In a real application, you'd likely save this to localStorage or a database
    localStorage.setItem('chartDrawings', JSON.stringify(drawings));
  };
  
  // Draw mock price chart
  const renderPriceChart = () => {
    // Create points for the line
    const points = MOCK_CHART_DATA.map(d => ({
      x: dateToX(d.date),
      y: priceToY(d.price),
    }));
    
    // Create the path
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    
    return (
      <svg width={chartWidth} height={chartHeight}>
        {/* Draw axis */}
        <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#ccc" />
        <line x1="0" y1="0" x2="0" y2={chartHeight} stroke="#ccc" />
        
        {/* Draw price points */}
        <path d={path} stroke="#2196f3" fill="none" strokeWidth="2" />
        
        {/* Draw price labels */}
        {[minPrice, (minPrice + maxPrice) / 2, maxPrice].map((price, i) => (
          <g key={`price-${i}`}>
            <line 
              x1="0" 
              y1={priceToY(price)} 
              x2={chartWidth} 
              y2={priceToY(price)} 
              stroke="#eee" 
              strokeDasharray="3,3" 
            />
            <text 
              x="5" 
              y={priceToY(price) - 5} 
              fill="#666" 
              fontSize="12"
            >
              {price.toFixed(2)}
            </text>
          </g>
        ))}
        
        {/* Draw date labels */}
        {MOCK_CHART_DATA.filter((_, i) => i % 2 === 0).map((d, i) => (
          <g key={`date-${i}`}>
            <line 
              x1={dateToX(d.date)} 
              y1="0" 
              x2={dateToX(d.date)} 
              y2={chartHeight} 
              stroke="#eee" 
              strokeDasharray="3,3" 
            />
            <text 
              x={dateToX(d.date) - 30} 
              y={chartHeight - 5} 
              fill="#666" 
              fontSize="10"
            >
              {d.date.toLocaleDateString()}
            </text>
          </g>
        ))}
      </svg>
    );
  };
  
  return (
    <div className="chart-demo-container" style={{ padding: '20px' }}>
      <h2>Chart Drawing Tools Demo</h2>
      <p>Use the toolbar below to draw on the chart. Try different tools like lines, boxes, and Fibonacci retracement levels.</p>
      
      <div 
        ref={chartRef} 
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '500px', 
          border: '1px solid #ddd',
          borderRadius: '8px',
          overflow: 'hidden',
          marginTop: '20px',
          backgroundColor: '#fff'
        }}
      >
        {renderPriceChart()}
        
        <ChartDrawingTools
          chartRef={chartRef}
          chartWidth={chartWidth}
          chartHeight={chartHeight}
          priceToY={priceToY}
          yToPrice={yToPrice}
          dateToX={dateToX}
          xToDate={xToDate}
          onSaveDrawings={handleSaveDrawings}
          savedDrawings={savedDrawings}
        />
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Instructions:</h3>
        <ul>
          <li><strong>Pointer Tool:</strong> Select and move existing drawings</li>
          <li><strong>Line Tool:</strong> Draw trend lines</li>
          <li><strong>Horizontal Line Tool:</strong> Draw horizontal support/resistance lines</li>
          <li><strong>Box Tool:</strong> Draw rectangles to highlight areas</li>
          <li><strong>Fibonacci Tool:</strong> Draw Fibonacci retracement levels</li>
        </ul>
      </div>
    </div>
  );
};

export default ChartDrawingToolsDemo; 
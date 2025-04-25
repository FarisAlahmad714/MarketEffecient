import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMousePointer, faDrawPolygon, faPen, faChartLine, 
  faRulerHorizontal, faVectorSquare, faEraser, faUndo, 
  faTrashAlt, faSave, faEye, faEyeSlash
} from '@fortawesome/free-solid-svg-icons';
import './ChartDrawingTools.css';

type Point = { x: number; y: number };
type DrawingTool = 'pointer' | 'line' | 'horizontalLine' | 'box' | 'fibonacci';

interface DrawingObject {
  id: string;
  type: DrawingTool;
  points: Point[];
  visible: boolean;
  color: string;
  selected: boolean;
  pointType?: 'high' | 'low'; // For swing points
}

interface FibonacciLevels {
  level: number;
  value: number;
  color: string;
}

interface ChartDrawingToolsProps {
  chartRef: React.RefObject<HTMLDivElement>;
  chartWidth: number;
  chartHeight: number;
  priceToY: (price: number) => number;
  yToPrice: (y: number) => number;
  dateToX: (date: Date) => number;
  xToDate: (x: number) => Date;
  onSaveDrawings?: (drawings: DrawingObject[]) => void;
  savedDrawings?: DrawingObject[];
  candleData?: any[];
  availableTools?: DrawingTool[]; // New prop to restrict available tools
  examType?: string; // New prop to customize behavior based on exam type
}

// Define candle interface for finding the closest wick
interface Candle {
  x: number;
  y: number;
  high: number;
  low: number;
  open: number;
  close: number;
  time: number;
  wickTop?: number;
  wickBottom?: number;
}

const DEFAULT_COLORS = {
  line: '#2196f3',
  horizontalLine: '#4caf50',
  box: '#ff9800',
  fibonacci: '#9c27b0',
};

const FIBONACCI_LEVELS: FibonacciLevels[] = [
  { level: 0, value: 0, color: 'rgba(76, 175, 80, 0.6)' },
  { level: 0.236, value: 0.236, color: 'rgba(33, 150, 243, 0.6)' },
  { level: 0.382, value: 0.382, color: 'rgba(156, 39, 176, 0.6)' },
  { level: 0.5, value: 0.5, color: 'rgba(255, 152, 0, 0.6)' },
  { level: 0.618, value: 0.618, color: 'rgba(233, 30, 99, 0.6)' },
  { level: 0.786, value: 0.786, color: 'rgba(63, 81, 181, 0.6)' },
  { level: 1, value: 1, color: 'rgba(244, 67, 54, 0.6)' },
];

const ChartDrawingTools: React.FC<ChartDrawingToolsProps> = ({
  chartRef,
  chartWidth,
  chartHeight,
  priceToY,
  yToPrice,
  dateToX,
  xToDate,
  onSaveDrawings,
  savedDrawings = [],
  candleData = [],
  availableTools = ['pointer', 'line', 'horizontalLine', 'box', 'fibonacci'], // Default to all tools if not specified
  examType = 'swing_analysis'
}) => {
  const [activeTool, setActiveTool] = useState<DrawingTool | null>(null);
  const [drawings, setDrawings] = useState<DrawingObject[]>(savedDrawings);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingObject | null>(null);
  const [showAllDrawings, setShowAllDrawings] = useState(true);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [svgModeEnabled, setSvgModeEnabled] = useState(true);
  const [pointType, setPointType] = useState<'high' | 'low'>('high'); // For swing analysis
  
  const svgRef = useRef<SVGSVGElement>(null);
  const drawingHistoryRef = useRef<DrawingObject[][]>([]);
  
  useEffect(() => {
    if (savedDrawings.length > 0 && drawings.length === 0) {
      setDrawings(savedDrawings);
    }
  }, [savedDrawings]);
  
  useEffect(() => {
    // When drawings change, store the current state in history
    if (drawings.length > 0) {
      drawingHistoryRef.current.push([...drawings]);
      // Limit history to last 20 states
      if (drawingHistoryRef.current.length > 20) {
        drawingHistoryRef.current.shift();
      }
    }
  }, [drawings]);
  
  useEffect(() => {
    // Save drawings when they change if callback is provided
    if (onSaveDrawings) {
      onSaveDrawings(drawings);
    }
  }, [drawings, onSaveDrawings]);
  
  // Effect to update SVG mode
  useEffect(() => {
    if (svgRef.current) {
      svgRef.current.style.pointerEvents = svgModeEnabled ? 'all' : 'none';
    }
  }, [svgModeEnabled]);
  
  // Find the closest candlewick to a point
  const findClosestCandlewick = (x: number, y: number): Point => {
    if (!candleData || candleData.length === 0) {
      return { x, y }; // Return original point if no candle data
    }
    
    // Process candle data to calculate x positions and wick locations
    const processedCandles: Candle[] = candleData.map((candle, index) => {
      // Convert time to x coordinate - this assumes candleData has time property
      const candleX = dateToX(new Date(candle.time * 1000));
      // Convert price values to y coordinates
      const highY = priceToY(candle.high);
      const lowY = priceToY(candle.low);
      const openY = priceToY(candle.open);
      const closeY = priceToY(candle.close);
      
      // The body top and bottom
      const bodyTop = Math.min(openY, closeY);
      const bodyBottom = Math.max(openY, closeY);
      
      return {
        ...candle,
        x: candleX,
        y: (highY + lowY) / 2, // Center point of the candle
        highY,
        lowY,
        openY,
        closeY,
        wickTop: highY, // Top of the wick
        wickBottom: lowY, // Bottom of the wick
        bodyTop,
        bodyBottom
      };
    });
    
    // Find the closest candle based on x position
    const closestCandle = processedCandles.reduce((closest, candle) => {
      const distanceX = Math.abs(candle.x - x);
      const currentClosestDistance = Math.abs(closest.x - x);
      return distanceX < currentClosestDistance ? candle : closest;
    }, processedCandles[0]);
    
    if (!closestCandle) return { x, y };
    
    // Determine if the click is closer to the top wick or bottom wick
    const distanceToTopWick = Math.abs(y - closestCandle.wickTop);
    const distanceToBottomWick = Math.abs(y - closestCandle.wickBottom);
    
    // Return the closest point on the wick
    if (distanceToTopWick <= distanceToBottomWick) {
      return { x: closestCandle.x, y: closestCandle.wickTop };
    } else {
      return { x: closestCandle.x, y: closestCandle.wickBottom };
    }
  };
  
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (!svgRef.current) return;
      
      // If SVG mode is disabled and no tool is active, allow normal chart interaction
      if (!svgModeEnabled && !activeTool) return;
      
      const svgRect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - svgRect.left;
      const y = e.clientY - svgRect.top;
      
      if (x < 0 || x > chartWidth || y < 0 || y > chartHeight) return;
      
      if (activeTool === 'pointer') {
        // First check if clicking on an existing drawing
        const clicked = drawings.find(drawing => isPointOnDrawing(drawing, { x, y }));
        if (clicked) {
          setDrawings(drawings.map(d => ({
            ...d,
            selected: d.id === clicked.id,
          })));
          return;
        }
        
        // If no existing drawing found, create a new pointer at the closest candlewick
        const wickPoint = findClosestCandlewick(x, y);
        
        const newDrawing: DrawingObject = {
          id: `pointer-${Date.now()}`,
          type: 'pointer',
          points: [wickPoint],
          visible: true,
          color: '#FF5722',
          selected: false,
        };
        
        setDrawings([...drawings, newDrawing]);
        return;
      }
      
      // If not pointing or SVG mode disabled, deselect all drawings
      if (!activeTool || !svgModeEnabled) {
        setDrawings(drawings.map(d => ({
          ...d,
          selected: false,
        })));
        return;
      }
      
      // Start a new drawing for other tools
      const newDrawing: DrawingObject = {
        id: `drawing-${Date.now()}`,
        type: activeTool,
        points: [{ x, y }],
        visible: true,
        color: DEFAULT_COLORS[activeTool] || '#2196f3',
        selected: false,
      };
      
      setCurrentDrawing(newDrawing);
      setIsDrawing(true);
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      
      // If SVG mode is disabled and no tool is active, allow normal chart interaction
      if (!svgModeEnabled && !activeTool) return;
      
      const svgRect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - svgRect.left;
      const y = e.clientY - svgRect.top;
      
      // Show tooltip with price at current Y position
      if (x >= 0 && x <= chartWidth && y >= 0 && y <= chartHeight) {
        const price = yToPrice(y).toFixed(2);
        const date = xToDate(x).toLocaleString();
        setTooltip({
          text: `Price: ${price} | Date: ${new Date(date).toLocaleDateString()}`,
          x: e.clientX + 10,
          y: e.clientY + 10,
        });
      } else {
        setTooltip(null);
      }
      
      if (!isDrawing || !currentDrawing) return;
      
      // Update the current drawing based on mouse movement
      switch (currentDrawing.type) {
        case 'line':
        case 'fibonacci':
          setCurrentDrawing({
            ...currentDrawing,
            points: [currentDrawing.points[0], { x, y }],
          });
          break;
        case 'horizontalLine':
          setCurrentDrawing({
            ...currentDrawing,
            points: [currentDrawing.points[0], { x, currentDrawing.points[0].y }],
          });
          break;
        case 'box':
          setCurrentDrawing({
            ...currentDrawing,
            points: [currentDrawing.points[0], { x, y }],
          });
          break;
        default:
          break;
      }
    };
    
    const handleMouseUp = () => {
      if (!isDrawing || !currentDrawing || currentDrawing.points.length < 2) {
        setIsDrawing(false);
        setCurrentDrawing(null);
        return;
      }
      
      // Add the completed drawing to the list
      setDrawings([...drawings, currentDrawing]);
      setIsDrawing(false);
      setCurrentDrawing(null);
    };
    
    if (chartRef.current) {
      chartRef.current.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      if (chartRef.current) {
        chartRef.current.removeEventListener('mousedown', handleMouseDown);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    activeTool, 
    chartRef, 
    isDrawing, 
    currentDrawing, 
    drawings, 
    chartWidth, 
    chartHeight, 
    yToPrice, 
    xToDate,
    svgModeEnabled,
    candleData
  ]);
  
  const isPointOnDrawing = (drawing: DrawingObject, point: Point): boolean => {
    const { type, points } = drawing;
    
    if (points.length < 2) return false;
    
    const [p1, p2] = points;
    
    switch (type) {
      case 'line':
      case 'fibonacci':
      case 'horizontalLine': {
        // Check if point is close to the line
        const distance = distanceToLine(p1, p2, point);
        return distance < 10; // 10px tolerance
      }
      case 'box': {
        // Check if point is inside the box
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        
        // Either inside or near the border
        return (
          (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) ||
          (Math.abs(point.x - minX) < 5 && point.y >= minY && point.y <= maxY) ||
          (Math.abs(point.x - maxX) < 5 && point.y >= minY && point.y <= maxY) ||
          (Math.abs(point.y - minY) < 5 && point.x >= minX && point.x <= maxX) ||
          (Math.abs(point.y - maxY) < 5 && point.x >= minX && point.x <= maxX)
        );
      }
      default:
        return false;
    }
  };
  
  const distanceToLine = (p1: Point, p2: Point, p: Point): number => {
    const A = p.x - p1.x;
    const B = p.y - p1.y;
    const C = p2.x - p1.x;
    const D = p2.y - p1.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = p1.x;
      yy = p1.y;
    } else if (param > 1) {
      xx = p2.x;
      yy = p2.y;
    } else {
      xx = p1.x + param * C;
      yy = p1.y + param * D;
    }
    
    const dx = p.x - xx;
    const dy = p.y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  const handleDeleteSelected = () => {
    setDrawings(drawings.filter(d => !d.selected));
  };
  
  const handleUndoLastDrawing = () => {
    if (drawingHistoryRef.current.length > 1) {
      const newHistory = [...drawingHistoryRef.current];
      newHistory.pop(); // Remove current state
      const previousState = newHistory[newHistory.length - 1];
      setDrawings([...previousState]);
      drawingHistoryRef.current = newHistory;
    } else if (drawings.length > 0) {
      setDrawings([]);
    }
  };
  
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all drawings?')) {
      setDrawings([]);
      drawingHistoryRef.current = [];
    }
  };
  
  const handleSaveDrawings = () => {
    if (onSaveDrawings) {
      onSaveDrawings(drawings);
    }
  };
  
  const handleToggleDrawingVisibility = (id: string) => {
    setDrawings(
      drawings.map(d => 
        d.id === id ? { ...d, visible: !d.visible } : d
      )
    );
  };
  
  const handleToggleAllDrawings = () => {
    setShowAllDrawings(!showAllDrawings);
    setDrawings(
      drawings.map(d => ({ ...d, visible: !showAllDrawings }))
    );
  };
  
  // Add renderPointer function to render the pointer marker
  const renderPointer = (point: Point, color: string, selected: boolean) => {
    return (
      <>
        {/* Draw a circle at the point */}
        <circle 
          cx={point.x} 
          cy={point.y} 
          r={selected ? 8 : 6}
          fill={selected ? 'rgba(255, 87, 34, 0.8)' : 'rgba(255, 87, 34, 0.6)'}
          stroke={color}
          strokeWidth={selected ? 2 : 1}
          className="pointer"
        />
        {/* Add a vertical line to make it look like a pointer */}
        <line 
          x1={point.x} 
          y1={point.y - 15} 
          x2={point.x} 
          y2={point.y + 15}
          stroke={color}
          strokeWidth={selected ? 2 : 1}
          strokeDasharray={selected ? "none" : "3,3"}
          className="pointer-line"
        />
        {/* Show price label */}
        <text
          x={point.x + 10}
          y={point.y - 10}
          fill={color}
          fontSize="12"
          fontWeight={selected ? "bold" : "normal"}
        >
          {yToPrice(point.y).toFixed(2)}
        </text>
      </>
    );
  };
  
  const renderDrawing = (drawing: DrawingObject) => {
    if (!drawing.visible) return null;
    
    const { type, points, color, selected } = drawing;
    
    if (points.length < 2) return null;
    
    const [p1, p2] = points;
    const strokeWidth = selected ? 2 : 1;
    const strokeDasharray = selected ? '5,3' : 'none';
    
    // For pointer type, render a special marker
    if (type === 'pointer' && points.length === 1) {
      return renderPointer(points[0], color, selected);
    }
    
    switch (type) {
      case 'line':
        return (
          <line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
        );
      case 'horizontalLine':
        return (
          <line
            x1={0}
            y1={p1.y}
            x2={chartWidth}
            y2={p1.y}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
        );
      case 'box': {
        const minX = Math.min(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const width = Math.abs(p2.x - p1.x);
        const height = Math.abs(p2.y - p1.y);
        
        return (
          <rect
            x={minX}
            y={minY}
            width={width}
            height={height}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            fill="none"
          />
        );
      }
      case 'fibonacci': {
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        const height = maxY - minY;
        
        return (
          <g className="fibonacci-tool">
            {FIBONACCI_LEVELS.map((level) => {
              const levelY = p1.y > p2.y
                ? p1.y - (height * level.value)
                : p1.y + (height * level.value);
                
              return (
                <React.Fragment key={`fib-${level.value}`}>
                  <line
                    x1={0}
                    y1={levelY}
                    x2={chartWidth}
                    y2={levelY}
                    stroke={level.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                  />
                  <text
                    x={chartWidth - 70}
                    y={levelY - 5}
                    fill={level.color}
                    fontSize="12"
                  >
                    {`${level.value} - ${yToPrice(levelY).toFixed(2)}`}
                  </text>
                </React.Fragment>
              );
            })}
            <line
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray="3,3"
            />
          </g>
        );
      }
      default:
        return null;
    }
  };
  
  // Start drawing when mouse is clicked
  const startDrawing = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!activeTool) return;
    
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;
    
    // Find closest candle wick for more precise placement (especially for swing points)
    const snapToWick = examType === 'swing_analysis' && activeTool === 'pointer';
    const point = snapToWick ? findClosestCandlewick(x, y) : { x, y };
    
    // Get price and time for the point
    const time = xToDate(point.x).getTime() / 1000; // Convert to seconds
    const price = yToPrice(point.y);
    
    const id = `drawing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let newDrawing: DrawingObject;
    
    switch (activeTool) {
      case 'pointer':
        newDrawing = {
          id,
          type: 'pointer',
          points: [{ x: point.x, y: point.y }],
          visible: true,
          color: pointType === 'high' ? '#ff4560' : '#00e396', // Red for highs, green for lows
          selected: false,
          pointType // Store the point type (high or low)
        };
        break;
        
      case 'line':
        newDrawing = {
          id,
          type: 'line',
          points: [{ x: point.x, y: point.y }, { x: point.x, y: point.y }],
          visible: true,
          color: '#2196f3',
          selected: false
        };
        break;
        
      case 'horizontalLine':
        newDrawing = {
          id,
          type: 'horizontalLine',
          points: [{ x: 0, y: point.y }, { x: chartWidth, y: point.y }],
          visible: true,
          color: '#4caf50',
          selected: false
        };
        // Horizontal lines are created immediately
        setDrawings([...drawings, newDrawing]);
        setCurrentDrawing(null);
        return;
        
      case 'box':
        newDrawing = {
          id,
          type: 'box',
          points: [
            { x: point.x, y: point.y }, // top-left
            { x: point.x, y: point.y }  // bottom-right
          ],
          visible: true,
          color: '#ff9800',
          selected: false
        };
        break;
        
      case 'fibonacci':
        newDrawing = {
          id,
          type: 'fibonacci',
          points: [{ x: point.x, y: point.y }, { x: point.x, y: point.y }],
          visible: true,
          color: '#9c27b0',
          selected: false
        };
        break;
        
      default:
        return;
    }
    
    setCurrentDrawing(newDrawing);
    setIsDrawing(true);
  };
  
  return (
    <div className="chart-drawing-tools">
      <div className="svg-container" style={{ width: chartWidth, height: chartHeight }}>
        <svg
          ref={svgRef}
          width={chartWidth}
          height={chartHeight}
          onMouseDown={startDrawing}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Render all existing drawings */}
          {drawings.filter(d => d.visible).map(drawing => renderDrawing(drawing))}
          
          {/* Render the current drawing being created */}
          {currentDrawing && renderDrawing(currentDrawing)}
        </svg>
      </div>
      
      <div className="drawing-tools-panel">
        {availableTools.includes('pointer') && (
          <div className="tool-group">
            <button 
              className={`tool-button ${activeTool === 'pointer' ? 'active' : ''}`}
              onClick={() => setActiveTool('pointer')}
              title="Pointer Tool"
            >
              <FontAwesomeIcon icon={faMousePointer} />
            </button>
            
            {/* Show point type selection only for swing analysis */}
            {examType === 'swing_analysis' && activeTool === 'pointer' && (
              <div className="point-type-selector">
                <button 
                  className={`point-type ${pointType === 'high' ? 'active' : ''}`}
                  onClick={() => setPointType('high')}
                  title="Mark Swing High"
                >
                  High
                </button>
                <button 
                  className={`point-type ${pointType === 'low' ? 'active' : ''}`}
                  onClick={() => setPointType('low')}
                  title="Mark Swing Low"
                >
                  Low
                </button>
              </div>
            )}
          </div>
        )}
        
        {availableTools.includes('line') && (
          <button 
            className={`tool-button ${activeTool === 'line' ? 'active' : ''}`}
            onClick={() => setActiveTool('line')}
            title="Line Tool"
          >
            <FontAwesomeIcon icon={faChartLine} />
          </button>
        )}
        
        {availableTools.includes('horizontalLine') && (
          <button 
            className={`tool-button ${activeTool === 'horizontalLine' ? 'active' : ''}`}
            onClick={() => setActiveTool('horizontalLine')}
            title="Horizontal Line Tool"
          >
            <FontAwesomeIcon icon={faRulerHorizontal} />
          </button>
        )}
        
        {availableTools.includes('box') && (
          <button 
            className={`tool-button ${activeTool === 'box' ? 'active' : ''}`}
            onClick={() => setActiveTool('box')}
            title="Box Tool"
          >
            <FontAwesomeIcon icon={faVectorSquare} />
          </button>
        )}
        
        {availableTools.includes('fibonacci') && (
          <button 
            className={`tool-button ${activeTool === 'fibonacci' ? 'active' : ''}`}
            onClick={() => setActiveTool('fibonacci')}
            title="Fibonacci Tool"
          >
            <FontAwesomeIcon icon={faDrawPolygon} />
          </button>
        )}
        
        <button 
          className="tool-button"
          onClick={handleUndoLastDrawing}
          title="Undo Last Drawing"
          disabled={drawings.length === 0}
        >
          <FontAwesomeIcon icon={faUndo} />
        </button>
        
        <button 
          className="tool-button"
          onClick={handleDeleteSelected}
          title="Delete Selected"
          disabled={!drawings.some(d => d.selected)}
        >
          <FontAwesomeIcon icon={faEraser} />
        </button>
        
        <button 
          className="tool-button"
          onClick={handleClearAll}
          title="Clear All"
          disabled={drawings.length === 0}
        >
          <FontAwesomeIcon icon={faTrashAlt} />
        </button>
        
        <button 
          className="tool-button"
          onClick={() => setShowAllDrawings(!showAllDrawings)}
          title={showAllDrawings ? "Hide All Drawings" : "Show All Drawings"}
        >
          <FontAwesomeIcon icon={showAllDrawings ? faEye : faEyeSlash} />
        </button>
      </div>
      
      {tooltip && (
        <div 
          className="tooltip" 
          style={{ 
            left: tooltip.x + 10, 
            top: tooltip.y - 30 
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

export default ChartDrawingTools; 
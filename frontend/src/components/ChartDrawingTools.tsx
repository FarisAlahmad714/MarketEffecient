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
}) => {
  const [activeTool, setActiveTool] = useState<DrawingTool | null>(null);
  const [drawings, setDrawings] = useState<DrawingObject[]>(savedDrawings);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingObject | null>(null);
  const [showAllDrawings, setShowAllDrawings] = useState(true);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  
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
    const handleMouseDown = (e: MouseEvent) => {
      if (!activeTool || !svgRef.current) return;
      
      const svgRect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - svgRect.left;
      const y = e.clientY - svgRect.top;
      
      if (x < 0 || x > chartWidth || y < 0 || y > chartHeight) return;
      
      if (activeTool === 'pointer') {
        // Check if clicking on an existing drawing
        const clicked = drawings.find(drawing => isPointOnDrawing(drawing, { x, y }));
        if (clicked) {
          setDrawings(drawings.map(d => ({
            ...d,
            selected: d.id === clicked.id,
          })));
          return;
        }
        
        // If not clicking on a drawing, deselect all
        setDrawings(drawings.map(d => ({
          ...d,
          selected: false,
        })));
        return;
      }
      
      // Start a new drawing
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
    xToDate
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
  
  const renderDrawing = (drawing: DrawingObject) => {
    if (!drawing.visible) return null;
    
    const { type, points, color, selected } = drawing;
    
    if (points.length < 2) return null;
    
    const [p1, p2] = points;
    const strokeWidth = selected ? 2 : 1;
    const strokeDasharray = selected ? '5,3' : 'none';
    
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
  
  return (
    <div className="chart-drawing-tools">
      <div className="drawing-toolbar">
        <div className="tool-group">
          <button
            className={`drawing-tool-button ${activeTool === 'pointer' ? 'active' : ''}`}
            onClick={() => setActiveTool('pointer')}
            title="Pointer Tool"
          >
            <FontAwesomeIcon icon={faMousePointer} />
          </button>
          <button
            className={`drawing-tool-button ${activeTool === 'line' ? 'active' : ''}`}
            onClick={() => setActiveTool('line')}
            title="Line Tool"
          >
            <FontAwesomeIcon icon={faChartLine} />
          </button>
          <button
            className={`drawing-tool-button ${activeTool === 'horizontalLine' ? 'active' : ''}`}
            onClick={() => setActiveTool('horizontalLine')}
            title="Horizontal Line Tool"
          >
            <FontAwesomeIcon icon={faRulerHorizontal} />
          </button>
          <button
            className={`drawing-tool-button ${activeTool === 'box' ? 'active' : ''}`}
            onClick={() => setActiveTool('box')}
            title="Box Tool"
          >
            <FontAwesomeIcon icon={faVectorSquare} />
          </button>
          <button
            className={`drawing-tool-button ${activeTool === 'fibonacci' ? 'active' : ''}`}
            onClick={() => setActiveTool('fibonacci')}
            title="Fibonacci Tool"
          >
            <FontAwesomeIcon icon={faDrawPolygon} />
          </button>
        </div>
        
        <div className="divider"></div>
        
        <div className="tool-group">
          <button
            className="action-button"
            onClick={handleUndoLastDrawing}
            title="Undo Last Drawing"
          >
            <FontAwesomeIcon icon={faUndo} />
          </button>
          <button
            className="action-button"
            onClick={handleDeleteSelected}
            title="Delete Selected"
          >
            <FontAwesomeIcon icon={faEraser} />
          </button>
          <button
            className="action-button danger"
            onClick={handleClearAll}
            title="Clear All Drawings"
          >
            <FontAwesomeIcon icon={faTrashAlt} />
          </button>
        </div>
        
        <div className="divider"></div>
        
        <div className="tool-group">
          <button
            className="action-button"
            onClick={handleToggleAllDrawings}
            title={showAllDrawings ? "Hide All Drawings" : "Show All Drawings"}
          >
            <FontAwesomeIcon icon={showAllDrawings ? faEye : faEyeSlash} />
          </button>
          <button
            className="action-button"
            onClick={handleSaveDrawings}
            title="Save Drawings"
          >
            <FontAwesomeIcon icon={faSave} />
          </button>
        </div>
      </div>
      
      <svg
        ref={svgRef}
        width={chartWidth}
        height={chartHeight}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        {drawings.map(drawing => (
          <g key={drawing.id}>{renderDrawing(drawing)}</g>
        ))}
        {currentDrawing && currentDrawing.points.length > 1 && (
          <g>{renderDrawing(currentDrawing)}</g>
        )}
      </svg>
      
      {tooltip && (
        <div
          className="drawing-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

export default ChartDrawingTools; 
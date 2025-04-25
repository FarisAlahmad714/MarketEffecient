import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import './DrawingTools.css';

const OptimizedDrawingTools = ({ chartContainer, onDrawingsChange, chartInstance, showScore = false, score = null }) => {
  const [activeDrawingTool, setActiveDrawingTool] = useState('fib');
  const [drawings, setDrawings] = useState([]);
  const [currentDrawing, setCurrentDrawing] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hoverPoint, setHoverPoint] = useState(null);
  
  const canvasRef = useRef(null);
  const drawingAreaRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  
  // Throttle mouse move to improve performance
  const lastMoveTime = useRef(0);
  const throttleInterval = 20; // milliseconds
  
  // Cache chart bounds for performance
  const chartBounds = useRef({ left: 0, top: 0, width: 0, height: 0 });
  
  // Coordinate conversion functions with error handling
  const priceToY = useCallback((price) => {
    try {
      if (!chartInstance || typeof price !== 'number') return null;
      
      const priceScale = chartInstance.priceScale('right');
      if (!priceScale) return null;
      
      const coordinate = priceScale.priceToCoordinate(price);
      if (coordinate === null || coordinate === undefined) return null;
      
      return coordinate;
    } catch (error) {
      console.error("Error in priceToY:", error);
      return null;
    }
  }, [chartInstance]);
  
  const timeToX = useCallback((time) => {
    try {
      if (!chartInstance || !time) return null;
      
      const timeScale = chartInstance.timeScale();
      if (!timeScale) return null;
      
      const coordinate = timeScale.timeToCoordinate(time);
      if (coordinate === null || coordinate === undefined) return null;
      
      return coordinate;
    } catch (error) {
      console.error("Error in timeToX:", error);
      return null;
    }
  }, [chartInstance]);
  
  const yToPrice = useCallback((y) => {
    try {
      if (!chartInstance || typeof y !== 'number') return null;
      
      const priceScale = chartInstance.priceScale('right');
      if (!priceScale) return null;
      
      const price = priceScale.coordinateToPrice(y);
      if (price === null || price === undefined) return null;
      
      return price;
    } catch (error) {
      console.error("Error in yToPrice:", error);
      return null;
    }
  }, [chartInstance]);
  
  const xToTime = useCallback((x) => {
    try {
      if (!chartInstance || typeof x !== 'number') return null;
      
      const timeScale = chartInstance.timeScale();
      if (!timeScale) return null;
      
      const time = timeScale.coordinateToTime(x);
      if (time === null || time === undefined) return null;
      
      return time;
    } catch (error) {
      console.error("Error in xToTime:", error);
      return null;
    }
  }, [chartInstance]);
  
  // Function to get canvas coordinates
  const getCanvasCoordinates = useCallback((clientX, clientY) => {
    if (!drawingAreaRef.current) return { x: 0, y: 0 };
    
    const rect = drawingAreaRef.current.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, []);
  
  // Convert pixel coordinates to chart data points
  const pixelToDataPoint = useCallback((x, y) => {
    const time = xToTime(x);
    const price = yToPrice(y);
    
    if (time === null || price === null) return null;
    
    return { time, price };
  }, [xToTime, yToPrice]);
  
  // Convert data points to pixel coordinates
  const dataPointToPixel = useCallback((point) => {
    if (!point || !point.time || typeof point.price !== 'number') return null;
    
    const x = timeToX(point.time);
    const y = priceToY(point.price);
    
    if (x === null || y === null) return null;
    
    return { x, y };
  }, [timeToX, priceToY]);
  
  // Handle adding a drawing point
  const addDrawingPoint = useCallback((x, y) => {
    const dataPoint = pixelToDataPoint(x, y);
    if (!dataPoint) return;
    
    if (!currentDrawing) {
      const newDrawing = {
        id: Date.now(),
        tool: activeDrawingTool,
        points: [{ ...dataPoint, x, y }]
      };
      setCurrentDrawing(newDrawing);
    } else {
      setCurrentDrawing(prev => ({
        ...prev,
        points: [...prev.points, { ...dataPoint, x, y }]
      }));
    }
  }, [activeDrawingTool, currentDrawing, pixelToDataPoint]);
  
  // Function to clear all drawings
  const clearDrawings = useCallback(() => {
    setDrawings([]);
    setCurrentDrawing(null);
    setIsDrawing(false);
    
    if (onDrawingsChange) {
      onDrawingsChange([]);
    }
  }, [onDrawingsChange]);
  
  // Function to undo last drawing
  const undoLastDrawing = useCallback(() => {
    if (isDrawing && currentDrawing) {
      setCurrentDrawing(null);
      setIsDrawing(false);
    } else if (drawings.length > 0) {
      const newDrawings = [...drawings];
      newDrawings.pop();
      setDrawings(newDrawings);
      
      if (onDrawingsChange) {
        onDrawingsChange(newDrawings);
      }
    }
  }, [drawings, isDrawing, currentDrawing, onDrawingsChange]);
  
  // Function to render drawings on canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up context for drawing
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2 * dpr;
    ctx.setLineDash([]);
    
    // Draw all completed drawings
    drawings.forEach(drawing => {
      if (drawing.tool === 'fib' && drawing.points.length === 2) {
        const startPixel = dataPointToPixel(drawing.points[0]);
        const endPixel = dataPointToPixel(drawing.points[1]);
        
        if (!startPixel || !endPixel) return;
        
        // Draw the main line
        ctx.beginPath();
        ctx.moveTo(startPixel.x, startPixel.y);
        ctx.lineTo(endPixel.x, endPixel.y);
        ctx.stroke();
        
        // Draw Fibonacci levels
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const priceRange = drawing.points[1].price - drawing.points[0].price;
        
        levels.forEach(level => {
          const levelPrice = drawing.points[0].price + priceRange * level;
          const levelY = priceToY(levelPrice);
          
          if (levelY === null) return;
          
          ctx.setLineDash([5 * dpr, 5 * dpr]);
          ctx.strokeStyle = level === 0 || level === 1 ? '#FFA726' : '#4CAF50';
          
          ctx.beginPath();
          ctx.moveTo(Math.min(startPixel.x, endPixel.x) - 50, levelY);
          ctx.lineTo(Math.max(startPixel.x, endPixel.x) + 50, levelY);
          ctx.stroke();
          
          // Add level label
          ctx.setLineDash([]);
          ctx.fillStyle = '#fff';
          ctx.font = `${12 * dpr}px Arial`;
          ctx.fillText(
            `${(level * 100).toFixed(1)}% - ${levelPrice.toFixed(2)}`, 
            Math.max(startPixel.x, endPixel.x) + 5, 
            levelY - 5
          );
        });
      } else if (drawing.tool === 'trend' && drawing.points.length >= 2) {
        // Draw trend line
        ctx.setLineDash([]);
        ctx.strokeStyle = '#2196F3';
        
        ctx.beginPath();
        
        for (let i = 0; i < drawing.points.length; i++) {
          const pixel = dataPointToPixel(drawing.points[i]);
          if (!pixel) continue;
          
          if (i === 0) {
            ctx.moveTo(pixel.x, pixel.y);
          } else {
            ctx.lineTo(pixel.x, pixel.y);
          }
        }
        
        ctx.stroke();
      }
    });
    
    // Draw current drawing in progress
    if (currentDrawing && currentDrawing.points.length > 0) {
      const firstPoint = dataPointToPixel(currentDrawing.points[0]);
      
      if (firstPoint) {
        ctx.setLineDash([]);
        ctx.strokeStyle = '#03A9F4';
        
        ctx.beginPath();
        ctx.moveTo(firstPoint.x, firstPoint.y);
        
        for (let i = 1; i < currentDrawing.points.length; i++) {
          const pixel = dataPointToPixel(currentDrawing.points[i]);
          if (pixel) {
            ctx.lineTo(pixel.x, pixel.y);
          }
        }
        
        // If hovering, draw line to hover point
        if (hoverPoint && isDrawing) {
          ctx.lineTo(hoverPoint.x, hoverPoint.y);
        }
        
        ctx.stroke();
      }
    }
    
    // Draw hover points
    if (hoverPoint) {
      ctx.fillStyle = '#FFC107';
      ctx.beginPath();
      ctx.arc(hoverPoint.x, hoverPoint.y, 5 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [drawings, currentDrawing, hoverPoint, isDrawing, dataPointToPixel, priceToY]);
  
  // Set up the canvas
  useEffect(() => {
    if (!chartContainer || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const resizeCanvas = () => {
      if (!drawingAreaRef.current) return;
      
      const rect = drawingAreaRef.current.getBoundingClientRect();
      chartBounds.current = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      };
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      
      renderCanvas();
    };
    
    resizeCanvas();
    
    const containerElem = containerRef.current;
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(containerElem);
    
    return () => {
      observer.disconnect();
    };
  }, [chartContainer, renderCanvas]);
  
  // Render canvas when drawings change
  useEffect(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      renderCanvas();
    });
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [renderCanvas, drawings, currentDrawing, hoverPoint]);
  
  // Update parent component with drawings
  useEffect(() => {
    if (onDrawingsChange) {
      onDrawingsChange(drawings);
    }
  }, [drawings, onDrawingsChange]);
  
  // Event handlers
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
    
    setIsDrawing(true);
    addDrawingPoint(x, y);
  }, [getCanvasCoordinates, addDrawingPoint]);
  
  const handleMouseMove = useCallback((e) => {
    const now = Date.now();
    if (now - lastMoveTime.current < throttleInterval) return;
    lastMoveTime.current = now;
    
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
    setHoverPoint({ x, y });
    
    if (isDrawing && activeDrawingTool === 'trend') {
      addDrawingPoint(x, y);
    }
  }, [getCanvasCoordinates, isDrawing, activeDrawingTool, addDrawingPoint]);
  
  const handleMouseUp = useCallback((e) => {
    if (!isDrawing) return;
    
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
    
    if (activeDrawingTool === 'fib') {
      addDrawingPoint(x, y);
      
      if (currentDrawing && currentDrawing.points.length >= 2) {
        setDrawings(prev => [...prev, currentDrawing]);
        setCurrentDrawing(null);
      }
    } else if (activeDrawingTool === 'trend') {
      // Finalize trend line
      if (currentDrawing) {
        setDrawings(prev => [...prev, currentDrawing]);
        setCurrentDrawing(null);
      }
    }
    
    setIsDrawing(false);
  }, [isDrawing, activeDrawingTool, currentDrawing, getCanvasCoordinates, addDrawingPoint]);
  
  const handleMouseLeave = useCallback(() => {
    setHoverPoint(null);
    
    if (isDrawing) {
      if (currentDrawing && currentDrawing.points.length >= 2) {
        setDrawings(prev => [...prev, currentDrawing]);
      }
      
      setCurrentDrawing(null);
      setIsDrawing(false);
    }
  }, [isDrawing, currentDrawing]);
  
  // Calculate score percentage for display
  const scorePercentage = useMemo(() => {
    if (!score || typeof score.value !== 'number' || typeof score.maxValue !== 'number') {
      return 0;
    }
    return (score.value / score.maxValue) * 100;
  }, [score]);
  
  // Attach event listeners to chart container
  useEffect(() => {
    const drawingArea = drawingAreaRef.current;
    if (!drawingArea) return;
    
    drawingArea.addEventListener('mousedown', handleMouseDown);
    drawingArea.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    drawingArea.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      drawingArea.removeEventListener('mousedown', handleMouseDown);
      drawingArea.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      drawingArea.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave]);
  
  return (
    <div className="drawing-tools-overlay" ref={containerRef}>
      <div className="drawing-area" ref={drawingAreaRef}>
        <canvas ref={canvasRef} className="drawing-canvas" />
      </div>
      
      <div className="drawing-controls">
        <button
          className={`tool-btn ${activeDrawingTool === 'fib' ? 'active' : ''}`}
          onClick={() => setActiveDrawingTool('fib')}
          title="Fibonacci Retracement"
        >
          F
        </button>
        <button
          className={`tool-btn ${activeDrawingTool === 'trend' ? 'active' : ''}`}
          onClick={() => setActiveDrawingTool('trend')}
          title="Trend Line"
        >
          T
        </button>
        <button
          className="tool-btn undo"
          onClick={undoLastDrawing}
          title="Undo Last Drawing"
        >
          ↩
        </button>
        <button
          className="tool-btn clear" 
          onClick={clearDrawings}
          title="Clear All Drawings"
        >
          ✕
        </button>
      </div>
      
      {showScore && score && (
        <div className="score-display">
          <div className="score-value">
            Score: {score.value} / {score.maxValue}
          </div>
          <div className="score-bar">
            <div 
              className="score-fill" 
              style={{ 
                width: `${scorePercentage}%`,
                backgroundColor: scorePercentage >= 70 ? '#4CAF50' : 
                                 scorePercentage >= 40 ? '#FFC107' : '#F44336'
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedDrawingTools; 
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import './DrawingTools.css';

const DrawingTools = ({ chartContainer, onDrawingsChange, chartInstance }) => {
  const svgRef = useRef(null);
  const [currentTool, setCurrentTool] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState(null);
  const [drawings, setDrawings] = useState([]);
  const [pointType, setPointType] = useState('high'); // 'high' or 'low'
  const drawingsRef = useRef(drawings);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const overlayRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingAreaRef = useRef(null);
  const canvasContext = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [drawingContext, setDrawingContext] = useState(null);

  // Always keep drawingsRef in sync with drawings state
  useEffect(() => {
    drawingsRef.current = drawings;
  }, [drawings]);

  // Initialize SVG container
  useEffect(() => {
    if (!chartContainer) return;

    // Set up SVG container just once
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "all";
    svg.style.zIndex = "10";
    chartContainer.appendChild(svg);
    svgRef.current = svg;

    // Clean up function
    return () => {
      if (chartContainer && svg && chartContainer.contains(svg)) {
        chartContainer.removeChild(svg);
      }
    };
  }, [chartContainer]);

  // Memoize the chart dimensions to avoid unnecessary calculations
  const chartDimensions = useMemo(() => {
    if (!chartInstance || !chartInstance.chart) return { width: 0, height: 0 };
    
    const chartElement = chartInstance.chart.chartElement();
    if (!chartElement) return { width: 0, height: 0 };
    
    return {
      width: chartElement.clientWidth,
      height: chartElement.clientHeight
    };
  }, [chartInstance]);
  
  // Initialize canvas dimensions and context
  useEffect(() => {
    if (!overlayRef.current || !chartInstance || !chartInstance.chart) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas dimensions to match chart
    canvas.width = chartDimensions.width;
    canvas.height = chartDimensions.height;
    
    // Store canvas context for later use
    canvasContext.current = canvas.getContext('2d');
    
    // Position the drawing area to match chart
    const chartElement = chartInstance.chart.chartElement();
    if (chartElement && drawingAreaRef.current) {
      const rect = chartElement.getBoundingClientRect();
      drawingAreaRef.current.style.width = `${rect.width}px`;
      drawingAreaRef.current.style.height = `${rect.height}px`;
    }
    
  }, [chartInstance, chartDimensions]);

  // Notify parent of drawings changes - debounced via useCallback
  const notifyDrawingsChange = useCallback(() => {
    if (!onDrawingsChange) return;
    
    const drawingData = drawingsRef.current.map(element => {
      if (element.tagName === 'line') {
        return {
          type: 'line',
          x1: parseFloat(element.getAttribute('x1')),
          y1: parseFloat(element.getAttribute('y1')),
          x2: parseFloat(element.getAttribute('x2')),
          y2: parseFloat(element.getAttribute('y2')),
          time: parseFloat(element.dataset.time || 0),
          price: parseFloat(element.dataset.price || 0)
        };
      } else if (element.tagName === 'circle') {
        return {
          type: 'point',
          pointType: element.dataset.pointType || 'high',
          x: parseFloat(element.getAttribute('cx')),
          y: parseFloat(element.getAttribute('cy')),
          time: parseFloat(element.dataset.time || 0),
          price: parseFloat(element.dataset.price || 0)
        };
      }
      return null;
    }).filter(item => item !== null);
    
    onDrawingsChange(drawingData);
  }, [onDrawingsChange]);

  // Debounced notification on drawings change
  useEffect(() => {
    const timer = setTimeout(() => {
      notifyDrawingsChange();
    }, 100);
    return () => clearTimeout(timer);
  }, [drawings, notifyDrawingsChange]);

  // Function to convert pixel coordinates to price values
  const pixelToPrice = useCallback((x, y) => {
    if (!chartInstance || !chartInstance.chart) {
      return { time: null, price: null };
    }
    
    try {
      // Use the lightweight-charts conversion functions
      const price = chartInstance.chart.priceScale('right').coordinateToPrice(y);
      const time = chartInstance.chart.timeScale().coordinateToTime(x);
      
      return { time, price };
    } catch (err) {
      console.error('Coordinate conversion error:', err);
      return { time: null, price: null };
    }
  }, [chartInstance]);
  
  // Function to convert price to pixel coordinates
  const priceToPixel = useCallback((time, price) => {
    if (!chartInstance || !chartInstance.chart) {
      return { x: 0, y: 0 };
    }
    
    try {
      // Use the lightweight-charts conversion functions
      const y = chartInstance.chart.priceScale('right').priceToCoordinate(price);
      const x = chartInstance.chart.timeScale().timeToCoordinate(time);
      
      return { x, y };
    } catch (err) {
      console.error('Coordinate conversion error:', err);
      return { x: 0, y: 0 };
    }
  }, [chartInstance]);

  const startDrawing = useCallback((e) => {
    if (!currentTool || !svgRef.current) return;
    
    setIsDrawing(true);
    const point = {
      x: e.clientX - chartContainer.getBoundingClientRect().left,
      y: e.clientY - chartContainer.getBoundingClientRect().top
    };
    
    // Get chart coordinates
    const chartCoordinates = pixelToPrice(point.x, point.y);

    if (currentTool === 'line') {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute('x1', point.x);
      line.setAttribute('y1', point.y);
      line.setAttribute('x2', point.x);
      line.setAttribute('y2', point.y);
      line.setAttribute('stroke', 'lime');
      line.setAttribute('stroke-width', '3');
      line.dataset.price = chartCoordinates.price;
      line.dataset.time = chartCoordinates.time;
      
      svgRef.current.appendChild(line);
      setCurrentElement(line);
    } else if (currentTool === 'pointer') {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute('cx', point.x);
      circle.setAttribute('cy', point.y);
      circle.setAttribute('r', '6');
      
      // Set color based on point type (red for highs, green for lows)
      const color = pointType === 'high' ? '#ff4560' : '#00e396';
      circle.setAttribute('fill', color);
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '1');
      
      // Store point type and coordinates as data attributes
      circle.dataset.pointType = pointType;
      circle.dataset.price = chartCoordinates.price;
      circle.dataset.time = chartCoordinates.time;
      
      svgRef.current.appendChild(circle);
      setDrawings(prev => [...prev, circle]);
    }
  }, [chartContainer, currentTool, pixelToPrice, pointType]);

  const draw = useCallback((e) => {
    if (!isDrawing || !currentElement || currentTool !== 'line') return;

    const point = {
      x: e.clientX - chartContainer.getBoundingClientRect().left,
      y: e.clientY - chartContainer.getBoundingClientRect().top
    };
    
    currentElement.setAttribute('x2', point.x);
    currentElement.setAttribute('y2', point.y);
  }, [chartContainer, currentElement, currentTool, isDrawing]);

  const endDrawing = useCallback(() => {
    if (!isDrawing) return;
    
    if (currentTool === 'line' && currentElement) {
      setDrawings(prev => [...prev, currentElement]);
    }

    setIsDrawing(false);
    setCurrentElement(null);
  }, [currentElement, currentTool, isDrawing]);

  const clearDrawings = useCallback(() => {
    if (!svgRef.current) return;
    
    while (svgRef.current.firstChild) {
      svgRef.current.removeChild(svgRef.current.firstChild);
    }
    setDrawings([]);
  }, []);

  const undoLastDrawing = useCallback(() => {
    if (drawings.length === 0 || !svgRef.current) return;
    
    const lastDrawing = drawings[drawings.length - 1];
    svgRef.current.removeChild(lastDrawing);
    setDrawings(prev => prev.slice(0, -1));
  }, [drawings]);

  // Set up event listeners
  useEffect(() => {
    if (!chartContainer) return;

    // Use memoized handlers for better performance
    const mouseDownHandler = startDrawing;
    const mouseMoveHandler = draw;
    const mouseUpHandler = endDrawing;

    chartContainer.addEventListener('mousedown', mouseDownHandler);
    chartContainer.addEventListener('mousemove', mouseMoveHandler);
    chartContainer.addEventListener('mouseup', mouseUpHandler);

    return () => {
      chartContainer.removeEventListener('mousedown', mouseDownHandler);
      chartContainer.removeEventListener('mousemove', mouseMoveHandler);
      chartContainer.removeEventListener('mouseup', mouseUpHandler);
    };
  }, [chartContainer, startDrawing, draw, endDrawing]);

  // Handle mouse move over the drawing area
  const handleMouseMove = useCallback((e) => {
    if (!chartInstance || !drawingAreaRef.current || !currentTool) return;
    
    // Get mouse position relative to drawing area
    const rect = drawingAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to price coordinates
    const coords = pixelToPrice(x, y);
    
    if (coords.time && coords.price) {
      setHoveredPoint({ 
        x, 
        y, 
        time: coords.time, 
        price: coords.price,
        type: currentTool 
      });
    } else {
      setHoveredPoint(null);
    }
    
  }, [chartInstance, currentTool, pixelToPrice]);
  
  // Handle click on the drawing area
  const handleClick = useCallback((e) => {
    if (!chartInstance || !drawingAreaRef.current || !currentTool || !hoveredPoint) return;
    
    e.preventDefault();
    
    // Add new drawing point
    const newDrawing = {
      id: Date.now().toString(),
      x: hoveredPoint.x,
      y: hoveredPoint.y,
      time: hoveredPoint.time,
      price: hoveredPoint.price,
      type: currentTool
    };
    
    // For fibonacci-retracement, only allow two points (high and low)
    if (pointType === 'fibonacci-retracement') {
      // If we already have a point of this type, replace it
      const filteredDrawings = drawings.filter(d => d.type !== currentTool);
      const newDrawings = [...filteredDrawings, newDrawing];
      setDrawings(newDrawings);
      
      // Notify parent component
      if (onDrawingsChange) {
        onDrawingsChange(newDrawings);
      }
    } else {
      // For other exam types, allow multiple points
      const newDrawings = [...drawings, newDrawing];
      setDrawings(newDrawings);
      
      // Notify parent component
      if (onDrawingsChange) {
        onDrawingsChange(newDrawings);
      }
    }
    
  }, [chartInstance, currentTool, hoveredPoint, drawings, pointType, onDrawingsChange]);
  
  // Handle right-click to remove a drawing
  const handleRightClick = useCallback((e) => {
    if (!chartInstance || !drawingAreaRef.current) return;
    
    e.preventDefault();
    
    // Get mouse position relative to drawing area
    const rect = drawingAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find if we clicked near an existing drawing (within 10px radius)
    const clickedDrawing = drawings.find(drawing => {
      const distanceSquared = Math.pow(drawing.x - x, 2) + Math.pow(drawing.y - y, 2);
      return distanceSquared <= 100; // 10px radius squared
    });
    
    if (clickedDrawing) {
      // Remove the drawing
      const newDrawings = drawings.filter(d => d.id !== clickedDrawing.id);
      setDrawings(newDrawings);
      
      // Notify parent component
      if (onDrawingsChange) {
        onDrawingsChange(newDrawings);
      }
    }
    
  }, [chartInstance, drawings, onDrawingsChange]);
  
  // Clear event listeners when component unmounts
  useEffect(() => {
    const drawingArea = drawingAreaRef.current;
    
    return () => {
      if (drawingArea) {
        drawingArea.removeEventListener('mousemove', handleMouseMove);
        drawingArea.removeEventListener('click', handleClick);
        drawingArea.removeEventListener('contextmenu', handleRightClick);
      }
    };
  }, [handleMouseMove, handleClick, handleRightClick]);
  
  // Attach event listeners
  useEffect(() => {
    const drawingArea = drawingAreaRef.current;
    if (!drawingArea) return;
    
    drawingArea.addEventListener('mousemove', handleMouseMove);
    drawingArea.addEventListener('click', handleClick);
    drawingArea.addEventListener('contextmenu', handleRightClick);
    
    return () => {
      drawingArea.removeEventListener('mousemove', handleMouseMove);
      drawingArea.removeEventListener('click', handleClick);
      drawingArea.removeEventListener('contextmenu', handleRightClick);
    };
  }, [handleMouseMove, handleClick, handleRightClick]);
  
  // Draw on canvas when drawings or hovered point change
  useEffect(() => {
    if (!canvasContext.current || !canvasRef.current) return;
    
    const ctx = canvasContext.current;
    const canvas = canvasRef.current;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw existing drawings
    drawings.forEach(drawing => {
      drawPoint(ctx, drawing);
    });
    
    // Draw hovered point
    if (hoveredPoint && currentTool) {
      drawHoveredPoint(ctx, hoveredPoint);
    }
    
    // Draw fibonacci levels if necessary
    if (pointType === 'fibonacci-retracement') {
      const highPoint = drawings.find(d => d.type === 'high');
      const lowPoint = drawings.find(d => d.type === 'low');
      
      if (highPoint && lowPoint) {
        drawFibonacciLevels(ctx, highPoint, lowPoint);
      }
    }
    
  }, [drawings, hoveredPoint, currentTool, pointType]);
  
  // Function to draw a point on canvas
  const drawPoint = (ctx, point) => {
    if (!point) return;
    
    ctx.save();
    
    // Set styles based on point type
    if (point.type === 'high') {
      ctx.fillStyle = 'rgba(255, 59, 48, 0.7)';
      ctx.strokeStyle = 'rgba(255, 59, 48, 1)';
    } else if (point.type === 'low') {
      ctx.fillStyle = 'rgba(52, 199, 89, 0.7)';
      ctx.strokeStyle = 'rgba(52, 199, 89, 1)';
    } else if (point.type === 'bullishFVG') {
      ctx.fillStyle = 'rgba(52, 199, 89, 0.3)';
      ctx.strokeStyle = 'rgba(52, 199, 89, 1)';
    } else if (point.type === 'bearishFVG') {
      ctx.fillStyle = 'rgba(255, 59, 48, 0.3)';
      ctx.strokeStyle = 'rgba(255, 59, 48, 1)';
    }
    
    ctx.lineWidth = 2;
    
    // Draw based on point type
    if (point.type === 'high' || point.type === 'low') {
      // Draw a circle
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Draw a label
      ctx.font = '12px Arial';
      ctx.fillStyle = point.type === 'high' ? 'rgba(255, 59, 48, 1)' : 'rgba(52, 199, 89, 1)';
      ctx.textAlign = 'center';
      ctx.fillText(point.type === 'high' ? 'H' : 'L', point.x, point.y - 15);
      
      // Draw price
      ctx.font = '10px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(point.price.toFixed(2), point.x, point.y + 20);
    } else if (point.type === 'bullishFVG' || point.type === 'bearishFVG') {
      // For FVG, we need to draw a rectangle
      // This is a placeholder - in real implementation you would need to determine the height of the FVG
      const height = 30; // example height
      
      ctx.fillRect(point.x - 50, point.y - (point.type === 'bullishFVG' ? 0 : height), 100, height);
      ctx.strokeRect(point.x - 50, point.y - (point.type === 'bullishFVG' ? 0 : height), 100, height);
      
      // Draw label
      ctx.font = '12px Arial';
      ctx.fillStyle = point.type === 'bullishFVG' ? 'rgba(52, 199, 89, 1)' : 'rgba(255, 59, 48, 1)';
      ctx.textAlign = 'center';
      ctx.fillText(point.type === 'bullishFVG' ? 'BFVG' : 'BRVG', point.x, point.y + (point.type === 'bullishFVG' ? -10 : 10));
    }
    
    ctx.restore();
  };
  
  // Function to draw hovered point
  const drawHoveredPoint = (ctx, point) => {
    if (!point) return;
    
    ctx.save();
    
    // Set styles based on point type
    if (point.type === 'high') {
      ctx.fillStyle = 'rgba(255, 59, 48, 0.3)';
      ctx.strokeStyle = 'rgba(255, 59, 48, 0.8)';
    } else if (point.type === 'low') {
      ctx.fillStyle = 'rgba(52, 199, 89, 0.3)';
      ctx.strokeStyle = 'rgba(52, 199, 89, 0.8)';
    } else if (point.type === 'bullishFVG') {
      ctx.fillStyle = 'rgba(52, 199, 89, 0.1)';
      ctx.strokeStyle = 'rgba(52, 199, 89, 0.8)';
    } else if (point.type === 'bearishFVG') {
      ctx.fillStyle = 'rgba(255, 59, 48, 0.1)';
      ctx.strokeStyle = 'rgba(255, 59, 48, 0.8)';
    }
    
    ctx.lineWidth = 1;
    
    // Draw based on point type
    if (point.type === 'high' || point.type === 'low') {
      // Draw a circle
      ctx.beginPath();
      ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Draw crosshair
      ctx.beginPath();
      ctx.moveTo(point.x - 15, point.y);
      ctx.lineTo(point.x + 15, point.y);
      ctx.moveTo(point.x, point.y - 15);
      ctx.lineTo(point.x, point.y + 15);
      ctx.stroke();
      
      // Draw price
      ctx.font = '10px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(point.price.toFixed(2), point.x, point.y + 25);
    } else if (point.type === 'bullishFVG' || point.type === 'bearishFVG') {
      // For FVG, we need to draw a rectangle preview
      const height = 30; // example height
      
      ctx.fillRect(point.x - 50, point.y - (point.type === 'bullishFVG' ? 0 : height), 100, height);
      ctx.strokeRect(point.x - 50, point.y - (point.type === 'bullishFVG' ? 0 : height), 100, height);
      
      // Draw label
      ctx.font = '12px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('Click to place', point.x, point.y + (point.type === 'bullishFVG' ? -10 : 10));
    }
    
    ctx.restore();
  };
  
  // Function to draw fibonacci levels
  const drawFibonacciLevels = (ctx, highPoint, lowPoint) => {
    if (!highPoint || !lowPoint) return;
    
    ctx.save();
    
    // Calculate the price difference
    const priceDiff = highPoint.price - lowPoint.price;
    
    // Define fibonacci levels
    const levels = [
      { level: 0, color: 'rgba(52, 199, 89, 1)' },     // Low point (0%)
      { level: 0.236, color: 'rgba(255, 204, 0, 0.6)' },
      { level: 0.382, color: 'rgba(255, 149, 0, 0.6)' },
      { level: 0.5, color: 'rgba(255, 59, 48, 0.6)' },
      { level: 0.618, color: 'rgba(175, 82, 222, 0.6)' },
      { level: 0.786, color: 'rgba(90, 200, 250, 0.6)' },
      { level: 1, color: 'rgba(255, 59, 48, 1)' }      // High point (100%)
    ];
    
    // Calculate chart width for drawing lines
    const chartWidth = canvasRef.current.width;
    
    // Draw each level
    levels.forEach(level => {
      // Calculate y position for this level
      const levelPrice = lowPoint.price + (priceDiff * level.level);
      const { y } = priceToPixel(lowPoint.time, levelPrice);
      
      // Draw horizontal line
      ctx.beginPath();
      ctx.strokeStyle = level.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 3]);
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
      
      // Draw level label
      ctx.font = '10px Arial';
      ctx.fillStyle = level.color;
      ctx.textAlign = 'left';
      ctx.setLineDash([]);
      
      let levelText;
      if (level.level === 0) levelText = '0% (Low)';
      else if (level.level === 1) levelText = '100% (High)';
      else levelText = `${(level.level * 100).toFixed(1)}%`;
      
      ctx.fillText(`${levelText} - ${levelPrice.toFixed(2)}`, 10, y - 5);
    });
    
    ctx.restore();
  };

  // Initialize drawing tools
  useEffect(() => {
    if (!chartInstance || !chartInstance.chart) {
      console.warn('Chart instance is not available yet');
      return;
    }

    const chart = chartInstance.chart;
    const container = chartInstance.container;
    
    if (!chart || !container) {
      console.warn('Chart or container not available');
      return;
    }

    try {
      // Clear previous drawings when the component re-renders with new props
      if (drawingsRef.current.length > 0) {
        for (const drawing of drawingsRef.current) {
          if (drawing && drawing.remove) {
            drawing.remove();
          }
        }
        drawingsRef.current = [];
        onDrawingsChange([]);
      }

      // Initialize drawing context
      setDrawingContext({
        chart,
        container,
        coordinateToPrice: chartInstance.coordinateToPrice || (y => y),
        priceToCoordinate: chartInstance.priceToCoordinate || (price => price)
      });

      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing drawing tools:', error);
    }
  }, [chartInstance, onDrawingsChange]);

  return (
    <div className="drawing-tools-overlay" ref={overlayRef}>
      <div 
        className="drawing-area" 
        ref={drawingAreaRef}
        style={{ 
          cursor: currentTool ? 'crosshair' : 'default',
          pointerEvents: currentTool ? 'auto' : 'none'
        }}
      >
        <canvas ref={canvasRef} className="drawing-canvas"></canvas>
      </div>
    </div>
  );
};

export default React.memo(DrawingTools); 
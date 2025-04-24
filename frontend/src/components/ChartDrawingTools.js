import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import './ChartDrawingTools.css';

// Icons for drawing tools
const LineIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.5 18.5L20.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const BoxIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <rect x="4" y="4" width="16" height="16" strokeWidth="2" />
  </svg>
);

const FibonacciIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M3 20h18M3 16h18M3 12h18M3 8h18M3 4h18" strokeWidth="1.5" />
  </svg>
);

const PointerIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M7,2l12,11.2l-5.8,0.5l3.3,7.3l-2.2,1l-3.2-7.4L7,18.5V2" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeWidth="2" />
  </svg>
);

const UndoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M9 14l-4-4 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 10h11c4 0 7 3 7 7v0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Class for managing drawing operations
class DrawingLayer {
  constructor(container, chart) {
    this.container = container;
    this.chart = chart;
    this.svg = null;
    this.currentTool = null;
    this.drawings = [];
    this.isDrawing = false;
    this.startPoint = null;
    this.currentDrawing = null;
    this.onDrawingComplete = null;
    this.selectedDrawing = null;
    this.dragStartPoint = null;
    this.originalPosition = null;

    this.createSvgLayer();
    this.attachEvents();
  }

  createSvgLayer() {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.style.position = 'absolute';
    this.svg.style.top = '0';
    this.svg.style.left = '0';
    this.svg.style.pointerEvents = 'none';
    this.svg.style.zIndex = '1';
    this.container.appendChild(this.svg);
  }

  attachEvents() {
    this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.container.addEventListener('mouseup', this.handleMouseUp.bind(this));
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  setTool(tool) {
    this.currentTool = tool;
    this.container.style.cursor = tool === 'pointer' ? 'default' : 'crosshair';
  }

  handleMouseDown(e) {
    if (!this.currentTool) return;
    
    if (this.currentTool === 'pointer') {
      const element = e.target.closest('line, rect, circle');
      if (element) {
        this.selectedDrawing = element;
        this.dragStartPoint = { x: e.clientX, y: e.clientY };
        this.originalPosition = {
          x1: parseFloat(element.getAttribute('x1') || element.getAttribute('x') || element.getAttribute('cx')),
          y1: parseFloat(element.getAttribute('y1') || element.getAttribute('y') || element.getAttribute('cy')),
          x2: parseFloat(element.getAttribute('x2') || (element.getAttribute('x') ? element.getAttribute('x') + parseFloat(element.getAttribute('width')) : 0)),
          y2: parseFloat(element.getAttribute('y2') || (element.getAttribute('y') ? element.getAttribute('y') + parseFloat(element.getAttribute('height')) : 0))
        };
      }
      return;
    }

    this.isDrawing = true;
    const rect = this.container.getBoundingClientRect();
    this.startPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    switch (this.currentTool) {
      case 'line':
        this.currentDrawing = this.createLine(this.startPoint.x, this.startPoint.y, this.startPoint.x, this.startPoint.y);
        break;
      case 'box':
        this.currentDrawing = this.createBox(this.startPoint.x, this.startPoint.y, 0, 0);
        break;
      case 'fibonacci':
        this.currentDrawing = this.createFibonacci(this.startPoint.x, this.startPoint.y, this.startPoint.x, this.startPoint.y);
        break;
      default:
        break;
    }

    if (this.currentDrawing) {
      this.svg.appendChild(this.currentDrawing);
    }
  }

  handleMouseMove(e) {
    if (this.currentTool === 'pointer' && this.selectedDrawing && this.dragStartPoint) {
      const dx = e.clientX - this.dragStartPoint.x;
      const dy = e.clientY - this.dragStartPoint.y;
      
      const element = this.selectedDrawing;
      if (element.tagName === 'line') {
        element.setAttribute('x1', this.originalPosition.x1 + dx);
        element.setAttribute('y1', this.originalPosition.y1 + dy);
        element.setAttribute('x2', this.originalPosition.x2 + dx);
        element.setAttribute('y2', this.originalPosition.y2 + dy);
      } else if (element.tagName === 'rect') {
        element.setAttribute('x', this.originalPosition.x1 + dx);
        element.setAttribute('y', this.originalPosition.y1 + dy);
      } else if (element.tagName === 'circle') {
        element.setAttribute('cx', this.originalPosition.x1 + dx);
        element.setAttribute('cy', this.originalPosition.y1 + dy);
      }
      
      return;
    }

    if (!this.isDrawing || !this.currentDrawing) return;
    
    const rect = this.container.getBoundingClientRect();
    const currentPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    switch (this.currentTool) {
      case 'line':
        this.updateLine(this.currentDrawing, this.startPoint.x, this.startPoint.y, currentPoint.x, currentPoint.y);
        break;
      case 'box':
        this.updateBox(this.currentDrawing, this.startPoint.x, this.startPoint.y, currentPoint.x, currentPoint.y);
        break;
      case 'fibonacci':
        this.updateFibonacci(this.currentDrawing, this.startPoint.x, this.startPoint.y, currentPoint.x, currentPoint.y);
        break;
      default:
        break;
    }
  }

  handleMouseUp(e) {
    if (this.currentTool === 'pointer' && this.selectedDrawing) {
      this.selectedDrawing = null;
      this.dragStartPoint = null;
      this.originalPosition = null;
      return;
    }

    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    if (this.currentDrawing) {
      this.drawings.push(this.currentDrawing);
      
      if (this.onDrawingComplete) {
        const rect = this.container.getBoundingClientRect();
        const endPoint = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        
        this.onDrawingComplete({
          type: this.currentTool,
          startPoint: this.startPoint,
          endPoint: endPoint,
          element: this.currentDrawing
        });
      }
    }
    
    this.currentDrawing = null;
    this.startPoint = null;
  }

  handleKeyDown(e) {
    if (e.key === 'Escape' && this.isDrawing) {
      if (this.currentDrawing && this.currentDrawing.parentNode) {
        this.currentDrawing.parentNode.removeChild(this.currentDrawing);
      }
      this.isDrawing = false;
      this.currentDrawing = null;
      this.startPoint = null;
    }
    
    if (e.key === 'Delete' && this.selectedDrawing) {
      if (this.selectedDrawing.parentNode) {
        this.selectedDrawing.parentNode.removeChild(this.selectedDrawing);
        this.drawings = this.drawings.filter(d => d !== this.selectedDrawing);
        this.selectedDrawing = null;
      }
    }
  }

  createLine(x1, y1, x2, y2) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#2196f3');
    line.setAttribute('stroke-width', '2');
    line.style.pointerEvents = 'auto';
    return line;
  }

  updateLine(line, x1, y1, x2, y2) {
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
  }

  createBox(x, y, width, height) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('stroke', '#4caf50');
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('fill', 'rgba(76, 175, 80, 0.1)');
    rect.style.pointerEvents = 'auto';
    return rect;
  }

  updateBox(rect, startX, startY, currentX, currentY) {
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
  }

  createFibonacci(x1, y1, x2, y2) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('fibonacci-tool');
    
    // Draw base line
    const baseLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    baseLine.setAttribute('x1', x1);
    baseLine.setAttribute('y1', y1);
    baseLine.setAttribute('x2', x2);
    baseLine.setAttribute('y2', y2);
    baseLine.setAttribute('stroke', '#ff9800');
    baseLine.setAttribute('stroke-width', '2');
    group.appendChild(baseLine);
    
    // Fibonacci levels (0, 0.236, 0.382, 0.5, 0.618, 0.786, 1)
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    
    levels.forEach(level => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y1);
      line.setAttribute('stroke', '#ff9800');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-dasharray', '3,3');
      line.dataset.level = level;
      group.appendChild(line);
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x1 - 40);
      text.setAttribute('y', y1);
      text.setAttribute('fill', '#ff9800');
      text.setAttribute('font-size', '10');
      text.textContent = level.toFixed(3);
      text.dataset.level = level;
      group.appendChild(text);
    });
    
    group.style.pointerEvents = 'auto';
    return group;
  }

  updateFibonacci(group, x1, y1, x2, y2) {
    const baseLine = group.querySelector('line:not([data-level])');
    baseLine.setAttribute('x2', x2);
    baseLine.setAttribute('y2', y2);
    
    const verticalDiff = y2 - y1;
    
    // Update all level lines and texts
    const levelLines = group.querySelectorAll('line[data-level]');
    const levelTexts = group.querySelectorAll('text[data-level]');
    
    levelLines.forEach(line => {
      const level = parseFloat(line.dataset.level);
      const y = y1 + verticalDiff * level;
      
      line.setAttribute('x2', x2);
      line.setAttribute('y1', y);
      line.setAttribute('y2', y);
    });
    
    levelTexts.forEach(text => {
      const level = parseFloat(text.dataset.level);
      const y = y1 + verticalDiff * level;
      
      text.setAttribute('y', y + 3); // Small offset for text positioning
    });
  }

  clearDrawings() {
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild);
    }
    this.drawings = [];
  }

  undoLastDrawing() {
    if (this.drawings.length === 0) return;
    
    const lastDrawing = this.drawings.pop();
    if (lastDrawing && lastDrawing.parentNode) {
      lastDrawing.parentNode.removeChild(lastDrawing);
    }
  }

  setDrawingCompleteCallback(callback) {
    this.onDrawingComplete = callback;
  }

  destroy() {
    if (this.svg && this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
    
    this.container.removeEventListener('mousedown', this.handleMouseDown);
    this.container.removeEventListener('mousemove', this.handleMouseMove);
    this.container.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}

const ChartDrawingTools = forwardRef(({ chart, onDrawingComplete }, ref) => {
  const containerRef = useRef(null);
  const drawingLayerRef = useRef(null);
  const [activeTool, setActiveTool] = React.useState(null);

  useEffect(() => {
    if (containerRef.current && chart) {
      // Wait for chart to be initialized
      const checkChartReady = () => {
        if (chart.chartInstance) {
          initDrawingLayer();
        } else {
          setTimeout(checkChartReady, 100);
        }
      };
      
      checkChartReady();
    }
    
    return () => {
      if (drawingLayerRef.current) {
        drawingLayerRef.current.destroy();
      }
    };
  }, [chart]);

  const initDrawingLayer = () => {
    // Find the chart container element
    const chartContainer = chart.chartInstance.container;
    if (!chartContainer) return;
    
    // Create drawing layer on top of the chart
    drawingLayerRef.current = new DrawingLayer(chartContainer, chart);
    
    // Set callback for drawing complete
    if (onDrawingComplete) {
      drawingLayerRef.current.setDrawingCompleteCallback(onDrawingComplete);
    }
  };

  useImperativeHandle(ref, () => ({
    clearDrawings: () => {
      if (drawingLayerRef.current) {
        drawingLayerRef.current.clearDrawings();
      }
    },
    undoLastDrawing: () => {
      if (drawingLayerRef.current) {
        drawingLayerRef.current.undoLastDrawing();
      }
    },
    setTool: (tool) => {
      if (drawingLayerRef.current) {
        drawingLayerRef.current.setTool(tool);
        setActiveTool(tool);
      }
    }
  }));

  const handleToolClick = (tool) => {
    if (drawingLayerRef.current) {
      if (activeTool === tool) {
        // Deselect tool if it's already active
        drawingLayerRef.current.setTool(null);
        setActiveTool(null);
      } else {
        drawingLayerRef.current.setTool(tool);
        setActiveTool(tool);
      }
    }
  };

  const handleClearDrawings = () => {
    if (drawingLayerRef.current) {
      drawingLayerRef.current.clearDrawings();
    }
  };

  const handleUndoDrawing = () => {
    if (drawingLayerRef.current) {
      drawingLayerRef.current.undoLastDrawing();
    }
  };

  return (
    <div ref={containerRef} className="drawing-toolbar">
      <div className="tool-group">
        <button 
          className={`drawing-tool-button ${activeTool === 'pointer' ? 'active' : ''}`}
          onClick={() => handleToolClick('pointer')}
          title="Select/Move"
        >
          <PointerIcon />
        </button>
        <button 
          className={`drawing-tool-button ${activeTool === 'line' ? 'active' : ''}`}
          onClick={() => handleToolClick('line')}
          title="Line Tool"
        >
          <LineIcon />
        </button>
        <button 
          className={`drawing-tool-button ${activeTool === 'box' ? 'active' : ''}`}
          onClick={() => handleToolClick('box')}
          title="Box Tool"
        >
          <BoxIcon />
        </button>
        <button 
          className={`drawing-tool-button ${activeTool === 'fibonacci' ? 'active' : ''}`}
          onClick={() => handleToolClick('fibonacci')}
          title="Fibonacci Tool"
        >
          <FibonacciIcon />
        </button>
      </div>
      
      <div className="divider"></div>
      
      <div className="tool-group">
        <button 
          className="action-button"
          onClick={handleUndoDrawing}
          title="Undo Last Drawing"
        >
          <UndoIcon />
        </button>
        <button 
          className="action-button danger"
          onClick={handleClearDrawings}
          title="Clear All Drawings"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
});

export default ChartDrawingTools; 
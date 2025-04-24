import { useEffect } from 'react';

const DrawingTools = ({ chartContainer }) => {
  useEffect(() => {
    if (!chartContainer) return;
    
    // Need to find the actual chart container inside the TradingViewChart component
    const actualChartContainer = chartContainer.querySelector('.chart-container') || chartContainer;
    
    class DrawingLayer {
      constructor(container) {
        this.container = container;
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.style.position = "absolute";
        this.svg.style.top = "0";
        this.svg.style.left = "0";
        this.svg.style.width = "100%";
        this.svg.style.height = "100%";
        this.svg.style.pointerEvents = "all";
        this.svg.style.zIndex = "10";
        container.appendChild(this.svg);

        this.currentTool = null;
        this.isDrawing = false;
        this.currentElement = null;
        this.drawings = [];
        this.fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        this.fibElements = [];
        this.fibStartPoint = null;

        this.container.addEventListener('mousedown', this.startDrawing.bind(this));
        this.container.addEventListener('mousemove', this.draw.bind(this));
        this.container.addEventListener('mouseup', this.endDrawing.bind(this));

        console.log('DrawingLayer initialized');
      }

      setTool(tool) {
        this.currentTool = tool;
        console.log('Tool selected:', tool);
        this.container.style.cursor = tool === 'pointer' ? 'pointer' : 'crosshair';
      }

      startDrawing(e) {
        if (!this.currentTool) return;
        
        this.isDrawing = true;
        const point = this.getMousePosition(e);

        if (this.currentTool === 'line') {
          this.currentElement = this.createLine(point.x, point.y, point.x, point.y);
          this.svg.appendChild(this.currentElement);
        } else if (this.currentTool === 'pointer') {
          const circle = this.createPoint(point.x, point.y);
          this.svg.appendChild(circle);
          this.drawings.push(circle);
        } else if (this.currentTool === 'box') {
          this.startPoint = point;
          this.currentElement = this.createBox(point.x, point.y, 0, 0);
          this.svg.appendChild(this.currentElement);
        } else if (this.currentTool === 'fibonacci') {
          this.fibStartPoint = point;
          this.currentElement = this.createLine(point.x, point.y, point.x, point.y);
          this.currentElement.setAttribute('stroke', 'gold');
          this.currentElement.setAttribute('stroke-dasharray', '5,2');
          this.svg.appendChild(this.currentElement);
        }
      }

      draw(e) {
        if (!this.isDrawing || !this.currentElement) return;
        
        const point = this.getMousePosition(e);

        if (this.currentTool === 'line') {
          this.currentElement.setAttribute('x2', point.x);
          this.currentElement.setAttribute('y2', point.y);
        } else if (this.currentTool === 'box' && this.startPoint) {
          const width = point.x - this.startPoint.x;
          const height = point.y - this.startPoint.y;
          
          this.currentElement.setAttribute('width', Math.abs(width));
          this.currentElement.setAttribute('height', Math.abs(height));
          
          if (width < 0) {
            this.currentElement.setAttribute('x', point.x);
          }
          
          if (height < 0) {
            this.currentElement.setAttribute('y', point.y);
          }
        } else if (this.currentTool === 'fibonacci' && this.fibStartPoint) {
          this.currentElement.setAttribute('x2', point.x);
          this.currentElement.setAttribute('y2', point.y);
          
          // Update Fibonacci price levels in UI
          this.updateFibonacciLevelPrices(this.fibStartPoint, point);
        }
      }

      endDrawing() {
        if (!this.isDrawing) return;
        
        if (this.currentElement) {
          if (this.currentTool === 'fibonacci' && this.fibStartPoint) {
            const endPoint = {
              x: parseFloat(this.currentElement.getAttribute('x2')),
              y: parseFloat(this.currentElement.getAttribute('y2'))
            };
            
            // Create the actual Fibonacci retracements
            this.createFibonacciLevels(this.fibStartPoint, endPoint);
            
            // Clear the temporary line
            this.svg.removeChild(this.currentElement);
          } else {
            this.drawings.push(this.currentElement);
          }
        }

        this.isDrawing = false;
        this.currentElement = null;
        this.startPoint = null;
        this.fibStartPoint = null;
      }

      createFibonacciLevels(startPoint, endPoint) {
        // Create a group for all fibonacci elements
        const fibGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        fibGroup.setAttribute('class', 'fibonacci-retracement');
        
        // Main trend line
        const mainLine = this.createLine(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
        mainLine.setAttribute('stroke', 'gold');
        mainLine.setAttribute('stroke-width', '2');
        fibGroup.appendChild(mainLine);
        
        // Calculate direction and length
        const isUptrend = startPoint.y > endPoint.y;
        const height = Math.abs(startPoint.y - endPoint.y);
        const width = Math.abs(startPoint.x - endPoint.x);
        
        // Create level lines
        this.fibLevels.forEach(level => {
          const y = isUptrend
            ? endPoint.y + (height * level)
            : startPoint.y + (height * level);
          
          // Create horizontal line for this level
          const levelLine = this.createLine(
            Math.min(startPoint.x, endPoint.x) - 20, 
            y, 
            Math.max(startPoint.x, endPoint.x) + 20, 
            y
          );
          
          levelLine.setAttribute('stroke', 'gold');
          levelLine.setAttribute('stroke-width', '1');
          levelLine.setAttribute('stroke-dasharray', '3,2');
          levelLine.setAttribute('data-level', level.toString());
          fibGroup.appendChild(levelLine);
          
          // Add label for this level
          const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
          label.setAttribute('x', Math.max(startPoint.x, endPoint.x) + 25);
          label.setAttribute('y', y + 4);
          label.setAttribute('fill', 'white');
          label.setAttribute('font-size', '10px');
          label.textContent = level.toString();
          fibGroup.appendChild(label);
        });
        
        // Add to drawings and append to SVG
        this.svg.appendChild(fibGroup);
        this.drawings.push(fibGroup);
        
        // Set the fibonacci tool type attribute for validation
        fibGroup.setAttribute('type', 'fibonacci');
        fibGroup.setAttribute('x1', startPoint.x);
        fibGroup.setAttribute('y1', startPoint.y);
        fibGroup.setAttribute('x2', endPoint.x);
        fibGroup.setAttribute('y2', endPoint.y);
      }
      
      updateFibonacciLevelPrices(startPoint, endPoint) {
        // Calculate the price range
        const range = Math.abs(startPoint.y - endPoint.y);
        const basePrice = Math.min(startPoint.y, endPoint.y);
        
        // Update UI price levels
        this.fibLevels.forEach(level => {
          const priceElement = document.getElementById(`fib-price-${level * 1000}`);
          if (priceElement) {
            const levelPrice = basePrice + (range * level);
            const formattedPrice = levelPrice.toFixed(2);
            priceElement.textContent = formattedPrice;
          }
        });
      }

      createLine(x1, y1, x2, y2) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', 'lime');
        line.setAttribute('stroke-width', '3');
        return line;
      }

      createPoint(x, y) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '5');
        circle.setAttribute('fill', 'purple');
        return circle;
      }

      createBox(x, y, width, height) {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', width);
        rect.setAttribute('height', height);
        rect.setAttribute('stroke', 'orange');
        rect.setAttribute('stroke-width', '2');
        rect.setAttribute('fill', 'rgba(255, 165, 0, 0.2)');
        return rect;
      }

      getMousePosition(event) {
        const rect = this.container.getBoundingClientRect();
        return {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        };
      }

      clearDrawings() {
        while (this.svg.firstChild) {
          this.svg.removeChild(this.svg.firstChild);
        }
        this.drawings = [];
        
        // Reset Fibonacci prices in UI
        this.fibLevels.forEach(level => {
          const priceElement = document.getElementById(`fib-price-${level * 1000}`);
          if (priceElement) {
            priceElement.textContent = '-';
          }
        });
      }

      undoLastDrawing() {
        if (this.drawings.length > 0) {
          const lastDrawing = this.drawings.pop();
          this.svg.removeChild(lastDrawing);
        }
      }
    }
    
    // Initialize drawing layer and expose it globally for tool buttons
    window.drawingLayer = new DrawingLayer(actualChartContainer);
    
    // Set up event listeners for buttons
    document.getElementById('line-tool')?.addEventListener('click', 
      () => window.drawingLayer.setTool('line'));
    document.getElementById('pointer-tool')?.addEventListener('click', 
      () => window.drawingLayer.setTool('pointer'));
    document.getElementById('box-tool')?.addEventListener('click', 
      () => window.drawingLayer.setTool('box'));
    document.getElementById('fibonacci-tool')?.addEventListener('click', 
      () => window.drawingLayer.setTool('fibonacci'));
    document.getElementById('clear-btn')?.addEventListener('click', 
      () => window.drawingLayer.clearDrawings());
    document.getElementById('undo-btn')?.addEventListener('click', 
      () => window.drawingLayer.undoLastDrawing());
    
    // Cleanup on unmount
    return () => {
      if (actualChartContainer.contains(window.drawingLayer.svg)) {
        actualChartContainer.removeChild(window.drawingLayer.svg);
      }
      
      // Remove event listeners to prevent memory leaks
      document.getElementById('line-tool')?.removeEventListener('click', 
        () => window.drawingLayer.setTool('line'));
      document.getElementById('pointer-tool')?.removeEventListener('click', 
        () => window.drawingLayer.setTool('pointer'));
      document.getElementById('box-tool')?.removeEventListener('click', 
        () => window.drawingLayer.setTool('box'));
      document.getElementById('fibonacci-tool')?.removeEventListener('click', 
        () => window.drawingLayer.setTool('fibonacci'));
      document.getElementById('clear-btn')?.removeEventListener('click', 
        () => window.drawingLayer.clearDrawings());
      document.getElementById('undo-btn')?.removeEventListener('click', 
        () => window.drawingLayer.undoLastDrawing());
      
      window.drawingLayer = null;
    };
  }, [chartContainer]);
  
  return null; // This component doesn't render anything directly
};

export default DrawingTools; 
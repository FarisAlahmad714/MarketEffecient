import { useEffect } from 'react';

const DrawingTools = ({ chartContainer }) => {
  useEffect(() => {
    if (!chartContainer) return;
    
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

        this.container.addEventListener('mousedown', this.startDrawing.bind(this));
        this.container.addEventListener('mousemove', this.draw.bind(this));
        this.container.addEventListener('mouseup', this.endDrawing.bind(this));

        console.log('DrawingLayer initialized');
      }

      setTool(tool) {
        this.currentTool = tool;
        console.log('Tool selected:', tool);
        this.container.style.cursor = tool === 'line' ? 'crosshair' : 'pointer';
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
        }
      }

      endDrawing() {
        if (!this.isDrawing) return;
        
        if (this.currentElement) {
          this.drawings.push(this.currentElement);
        }

        this.isDrawing = false;
        this.currentElement = null;
        this.startPoint = null;
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
      }

      undoLastDrawing() {
        if (this.drawings.length > 0) {
          const lastDrawing = this.drawings.pop();
          this.svg.removeChild(lastDrawing);
        }
      }
    }
    
    // Initialize drawing layer and expose it globally for tool buttons
    window.drawingLayer = new DrawingLayer(chartContainer);
    
    // Set up event listeners for buttons
    document.getElementById('line-tool')?.addEventListener('click', 
      () => window.drawingLayer.setTool('line'));
    document.getElementById('pointer-tool')?.addEventListener('click', 
      () => window.drawingLayer.setTool('pointer'));
    document.getElementById('box-tool')?.addEventListener('click', 
      () => window.drawingLayer.setTool('box'));
    document.getElementById('clear-btn')?.addEventListener('click', 
      () => window.drawingLayer.clearDrawings());
    document.getElementById('undo-btn')?.addEventListener('click', 
      () => window.drawingLayer.undoLastDrawing());
    
    // Cleanup on unmount
    return () => {
      if (chartContainer.contains(window.drawingLayer.svg)) {
        chartContainer.removeChild(window.drawingLayer.svg);
      }
      
      // Remove event listeners to prevent memory leaks
      document.getElementById('line-tool')?.removeEventListener('click', 
        () => window.drawingLayer.setTool('line'));
      document.getElementById('pointer-tool')?.removeEventListener('click', 
        () => window.drawingLayer.setTool('pointer'));
      document.getElementById('box-tool')?.removeEventListener('click', 
        () => window.drawingLayer.setTool('box'));
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
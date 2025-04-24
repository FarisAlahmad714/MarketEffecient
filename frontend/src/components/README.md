# Chart Drawing Tools

A React component that provides interactive drawing tools for financial charts, including trend lines, horizontal lines, rectangles, and Fibonacci retracement levels.

## Features

- Multiple drawing tools:
  - Pointer tool for selecting and manipulating drawings
  - Line tool for drawing trend lines
  - Horizontal line tool for support/resistance levels
  - Box tool for highlighting areas of interest
  - Fibonacci retracement levels

- Tools management features:
  - Save drawings
  - Delete selected drawings
  - Undo last drawing
  - Clear all drawings
  - Show/hide all drawings

- Interactive features:
  - Real-time price and date tooltip
  - Selection and highlighting of existing drawings
  - Proper SVG rendering with responsive behavior

## Installation

1. Ensure you have the required dependencies:
```bash
npm install @fortawesome/react-fontawesome @fortawesome/free-solid-svg-icons
```

2. Copy the following files to your project:
   - `ChartDrawingTools.tsx`
   - `ChartDrawingTools.css`

## Usage

```tsx
import React, { useRef } from 'react';
import ChartDrawingTools from './components/ChartDrawingTools';

const MyChartComponent = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartWidth = 800;
  const chartHeight = 400;
  
  // Define these conversion functions based on your chart scale
  const priceToY = (price: number): number => {
    // Convert price to Y coordinate
    // Example implementation:
    return chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;
  };
  
  const yToPrice = (y: number): number => {
    // Convert Y coordinate to price
    // Example implementation:
    return maxPrice - (y / chartHeight) * (maxPrice - minPrice);
  };
  
  const dateToX = (date: Date): number => {
    // Convert date to X coordinate
    // Example implementation:
    const dateTime = date.getTime();
    const minDateTime = minDate.getTime();
    const maxDateTime = maxDate.getTime();
    return ((dateTime - minDateTime) / (maxDateTime - minDateTime)) * chartWidth;
  };
  
  const xToDate = (x: number): Date => {
    // Convert X coordinate to date
    // Example implementation:
    const minDateTime = minDate.getTime();
    const maxDateTime = maxDate.getTime();
    const dateTime = minDateTime + (x / chartWidth) * (maxDateTime - minDateTime);
    return new Date(dateTime);
  };
  
  const handleSaveDrawings = (drawings: any[]) => {
    // Save drawings to your state/database
    console.log('Drawings saved:', drawings);
  };
  
  return (
    <div 
      ref={chartRef} 
      style={{ position: 'relative', width: '100%', height: '500px' }}
    >
      {/* Your chart rendering component goes here */}
      
      <ChartDrawingTools
        chartRef={chartRef}
        chartWidth={chartWidth}
        chartHeight={chartHeight}
        priceToY={priceToY}
        yToPrice={yToPrice}
        dateToX={dateToX}
        xToDate={xToDate}
        onSaveDrawings={handleSaveDrawings}
        savedDrawings={[]} // Pass previously saved drawings here
      />
    </div>
  );
};
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `chartRef` | `React.RefObject<HTMLDivElement>` | Reference to the chart container element |
| `chartWidth` | `number` | Width of the chart in pixels |
| `chartHeight` | `number` | Height of the chart in pixels |
| `priceToY` | `(price: number) => number` | Function to convert a price value to Y coordinate |
| `yToPrice` | `(y: number) => number` | Function to convert a Y coordinate to price value |
| `dateToX` | `(date: Date) => number` | Function to convert a date to X coordinate |
| `xToDate` | `(x: number) => Date` | Function to convert an X coordinate to date |
| `onSaveDrawings` | `(drawings: DrawingObject[]) => void` | Optional callback when drawings are saved |
| `savedDrawings` | `DrawingObject[]` | Optional array of previously saved drawings |

## DrawingObject Interface

Each drawing is represented by an object with the following structure:

```ts
interface DrawingObject {
  id: string;
  type: 'pointer' | 'line' | 'horizontalLine' | 'box' | 'fibonacci';
  points: { x: number; y: number }[];
  visible: boolean;
  color: string;
  selected: boolean;
}
```

## Demo

For a complete working example, see the `ChartDrawingToolsDemo.tsx` file, which provides a simple chart with drawing tools functionality.

## Customization

You can customize the appearance of the drawing tools by modifying the `ChartDrawingTools.css` file. The component uses CSS variables for colors, so it should integrate well with your existing theme.

## License

MIT 
import React, { useContext } from 'react';
import Plot from 'react-plotly.js';
import { ThemeContext } from '../context/ThemeContext';

const CandlestickChart = ({ data, title, height = 400, width = '100%' }) => {
  const { theme } = useContext(ThemeContext);
  const isDarkMode = theme === 'dark';

  // Return early if no data is provided
  if (!data || data.length === 0) {
    return <div className="chart-loading">No chart data available</div>;
  }

  // Extract data for Plotly
  const chartData = {
    x: data.map(item => new Date(item.date)),
    open: data.map(item => item.open),
    high: data.map(item => item.high),
    low: data.map(item => item.low),
    close: data.map(item => item.close),
    increasing: { line: { color: isDarkMode ? '#66bb6a' : '#26a69a' } },
    decreasing: { line: { color: isDarkMode ? '#ef5350' : '#ef5350' } },
    type: 'candlestick',
    xaxis: 'x',
    yaxis: 'y',
    name: 'OHLC'
  };

  // Layout configuration
  const layout = {
    dragmode: 'zoom',
    margin: {
      r: 20,
      t: 50,
      b: 50,
      l: 70
    },
    showlegend: false,
    xaxis: {
      autorange: true,
      title: 'Date',
      rangeslider: {
        visible: false
      },
      type: 'date',
      titlefont: { size: 12, color: isDarkMode ? '#e0e0e0' : '#333333' },
      tickfont: { color: isDarkMode ? '#bbbbbb' : '#555555' },
      gridcolor: isDarkMode ? '#333333' : '#eeeeee'
    },
    yaxis: {
      autorange: true,
      title: 'Price',
      titlefont: { size: 12, color: isDarkMode ? '#e0e0e0' : '#333333' },
      tickfont: { color: isDarkMode ? '#bbbbbb' : '#555555' },
      gridcolor: isDarkMode ? '#333333' : '#eeeeee'
    },
    title: {
      text: title || 'Price Chart',
      font: { size: 14, color: isDarkMode ? '#e0e0e0' : '#333333' }
    },
    plot_bgcolor: isDarkMode ? '#1e1e1e' : '#f8f9fa',
    paper_bgcolor: isDarkMode ? '#1e1e1e' : '#f8f9fa',
    autosize: true
  };

  // Config options
  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png',
      filename: 'chart',
      height: 500,
      width: 700
    }
  };

  return (
    <div className="candlestick-chart-container">
      <Plot
        data={[chartData]}
        layout={layout}
        config={config}
        style={{ width, height }}
        useResizeHandler={true}
      />
    </div>
  );
};

export default CandlestickChart; 
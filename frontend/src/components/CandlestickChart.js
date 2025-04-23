import React from 'react';
import Plot from 'react-plotly.js';

const CandlestickChart = ({ data, title, height = 400, width = '100%' }) => {
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
    increasing: { line: { color: '#26a69a' } },
    decreasing: { line: { color: '#ef5350' } },
    type: 'candlestick',
    xaxis: 'x',
    yaxis: 'y',
    name: 'OHLC'
  };

  // Layout configuration
  const layout = {
    dragmode: 'zoom',
    margin: {
      r: 10,
      t: 40,
      b: 40,
      l: 60
    },
    showlegend: false,
    xaxis: {
      autorange: true,
      title: 'Date',
      rangeslider: {
        visible: false
      },
      type: 'date'
    },
    yaxis: {
      autorange: true,
      title: 'Price'
    },
    title: title || 'Price Chart',
    plot_bgcolor: '#f8f9fa',
    paper_bgcolor: '#f8f9fa'
  };

  // Config options
  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d']
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
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
      titlefont: { size: 12 }
    },
    yaxis: {
      autorange: true,
      title: 'Price',
      titlefont: { size: 12 }
    },
    title: {
      text: title || 'Price Chart',
      font: { size: 14 }
    },
    plot_bgcolor: '#f8f9fa',
    paper_bgcolor: '#f8f9fa',
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
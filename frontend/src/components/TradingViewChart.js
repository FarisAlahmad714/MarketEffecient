import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import './TradingViewChart.css';

const TradingViewChart = ({ 
  data = { candles: [], volume: [] }, 
  options = {},
  onChartReady = () => {} 
}) => {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const seriesRef = useRef({
    candlestick: null,
    volume: null
  });

  // Create and configure chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Default chart options
    const defaultOptions = {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(197, 203, 206, 0.8)',
      },
      layout: {
        background: { color: '#1E1E2F' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      crosshair: {
        mode: 0, // CrosshairMode.Normal
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    };

    // Create chart with merged options
    const chartOptions = { ...defaultOptions, ...options };
    const chart = createChart(chartContainerRef.current, chartOptions);
    chartInstanceRef.current = chart;

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#4CAF50',
      downColor: '#F44336',
      borderUpColor: '#4CAF50',
      borderDownColor: '#F44336',
      wickUpColor: '#4CAF50',
      wickDownColor: '#F44336',
    });
    seriesRef.current.candlestick = candlestickSeries;

    // Create volume series if needed
    if (data.volume && data.volume.length) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
      seriesRef.current.volume = volumeSeries;
    }

    // Set data for candlestick series
    if (data.candles && data.candles.length) {
      candlestickSeries.setData(data.candles);
    }

    // Set data for volume series
    if (data.volume && data.volume.length && seriesRef.current.volume) {
      seriesRef.current.volume.setData(data.volume);
    }

    // Fit content to view
    chart.timeScale().fitContent();

    // Create resize handler
    const handleResize = () => {
      if (chartInstanceRef.current && chartContainerRef.current) {
        chartInstanceRef.current.resize(
          chartContainerRef.current.clientWidth,
          chartContainerRef.current.clientHeight
        );
      }
    };

    // Add resize listener
    window.addEventListener('resize', handleResize);

    // Notify parent component that chart is ready
    onChartReady({
      chart: chartInstanceRef.current,
      series: seriesRef.current,
      container: chartContainerRef.current
    });

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [data, options, onChartReady]);

  // Update data when it changes
  useEffect(() => {
    if (!seriesRef.current.candlestick) return;
    
    // Update candlestick data
    if (data.candles && data.candles.length) {
      seriesRef.current.candlestick.setData(data.candles);
    }
    
    // Update volume data
    if (data.volume && data.volume.length && seriesRef.current.volume) {
      seriesRef.current.volume.setData(data.volume);
    }
  }, [data]);

  return (
    <div className="trading-view-chart-container">
      <div 
        ref={chartContainerRef} 
        className="chart-container"
      />
    </div>
  );
};

export default TradingViewChart; 
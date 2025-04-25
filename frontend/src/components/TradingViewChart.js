import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import './TradingViewChart.css';

const TradingViewChart = ({ 
  data = [], 
  options = {},
  onChartReady = () => {} 
}) => {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const seriesRef = useRef({
    candlestick: null,
    volume: null
  });
  const readyCalledRef = useRef(false);

  // Create chart only once, then update data separately
  useEffect(() => {
    if (!chartContainerRef.current || chartInstanceRef.current) return;

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

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
        seriesRef.current = {
          candlestick: null,
          volume: null
        };
        readyCalledRef.current = false;
      }
    };
  }, []); // Empty dependency array - only run once

  // Update data when it changes - separate effect to prevent chart recreation
  useEffect(() => {
    if (!chartInstanceRef.current || !seriesRef.current.candlestick) return;
    
    // Get the candles array, handling both object format and direct array format
    const candles = Array.isArray(data) ? data : (data.candles || []);
    
    // Make sure candles exist and are valid before setting data
    if (candles && Array.isArray(candles) && candles.length > 0) {
      try {
        // Ensure all candle objects have required properties
        const validCandles = candles.filter(candle => 
          candle && 
          typeof candle.time === 'number' && 
          typeof candle.open === 'number' && 
          typeof candle.high === 'number' && 
          typeof candle.low === 'number' && 
          typeof candle.close === 'number'
        );
        
        if (validCandles.length > 0) {
          console.log(`Setting chart data with ${validCandles.length} valid candles`);
          seriesRef.current.candlestick.setData(validCandles);
          
          // Update volume data if available
          if (data.volume && Array.isArray(data.volume) && data.volume.length > 0 && seriesRef.current.volume) {
            seriesRef.current.volume.setData(data.volume);
          }
      
          // Fit content to view - only call once per data update
          chartInstanceRef.current.timeScale().fitContent();
          
          // Notify parent component that chart is ready - only once per instance
          if (!readyCalledRef.current) {
            // Use setTimeout to ensure chart is fully rendered before callback
            setTimeout(() => {
              readyCalledRef.current = true;
              onChartReady({
                chart: chartInstanceRef.current,
                series: seriesRef.current,
                container: chartContainerRef.current,
                // Direct methods to be used by drawing tools
                coordinateToPrice: (y) => {
                  if (!seriesRef.current.candlestick) return 0;
                  return seriesRef.current.candlestick.coordinateToPrice(y);
                },
                priceToCoordinate: (price) => {
                  if (!seriesRef.current.candlestick) return 0;
                  return seriesRef.current.candlestick.priceToCoordinate(price);
                }
              });
            }, 100);
          }
        } else {
          console.warn("No valid candle data found");
          // Display placeholder or error message if needed
        }
      } catch (error) {
        console.error("Error setting chart data:", error);
      }
    } else {
      console.warn("No candle data available for chart");
      // Display placeholder or error message
    }
  }, [data, onChartReady]);

  // Check if we have valid data to display
  const hasValidData = Array.isArray(data) ? data.length > 0 : 
                     (data && data.candles && Array.isArray(data.candles) && data.candles.length > 0);

  return (
    <div className="trading-view-chart-container">
      <div 
        ref={chartContainerRef} 
        className="chart-container"
      />
      {!hasValidData && (
        <div className="chart-error-overlay">
          <div className="chart-error-message">
            <h3>Chart Data Unavailable</h3>
            <p>Unable to load chart data. Please try refreshing the page.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(TradingViewChart); 
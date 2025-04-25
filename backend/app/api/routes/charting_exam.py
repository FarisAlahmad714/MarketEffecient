from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import random
import math
import requests
import datetime
import json
import os
import logging
import time
from app.database import get_db
from app.api.utils.chart_validation import ChartValidator

router = APIRouter()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create necessary directories
os.makedirs("app/static/crypto", exist_ok=True)
os.makedirs("app/static/equities", exist_ok=True)
os.makedirs("app/static/cache", exist_ok=True)

# Exam types and descriptions 
CHARTING_EXAM_DESCRIPTIONS = {
    'swing_analysis': {
        'title': 'Swing Points & Equal Highs/Lows',
        'description': 'Practice identifying swing points and equal price levels through chart markup.',
        'sections': ['swing_points', 'equal_levels'],
        'tools_required': ['line', 'pointer', 'hline'],
        'instructions': 'Mark swing points and equal price levels on charts.'
    },
    "fibonacci": {
        "title": "Fibonacci Retracements",
        "description": "Learn to plot Fibonacci retracements from swing high to swing low",
        "sections": ["fib_retracement"],
        "tools_required": ["fibonacci"]
    },
    "gap_analysis": {
        "title": "Gap Analysis & FVG",
        "description": "Identify fair value gaps, volume imbalances, and consequent encroachment",
        "sections": ["fvg", "volume_imbalance", "gaps", "encroachment", "inversion"],
        "tools_required": ["box", "line"]
    },
    "order_blocks": {
        "title": "Order Block Formation",
        "description": "Complete order block analysis including liquidity, BOS, and order block identification",
        "sections": ["liquidity", "swing", "bos", "ob_identification", "reaction"],
        "tools_required": ["line", "pointer", "box"]
    }
}

# Dummy data for chart exam questions (original implementation kept)
EXAM_QUESTIONS = {
    # Original implementation
}

# Helper functions for chart data and validation
def fetch_chart_data(coin=None, timeframe=None, limit=100):
    """
    Fetch chart data from CoinGecko with improved reliability.
    Returns the full chart data but manages storage more efficiently.
    """
    # Define available coins and timeframes
    all_coins = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'cosmos', 'ripple', 'litecoin', 'chainlink']
    hourly_coins = ['bitcoin', 'ethereum', 'binancecoin', 'solana']
    timeframes = {'1h': 2, '4h': 14, '1d': 60, '1w': 180}
    
    # Select timeframe if not provided
    timeframe = timeframe or random.choice(list(timeframes.keys()))
    logger.debug(f"Selected timeframe: {timeframe}")
    
    # Select coin based on timeframe restrictions
    if coin is None:
        if timeframe == '1h':
            coin = random.choice(hourly_coins)
        else:
            coin = random.choice(all_coins)
    
    try:
        # Use caching to avoid repeated API calls
        cache_file = f"app/static/cache/{coin}_ohlc_365days.pkl"
        if os.path.exists(cache_file):
            with open(cache_file, 'rb') as f:
                import pickle
                raw_data = pickle.load(f)
            logger.debug(f"Loaded {coin} data from cache")
        else:
            days = 365  # Fetch 365 days of data
            url = f"https://api.coingecko.com/api/v3/coins/{coin}/ohlc?vs_currency=usd&days={days}"
            headers = {"x-cg-demo-api-key": "CG-X9rKSiVeFyMS6FPbUCaFw4Lc"}  # Replace with your API key
            
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code != 200:
                logger.error(f"API Error: {response.status_code} - {response.text}")
                # Use fallback data instead of returning empty list
                raw_data = generate_fallback_data(coin, days)
            else:
                raw_data = response.json()
                if not raw_data:
                    logger.error("No OHLC data received")
                    # Use fallback data
                    raw_data = generate_fallback_data(coin, days)
                
                # Cache the raw data
                try:
                    with open(cache_file, 'wb') as f:
                        import pickle
                        pickle.dump(raw_data, f)
                except Exception as cache_err:
                    logger.error(f"Failed to cache data: {cache_err}")
        
        # Format the candle data
        chart_data = format_candles(raw_data, timeframe)
        
        # Apply a limit but ensure we have at least 50 candles
        candles_to_take = min(max(50, limit), len(chart_data))
        return chart_data[-candles_to_take:], coin, timeframe
        
    except Exception as e:
        logger.error(f"Exception in fetch_chart_data: {e}")
        # Generate fallback data to avoid returning empty result
        fallback_data = generate_fallback_data(coin, 100)
        chart_data = format_candles(fallback_data, timeframe)
        candles_to_take = min(max(50, limit), len(chart_data))
        return chart_data[-candles_to_take:], coin, timeframe

def format_candles(raw_data, timeframe):
    """Format raw data into candles for the specified timeframe"""
    chart_data = []
    
    if timeframe == '1h':
        # Convert each 1-day candle into 24 hourly candles
        for row in raw_data:
            base_time = int(row[0] / 1000)  # Convert milliseconds to seconds
            open_price = float(row[1])
            close_price = float(row[4])
            high_price = float(row[2])
            low_price = float(row[3])
            
            # Linearly interpolate prices over 24 hours
            for hour in range(24):
                time = base_time + hour * 3600
                # Interpolate the price for this hour
                price_ratio = hour / 24
                interpolated_price = open_price + (close_price - open_price) * price_ratio
                # Scale high and low proportionally
                high = high_price * (1 + (hour / 24) * (close_price / open_price - 1)) if open_price != 0 else high_price
                low = low_price * (1 + (hour / 24) * (close_price / open_price - 1)) if open_price != 0 else low_price
                candle = {
                    'time': time,
                    'open': interpolated_price if hour == 0 else chart_data[-1]['close'],
                    'high': high,
                    'low': low,
                    'close': interpolated_price
                }
                chart_data.append(candle)
    elif timeframe == '4h':
        # Convert each 1-day candle into 6 4-hourly candles
        for row in raw_data:
            base_time = int(row[0] / 1000)
            open_price = float(row[1])
            close_price = float(row[4])
            high_price = float(row[2])
            low_price = float(row[3])
            
            for segment in range(6):
                time = base_time + segment * 14400  # 4 hours = 14400 seconds
                price_ratio = segment / 6
                interpolated_price = open_price + (close_price - open_price) * price_ratio
                high = high_price * (1 + (segment / 6) * (close_price / open_price - 1)) if open_price != 0 else high_price
                low = low_price * (1 + (segment / 6) * (close_price / open_price - 1)) if open_price != 0 else low_price
                candle = {
                    'time': time,
                    'open': interpolated_price if segment == 0 else chart_data[-1]['close'],
                    'high': high,
                    'low': low,
                    'close': interpolated_price
                }
                chart_data.append(candle)
    elif timeframe == '1d':
        # Use the 1-day candles as-is
        for row in raw_data:
            candle = {
                'time': int(row[0] / 1000),
                'open': float(row[1]),
                'high': float(row[2]),
                'low': float(row[3]),
                'close': float(row[4])
            }
            chart_data.append(candle)
    elif timeframe == '1w':
        # Aggregate 7 days into 1 weekly candle
        weekly_candles = {}
        for row in raw_data:
            timestamp = int(row[0] / 1000)
            week_start = timestamp - (timestamp % (7 * 86400))
            if week_start not in weekly_candles:
                weekly_candles[week_start] = {
                    'open': float(row[1]),
                    'high': float(row[2]),
                    'low': float(row[3]),
                    'close': float(row[4])
                }
            else:
                candle = weekly_candles[week_start]
                candle['high'] = max(candle['high'], float(row[2]))
                candle['low'] = min(candle['low'], float(row[3]))
                candle['close'] = float(row[4])
        
        for week_start, candle in sorted(weekly_candles.items()):
            chart_data.append({
                'time': week_start,
                'open': candle['open'],
                'high': candle['high'],
                'low': candle['low'],
                'close': candle['close']
            })
    
    return chart_data

def detect_swing_points(data, lookback=5, timeframe='4h', significance_threshold=0.01):
    """
    Detect swing highs and lows in chart data
    
    Args:
        data: List of candle data with high, low and time properties
        lookback: Number of candles to check on either side
        timeframe: Chart timeframe (used to adjust sensitivity)
        significance_threshold: Minimum percentage change required for significance
    
    Returns:
        List of swing points with their types (high or low)
    """
    if not data or len(data) < (2 * lookback + 1):
        return []
    
    # Adjust significance threshold based on timeframe
    timeframe_multipliers = {
        '1h': 0.6,
        '4h': 1.0,
        '1d': 1.5,
        '1w': 2.0,
        '1m': 3.0
    }
    adjusted_threshold = significance_threshold * timeframe_multipliers.get(timeframe, 1.0)
    
    # Get the price range to normalize the significance
    price_high = max(candle.get('high', 0) for candle in data)
    price_low = min(candle.get('low', 0) for candle in data)
    price_range = price_high - price_low if price_high > price_low else 1
    
    swing_points = []
    
    # Find swing highs
    for i in range(lookback, len(data) - lookback):
        current_candle = data[i]
        is_swing_high = True
        
        # Check if center candle has the highest high among neighbors
        for j in range(i - lookback, i + lookback + 1):
            if j == i:
                continue
            
            if data[j].get('high', 0) >= current_candle.get('high', 0):
                is_swing_high = False
                break
        
        if is_swing_high:
            # Check if the swing is significant
            significance = (current_candle.get('high', 0) - min(data[i-lookback:i+lookback+1], key=lambda x: x.get('low', 0)).get('low', 0)) / price_range
            
            if significance >= adjusted_threshold:
                swing_points.append({
                    'type': 'high',
                    'time': current_candle.get('time', 0),
                    'price': current_candle.get('high', 0)
                })
    
    # Find swing lows
    for i in range(lookback, len(data) - lookback):
        current_candle = data[i]
        is_swing_low = True
        
        # Check if center candle has the lowest low among neighbors
        for j in range(i - lookback, i + lookback + 1):
            if j == i:
                continue
            
            if data[j].get('low', 0) <= current_candle.get('low', 0):
                is_swing_low = False
                break
        
        if is_swing_low:
            # Check if the swing is significant
            significance = (max(data[i-lookback:i+lookback+1], key=lambda x: x.get('high', 0)).get('high', 0) - current_candle.get('low', 0)) / price_range
            
            if significance >= adjusted_threshold:
                swing_points.append({
                    'type': 'low',
                    'time': current_candle.get('time', 0),
                    'price': current_candle.get('low', 0)
                })
    
    return swing_points

def validate_swing_points(drawings, chart_data, interval):
    """
    Validate user-drawn swing points against actual swing points in the chart data
    """
    # Detect actual swing points in the data
    actual_points = detect_swing_points(chart_data, lookback=5, timeframe=interval)
    
    # Extract user drawn points
    user_points = []
    for drawing in drawings:
        if drawing.get('type') == 'pointer' or drawing.get('type') == 'point':
            point_type = drawing.get('pointType', 'high')  # Default to high if not specified
            
            # Get time and price from the drawing
            time = drawing.get('time')
            price = drawing.get('price')
            
            # If time and price are directly available, use them
            if time and price:
                user_points.append({
                    'type': point_type,
                    'time': time,
                    'price': price
                })
            # Otherwise, try to extract from points array
            elif 'points' in drawing and len(drawing['points']) > 0:
                point = drawing['points'][0]
                user_points.append({
                    'type': point_type,
                    'time': point.get('time', 0),
                    'price': point.get('price', 0),
                    'x': point.get('x', 0),
                    'y': point.get('y', 0)
                })
    
    # Calculate scores and provide feedback
    correct_points = []
    incorrect_points = []
    
    # Tolerance for matching swing points (as percentage of price range)
    price_range = max([c.get('high', 0) for c in chart_data]) - min([c.get('low', 0) for c in chart_data])
    time_range = chart_data[-1].get('time', 0) - chart_data[0].get('time', 0)
    
    price_tolerance = price_range * 0.02  # 2% of price range
    time_tolerance = time_range * 0.03    # 3% of time range
    
    # Check each user point against actual points
    for user_point in user_points:
        matched = False
        
        for actual_point in actual_points:
            # Skip if point types don't match
            if user_point.get('type') != actual_point.get('type'):
                continue
                
            # Calculate differences
            time_diff = abs(user_point.get('time', 0) - actual_point.get('time', 0))
            price_diff = abs(user_point.get('price', 0) - actual_point.get('price', 0))
            
            # If within tolerance, mark as correct
            if time_diff <= time_tolerance and price_diff <= price_tolerance:
                matched = True
                correct_points.append({
                    'type': user_point.get('type'),
                    'message': f"Correctly identified {user_point.get('type')} swing point"
                })
                break
        
        if not matched:
            incorrect_points.append({
                'type': user_point.get('type'),
                'message': f"This doesn't appear to be a significant {user_point.get('type')} swing point"
            })
    
    # Calculate score
    total_actual_points = len(actual_points)
    correct_count = len(correct_points)
    
    # Calculate final score (out of 100)
    if total_actual_points == 0:
        score_percentage = 0
    else:
        # Base score on correct identifications minus penalties for incorrect ones
        correct_ratio = correct_count / total_actual_points
        incorrect_penalty = min(0.5, len(incorrect_points) * 0.1)  # Cap penalty at 50%
        score_percentage = max(0, correct_ratio - incorrect_penalty)
    
    # Scale to integer score out of 10
    score = round(score_percentage * 10)
    
    # Format feedback messages for the frontend
    correct_feedback = [item['message'] for item in correct_points]
    incorrect_feedback = [item['message'] for item in incorrect_points]
    
    # Add feedback about missed points
    missed_count = total_actual_points - correct_count
    if missed_count > 0:
        types_missed = {point['type']: 0 for point in actual_points}
        for point in actual_points:
            matched = False
            for user_point in user_points:
                if user_point.get('type') == point.get('type'):
                    # Check if it's close enough
                    time_diff = abs(user_point.get('time', 0) - point.get('time', 0))
                    price_diff = abs(user_point.get('price', 0) - point.get('price', 0))
                    if time_diff <= time_tolerance and price_diff <= price_tolerance:
                        matched = True
                        break
            
            if not matched:
                types_missed[point['type']] += 1
        
        for point_type, count in types_missed.items():
            if count > 0:
                incorrect_feedback.append(f"You missed {count} {point_type} swing point{'s' if count > 1 else ''}")
    
    return {
        'success': True,
        'score': score,
        'totalExpectedPoints': 10,
        'feedback': {
            'correct': correct_feedback,
            'incorrect': incorrect_feedback
        },
        'details': {
            'correctCount': correct_count,
            'incorrectCount': len(incorrect_points),
            'missedCount': missed_count,
            'totalActualPoints': total_actual_points
        }
    }

def validate_fibonacci_retracement(drawings, chart_data, interval, part):
    """Validate Fibonacci retracement drawings"""
    default_expected = {'start': {'time': 0, 'price': 0}, 'end': {'time': 0, 'price': 0}, 'direction': 'unknown'}

    if not chart_data or len(chart_data) < 10:
        return {
            'success': False,
            'message': 'Insufficient chart data for validation.',
            'score': 0,
            'feedback': {'correct': [], 'incorrect': [{'advice': 'No chart data available. Please try again with a different chart.'}]},
            'totalExpectedPoints': 0,
            'expected': default_expected
        }

    swing_points = detect_swing_points(chart_data, timeframe=interval)
    highs = swing_points['highs']
    lows = swing_points['lows']

    if len(highs) < 1 or len(lows) < 1:
        return {
            'success': False,
            'message': 'Not enough significant swing points for a retracement.',
            'score': 0,
            'feedback': {'correct': [], 'incorrect': [{'advice': 'This chart lacks clear swing points. Try another chart.'}]},
            'totalExpectedPoints': 0,
            'expected': default_expected
        }

    # Determine uptrend and downtrend Fibonacci opportunities
    lows_with_subsequent_high = [low for low in lows if any(high['time'] > low['time'] for high in highs)]
    uptrend_low = max(lows_with_subsequent_high, key=lambda x: x['time']) if lows_with_subsequent_high else None
    subsequent_highs = [high for high in highs if uptrend_low and high['time'] > uptrend_low['time']]
    uptrend_high = max(subsequent_highs, key=lambda x: x['time']) if subsequent_highs else None

    highs_with_subsequent_low = [high for high in highs if any(low['time'] > high['time'] for low in lows)]
    downtrend_high = max(highs_with_subsequent_low, key=lambda x: x['time']) if highs_with_subsequent_low else None
    subsequent_lows = [low for low in lows if downtrend_high and low['time'] > downtrend_high['time']]
    downtrend_low = max(subsequent_lows, key=lambda x: x['time']) if subsequent_lows else None

    expected_retracement = (
        {'start': uptrend_low, 'end': uptrend_high, 'direction': 'uptrend'} if part == 1 and uptrend_low and uptrend_high else
        {'start': downtrend_high, 'end': downtrend_low, 'direction': 'downtrend'} if part == 2 and downtrend_high and downtrend_low else
        default_expected
    )

    if expected_retracement == default_expected:
        return {
            'success': False,
            'message': f"No significant {'uptrend' if part == 1 else 'downtrend'} retracement found.",
            'score': 0,
            'feedback': {'correct': [], 'incorrect': [{'advice': f"Couldn't find a clear {'uptrend' if part == 1 else 'downtrend'} retracement. Try another chart."}]},
            'totalExpectedPoints': 2,
            'expected': expected_retracement
        }

    price_range = max(c['high'] for c in chart_data) - min(c['low'] for c in chart_data) if chart_data else 1
    tolerance_map = {'1h': 0.01, '4h': 0.02, '1d': 0.03, '1w': 0.04}
    price_tolerance = price_range * tolerance_map.get(interval, 0.02)
    time_increment = {'1h': 3600, '4h': 14400, '1d': 86400, '1w': 604800}.get(interval, 14400)
    time_tolerance = time_increment * 3

    total_credits = 2
    credits_earned = 0
    feedback = {'correct': [], 'incorrect': []}

    if not drawings:
        feedback['incorrect'].append({
            'type': 'missed_retracement',
            'direction': expected_retracement['direction'],
            'startPrice': expected_retracement['start']['price'],
            'endPrice': expected_retracement['end']['price'],
            'advice': f"You missed the {expected_retracement['direction']} retracement from {expected_retracement['start']['price']:.2f} to {expected_retracement['end']['price']:.2f}."
        })
    else:
        for fib in drawings:
            user_direction = 'uptrend' if fib['end']['price'] > fib['start']['price'] else 'downtrend'
            direction_matched = user_direction == expected_retracement['direction']

            if not direction_matched:
                feedback['incorrect'].append({
                    'type': 'incorrect_direction',
                    'direction': user_direction,
                    'startPrice': fib['start']['price'],
                    'endPrice': fib['end']['price'],
                    'advice': f"Direction incorrect: Expected {expected_retracement['direction']}, but you drew a {user_direction} from {fib['start']['price']:.2f} to {fib['end']['price']:.2f}."
                })
                continue

            start_exact = (abs(fib['start']['time'] - expected_retracement['start']['time']) < time_tolerance and
                           abs(fib['start']['price'] - expected_retracement['start']['price']) < price_tolerance)
            start_close = (abs(fib['start']['time'] - expected_retracement['start']['time']) < time_tolerance * 2 and
                           abs(fib['start']['price'] - expected_retracement['start']['price']) < price_tolerance * 2)
            
            start_credits = 1 if start_exact else 0.5 if start_close else 0
            credits_earned += start_credits

            end_exact = (abs(fib['end']['time'] - expected_retracement['end']['time']) < time_tolerance and
                         abs(fib['end']['price'] - expected_retracement['end']['price']) < price_tolerance)
            end_close = (abs(fib['end']['time'] - expected_retracement['end']['time']) < time_tolerance * 2 and
                         abs(fib['end']['price'] - expected_retracement['end']['price']) < price_tolerance * 2)
            
            end_credits = 1 if end_exact else 0.5 if end_close else 0
            credits_earned += end_credits

            feedback['correct'].append({
                'direction': user_direction,
                'startPrice': fib['start']['price'],
                'endPrice': fib['end']['price'],
                'startCredits': start_credits,
                'endCredits': end_credits,
                'advice': f"Start Price: {start_credits}/1 credit ({'Exact' if start_exact else 'Close' if start_close else 'Incorrect'}), End Price: {end_credits}/1 credit ({'Exact' if end_exact else 'Close' if end_close else 'Incorrect'})"
            })

        if credits_earned == 0:
            feedback['incorrect'].append({
                'type': 'missed_retracement',
                'direction': expected_retracement['direction'],
                'startPrice': expected_retracement['start']['price'],
                'endPrice': expected_retracement['end']['price'],
                'advice': f"You missed the {expected_retracement['direction']} retracement from {expected_retracement['start']['price']:.2f} to {expected_retracement['end']['price']:.2f}."
            })

    success = credits_earned > 0
    score = credits_earned

    return {
        'success': success,
        'message': f"{'Uptrend' if part == 1 else 'Downtrend'} retracement: {score}/{total_credits} credits earned!",
        'score': score,
        'feedback': feedback,
        'totalExpectedPoints': total_credits,
        'expected': expected_retracement,
        'next_part': 2 if part == 1 else None
    }

# API Routes for charting exams
@router.get("/charting_exams")
async def get_charting_exams():
    """Get all available charting exam types"""
    exams = [
        {
            "id": "swing_analysis",
            "title": "Swing Analysis Exam",
            "description": "Learn to identify swing highs and lows, and mark equal price levels.",
            "difficulty": "beginner",
            "sections": ["swing_points", "equal_levels"]
        },
        {
            "id": "fibonacci",
            "title": "Fibonacci Retracement Exam",
            "description": "Practice applying Fibonacci retracement tools to identify support/resistance.",
            "difficulty": "intermediate",
            "sections": ["impulse_waves", "retracement_levels"]
        },
        {
            "id": "gap_analysis",
            "title": "Gap Analysis & FVG Exam",
            "description": "Learn to identify gaps and fair value gaps in price charts.",
            "difficulty": "advanced",
            "sections": ["price_gaps", "fair_value_gaps"]
        },
        {
            "id": "order_blocks",
            "title": "Order Block Formation Exam",
            "description": "Practice identifying order blocks and market structure breaks.",
            "difficulty": "advanced",
            "sections": ["liquidity", "bos", "ob_identification"]
        }
    ]
    return exams

@router.get("/charting_exam/{exam_type}")
async def get_exam_info(exam_type: str):
    """Get information about a specific exam type"""
    if exam_type not in CHARTING_EXAM_DESCRIPTIONS:
        raise HTTPException(status_code=404, detail=f"Exam type '{exam_type}' not found")
        
    return CHARTING_EXAM_DESCRIPTIONS[exam_type]

@router.get("/charting_exam/fibonacci_retracement")
async def fibonacci_retracement_exam(request: Request):
    """Specialized route for Fibonacci retracement exam"""
    # Get query parameters
    params = dict(request.query_params)
    reset = params.get('reset') == 'true'
    
    # Load or create chart data
    chart_data, coin, timeframe = fetch_chart_data(limit=100)
    
    response = {
        "chart_data": chart_data,
        "symbol": coin.upper(),
        "timeframe": timeframe,
        "progress": {
            "chart_count": 1,
            "fibonacci_part": 1
        },
        "instructions": "Draw Fibonacci retracements for both uptrend (low to high) and downtrend (high to low) scenarios."
    }
    
    return response

@router.get("/charting_exam/swing_analysis")
async def swing_analysis_exam(request: Request):
    """Specialized route for swing analysis exam"""
    # Get query parameters
    params = dict(request.query_params)
    
    # Load chart data
    chart_data, coin, timeframe = fetch_chart_data()
    
    response = {
        "chart_data": chart_data,
        "symbol": coin.upper(),
        "timeframe": timeframe,
        "progress": {
            "chart_count": 1
        },
        "instructions": "Mark all significant swing points on this chart"
    }
    
    return response

@router.get("/charting_exam/gap_analysis")
async def gap_analysis_exam(request: Request):
    """Specialized route for Fair Value Gap exam"""
    # Get query parameters
    params = dict(request.query_params)
    
    # Load chart data
    chart_data, coin, timeframe = fetch_chart_data()
    
    response = {
        "chart_data": chart_data,
        "symbol": coin.upper(),
        "timeframe": timeframe,
        "progress": {
            "chart_count": 1,
            "fvg_part": 1
        },
        "instructions": "Identify all Fair Value Gaps (FVGs) on this chart."
    }
    
    return response

@router.get("/charting_exam/orderblocks")
async def orderblocks_exam(request: Request):
    """Specialized route for Order Blocks exam"""
    # Get query parameters
    params = dict(request.query_params)
    
    # Load chart data
    chart_data, coin, timeframe = fetch_chart_data()
    
    response = {
        "chart_data": chart_data,
        "symbol": coin.upper(),
        "timeframe": timeframe,
        "progress": {
            "chart_count": 1
        },
        "instructions": "Identify order blocks on this chart, marking areas of institutional interest."
    }
    
    return response

@router.get("/charting_exam/{exam_type}/practice")
async def get_practice_chart(exam_type: str, section: str = None, chart_num: int = 1):
    """Get a chart for practice in a specific exam section"""
    if exam_type not in CHARTING_EXAM_DESCRIPTIONS:
        raise HTTPException(status_code=404, detail=f"Exam type '{exam_type}' not found")
    
    # Generate a new chart
    chart_data, coin, timeframe = fetch_chart_data()
    
    # Build response
    response = {
        "symbol": coin.upper(),
        "chart_data": chart_data,  
        "section": section or "default",
        "instructions": f"Identify the {section if section else 'patterns'} in this chart",
        "progress": {
            "chart_count": chart_num,
            "total_charts": 5
        },
        "timeframe": timeframe
    }
    
    return response

@router.post("/charting_exam/{exam_type}/validate")
async def validate_answers(exam_type: str, request: Request):
    """Validate the user's answers for a chart"""
    data = await request.json()
    
    drawings = data.get("drawings", [])
    section = data.get("section", "")
    chart_number = data.get("chartNumber", 1)
    chart_data = data.get("chartData", [])
    interval = data.get("interval", "4h")
    
    # Route to the appropriate validation function based on exam type
    if exam_type == 'fibonacci' or exam_type == 'fibonacci_retracement':
        fibonacci_part = data.get("fibonacciPart", 1)
        validation_result = validate_fibonacci_retracement(drawings, chart_data, interval, fibonacci_part)
    elif exam_type == 'swing_analysis':
        validation_result = validate_swing_points(drawings, chart_data, interval)
    elif exam_type == 'gap_analysis' or exam_type == 'fair_value_gaps':
        fvg_part = data.get("fvgPart", 1)
        # Call appropriate FVG validation function here
        # For now return a placeholder
        validation_result = {
            'success': True,
            'message': 'Gap analysis validation not implemented yet',
            'score': 1,
            'feedback': {'correct': [], 'incorrect': []},
            'totalExpectedPoints': 1
        }
    elif exam_type == 'order_blocks':
        # Call appropriate order block validation function here
        # For now return a placeholder
        validation_result = {
            'success': True,
            'message': 'Order block validation not implemented yet',
            'score': 1,
            'feedback': {'correct': [], 'incorrect': []},
            'totalExpectedPoints': 1
        }
    else:
        return {
            'success': False,
            'message': f'Exam type {exam_type} validation not implemented yet',
            'score': 0
        }
    
    # Add chart info to the response
    validation_result['chart_count'] = chart_number
    
    return validation_result

@router.get("/charting_exam/next_chart")
async def get_next_chart(exam_type: str, section: str = None, chart_count: int = 1):
    """Get the next chart in a sequence"""
    # Keep chart_count within range
    chart_count = max(1, min(5, chart_count))
    
    # Generate a new chart
    chart_data, coin, timeframe = fetch_chart_data()
    
    return {
        "chart_data": chart_data,
        "chart_count": chart_count,
        "symbol": coin.upper(),
        "interval": timeframe,
        "section": section or "default",
        "progress": {
            "chart_count": chart_count,
            "total_charts": 5
        },
        "instructions": f"Identify the {section if section else 'patterns'} in this chart."
    }

# Helper functions for chart validation
def generate_random_candles(count=50, base_price=100):
    """Generate random candles for testing"""
    candles = []
    price = base_price
    
    for i in range(count):
        change = random.uniform(-5, 5)
        open_price = price
        close_price = price + change
        high_price = max(open_price, close_price) + random.uniform(0, 3)
        low_price = min(open_price, close_price) - random.uniform(0, 3)
        
        candle = {
            'time': int(time.time()) - (count - i) * 86400,  # One day apart
            'open': open_price,
            'high': high_price,
            'low': low_price,
            'close': close_price
        }
        
        candles.append(candle)
        price = close_price
    
    return candles

def generate_fallback_data(coin, days):
    """Generate synthetic data when API fails"""
    logger.info(f"Generating fallback data for {coin}")
    candles = []
    base_price = {
        'bitcoin': 40000,
        'ethereum': 2200,
        'binancecoin': 350,
        'solana': 120,
        'cosmos': 8,
        'ripple': 0.5,
        'litecoin': 70,
        'chainlink': 12
    }.get(coin, 100)
    
    # Generate synthetic OHLC data for specified days
    start_timestamp = int(time.time()) - (days * 86400)
    for day in range(days):
        timestamp = (start_timestamp + day * 86400) * 1000  # CoinGecko uses milliseconds
        price_change = (random.random() - 0.5) * 0.05  # -2.5% to +2.5% daily change
        day_open = base_price * (1 + day * 0.001 + random.random() * 0.1)  # Add some trend and randomness
        day_close = day_open * (1 + price_change)
        day_high = max(day_open, day_close) * (1 + random.random() * 0.03)
        day_low = min(day_open, day_close) * (1 - random.random() * 0.03)
        
        candles.append([
            timestamp,
            day_open,
            day_high,
            day_low,
            day_close
        ])
    
    return candles 
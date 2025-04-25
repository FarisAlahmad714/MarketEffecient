"""
Swing Point Detection Service

This module provides functionality to detect and validate swing points in price charts.
"""
import numpy as np
from typing import List, Dict, Any, Union
from datetime import datetime

def detect_swing_points(price_data: List[Dict[str, Any]], 
                       high_lookback: int = 3, 
                       low_lookback: int = 3,
                       include_minor: bool = True) -> Dict[str, List]:
    """
    Detects swing high and low points in price data.
    
    Args:
        price_data: Array of OHLC data with 'high', 'low', 'time' fields
        high_lookback: Number of periods to look back/forward for swing highs
        low_lookback: Number of periods to look back/forward for swing lows
        include_minor: Whether to include minor swing points
        
    Returns:
        Dictionary with 'highs' and 'lows' lists containing swing points with metadata
    """
    swing_points = {
        'highs': [],
        'lows': []
    }
    
    # Detect major swing points (lookback of 5)
    _detect_points(price_data, 5, 5, swing_points, 'major')
    
    # Detect minor swing points if requested
    if include_minor:
        _detect_points(price_data, high_lookback, low_lookback, swing_points, 'minor')
    
    # Sort points by time
    swing_points['highs'] = sorted(swing_points['highs'], key=lambda x: x['time'])
    swing_points['lows'] = sorted(swing_points['lows'], key=lambda x: x['time'])
    
    return swing_points

def _detect_points(price_data: List[Dict[str, Any]], 
                  high_lookback: int, 
                  low_lookback: int,
                  swing_points: Dict[str, List],
                  significance: str) -> None:
    """
    Helper function to detect both high and low swing points
    
    Args:
        price_data: Array of OHLC data
        high_lookback: Lookback period for highs
        low_lookback: Lookback period for lows
        swing_points: Dictionary to store results
        significance: 'major' or 'minor'
    """
    # Detect swing highs
    for i in range(high_lookback, len(price_data) - high_lookback):
        # Check if this is a swing high
        is_swing_high = True
        current_high = price_data[i]['high']
        
        # Skip if already detected as a major point when looking for minor points
        if significance == 'minor' and any(p['index'] == i for p in swing_points['highs']):
            continue
            
        for j in range(1, high_lookback + 1):
            if (current_high <= price_data[i-j]['high'] or 
                current_high <= price_data[i+j]['high']):
                is_swing_high = False
                break
                
        if is_swing_high:
            # Convert time to timestamp if it's a string
            time_value = price_data[i]['time']
            if isinstance(time_value, str):
                time_value = datetime.fromisoformat(time_value.replace('Z', '+00:00')).timestamp() * 1000
                
            swing_points['highs'].append({
                'type': 'high',
                'price': current_high,
                'time': time_value,
                'index': i,
                'significance': significance
            })
    
    # Detect swing lows
    for i in range(low_lookback, len(price_data) - low_lookback):
        # Check if this is a swing low
        is_swing_low = True
        current_low = price_data[i]['low']
        
        # Skip if already detected as a major point when looking for minor points
        if significance == 'minor' and any(p['index'] == i for p in swing_points['lows']):
            continue
            
        for j in range(1, low_lookback + 1):
            if (current_low >= price_data[i-j]['low'] or 
                current_low >= price_data[i+j]['low']):
                is_swing_low = False
                break
                
        if is_swing_low:
            # Convert time to timestamp if it's a string
            time_value = price_data[i]['time']
            if isinstance(time_value, str):
                time_value = datetime.fromisoformat(time_value.replace('Z', '+00:00')).timestamp() * 1000
                
            swing_points['lows'].append({
                'type': 'low',
                'price': current_low,
                'time': time_value,
                'index': i,
                'significance': significance
            })

def validate_swing_points(user_points: List[Dict[str, Any]], 
                         expected_points: Dict[str, List],
                         tolerance_price_pct: float = 0.005,
                         tolerance_time_sec: int = 7200) -> Dict[str, Any]:
    """
    Validates user-identified swing points against expected points
    
    Args:
        user_points: List of points marked by the user
        expected_points: Dictionary of expected swing points (highs and lows)
        tolerance_price_pct: Price tolerance as percentage of price
        tolerance_time_sec: Time tolerance in seconds
        
    Returns:
        Validation result with score and feedback
    """
    result = {
        'score': 0,
        'totalExpectedPoints': len(expected_points['highs']) + len(expected_points['lows']),
        'feedback': {
            'correct': [],
            'incorrect': []
        }
    }

    # Track which expected points have been matched
    matched_highs = set()
    matched_lows = set()

    # Check each user point against expected points
    for point in user_points:
        matched = False
        
        # Try to match with highs
        for i, expected in enumerate(expected_points['highs']):
            if i in matched_highs:
                continue  # Skip already matched points
                
            price_diff = abs(expected['price'] - point['price']) / expected['price']
            time_diff = abs(expected['time'] - point['time']) / 1000  # Convert to seconds
            
            if price_diff <= tolerance_price_pct and time_diff <= tolerance_time_sec:
                matched_highs.add(i)
                matched = True
                # Award more points for major swing points
                points_value = 2 if expected['significance'] == 'major' else 1
                result['score'] += points_value
                
                result['feedback']['correct'].append({
                    'type': 'high',
                    'significance': expected['significance'],
                    'userPoint': point,
                    'expectedPoint': expected,
                    'message': f"Good job! You correctly identified a {expected['significance']} swing high at price {expected['price']:.2f}."
                })
                break

        # If not matched with highs, try lows
        if not matched:
            for i, expected in enumerate(expected_points['lows']):
                if i in matched_lows:
                    continue  # Skip already matched points
                    
                price_diff = abs(expected['price'] - point['price']) / expected['price']
                time_diff = abs(expected['time'] - point['time']) / 1000  # Convert to seconds
                
                if price_diff <= tolerance_price_pct and time_diff <= tolerance_time_sec:
                    matched_lows.add(i)
                    matched = True
                    # Award more points for major swing points
                    points_value = 2 if expected['significance'] == 'major' else 1
                    result['score'] += points_value
                    
                    result['feedback']['correct'].append({
                        'type': 'low',
                        'significance': expected['significance'],
                        'userPoint': point,
                        'expectedPoint': expected,
                        'message': f"Good job! You correctly identified a {expected['significance']} swing low at price {expected['price']:.2f}."
                    })
                    break

        # If still not matched, it's incorrect
        if not matched:
            result['feedback']['incorrect'].append({
                'userPoint': point,
                'message': f"This point at price {point['price']:.2f} doesn't match any significant swing point."
            })

    # Record any expected points that were missed
    for i, expected in enumerate(expected_points['highs']):
        if i not in matched_highs:
            result['feedback']['incorrect'].append({
                'type': 'missed_high',
                'significance': expected['significance'],
                'expectedPoint': expected,
                'message': f"You missed a {expected['significance']} swing high at price {expected['price']:.2f}."
            })

    for i, expected in enumerate(expected_points['lows']):
        if i not in matched_lows:
            result['feedback']['incorrect'].append({
                'type': 'missed_low',
                'significance': expected['significance'],
                'expectedPoint': expected,
                'message': f"You missed a {expected['significance']} swing low at price {expected['price']:.2f}."
            })

    # Calculate total possible score based on number of expected points
    total_possible = 0
    for point in expected_points['highs'] + expected_points['lows']:
        total_possible += 2 if point['significance'] == 'major' else 1
        
    result['totalPossiblePoints'] = total_possible
    
    # Calculate percentage score
    result['percentage'] = int((result['score'] / total_possible) * 100) if total_possible > 0 else 0

    return result 
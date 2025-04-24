from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import random

from app.database import get_db
from app.api.utils.chart_validation import ChartValidator

router = APIRouter()

# Dummy data for chart exam questions
EXAM_QUESTIONS = {
    "swing_analysis": {
        "swing_points": [
            {
                "symbol": "BTCUSD",
                "chart_id": "swing_points_1",
                "candles": [
                    # Would be filled with actual candle data
                ],
                "instruction": "Identify the major swing points in this chart",
                "correct_points": {
                    "swing_highs": [
                        {"x": 150, "y": 120, "description": "Swing High 1"},
                        {"x": 320, "y": 95, "description": "Swing High 2"} 
                    ],
                    "swing_lows": [
                        {"x": 210, "y": 80, "description": "Swing Low 1"},
                        {"x": 400, "y": 65, "description": "Swing Low 2"}
                    ],
                    "tolerance": 15
                }
            }
        ],
        "equal_levels": [
            {
                "symbol": "ETHUSD",
                "chart_id": "equal_levels_1",
                "candles": [
                    # Would be filled with actual candle data
                ],
                "instruction": "Mark the equal highs and equal lows on this chart",
                "correct_lines": [
                    # Lines connecting equal levels
                    {"x1": 100, "y1": 150, "x2": 350, "y2": 150, "description": "Equal High"},
                    {"x1": 150, "y1": 80, "x2": 420, "y2": 80, "description": "Equal Low"}
                ]
            }
        ]
    },
    "fibonacci_retracement": {
        "impulse_waves": [
            {
                "symbol": "XAUUSD",
                "chart_id": "fibonacci_1",
                "candles": [
                    # Would be filled with actual candle data
                ],
                "instruction": "Identify the impulse wave and draw Fibonacci retracement levels",
                "correct_fibonacci": {
                    "start": {"x": 100, "y": 300},
                    "end": {"x": 400, "y": 150},
                    "levels": [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
                }
            }
        ]
    },
    "gap_analysis": {
        "fair_value_gaps": [
            {
                "symbol": "EURUSD",
                "chart_id": "fvg_1",
                "candles": [
                    # Would be filled with actual candle data
                ],
                "instruction": "Identify the Fair Value Gaps in this chart",
                "correct_boxes": [
                    {"x": 200, "y": 150, "width": 40, "height": 25, "description": "Bullish FVG"},
                    {"x": 350, "y": 180, "width": 35, "height": 30, "description": "Bearish FVG"}
                ]
            }
        ]
    }
}

@router.get("/charting_exams")
async def get_charting_exams():
    """Get all available charting exam types"""
    # Hardcoded exam types for now
    exams = [
        {
            "id": "swing_analysis",
            "title": "Swing Analysis Exam",
            "description": "Learn to identify swing highs and lows, and mark equal price levels.",
            "difficulty": "beginner",
            "sections": ["swing_points", "equal_levels"]
        },
        {
            "id": "fibonacci_retracement",
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
        }
    ]
    return exams

@router.get("/charting_exam/{exam_type}")
async def get_exam_info(exam_type: str):
    """Get information about a specific exam type"""
    # Hardcoded exam info for now
    exam_info = {
        "swing_analysis": {
            "title": "Swing Analysis Exam",
            "description": "Learn to identify important swing points and equal highs/lows.",
            "sections": ["swing_points", "equal_levels"],
            "tools_required": ["line tool", "pointer tool"],
            "instructions": "Practice identifying key swing points and equal price levels."
        },
        "fibonacci_retracement": {
            "title": "Fibonacci Retracement Exam",
            "description": "Practice applying Fibonacci retracement tools.",
            "sections": ["impulse_waves", "retracement_levels"],
            "tools_required": ["fibonacci tool", "line tool"],
            "instructions": "Practice identifying impulse waves and Fibonacci retracement levels."
        },
        "gap_analysis": {
            "title": "Gap Analysis & FVG Exam",
            "description": "Learn to identify different types of gaps and fair value gaps.",
            "sections": ["price_gaps", "fair_value_gaps"],
            "tools_required": ["box tool", "line tool"],
            "instructions": "Practice identifying price gaps and fair value gaps."
        }
    }
    
    if exam_type not in exam_info:
        raise HTTPException(status_code=404, detail=f"Exam type '{exam_type}' not found")
        
    return exam_info[exam_type]

@router.get("/charting_exam/{exam_type}/practice")
async def get_practice_chart(exam_type: str, section: str, chart_num: int = 1):
    """Get a chart for practice in a specific exam section"""
    # Check if exam type exists
    if exam_type not in EXAM_QUESTIONS:
        raise HTTPException(status_code=404, detail=f"Exam type '{exam_type}' not found")
    
    # Get available sections for this exam type
    available_sections = list(EXAM_QUESTIONS[exam_type].keys())
    
    if not available_sections:
        raise HTTPException(status_code=404, detail=f"No sections available for exam type '{exam_type}'")
    
    # If requested section doesn't exist, fall back to the first available section
    if section not in available_sections:
        section = available_sections[0]
        print(f"Falling back to section '{section}' for exam type '{exam_type}'")
    
    # Get question data for the section
    questions = EXAM_QUESTIONS[exam_type][section]
    
    # Ensure chart_num is in valid range
    if chart_num < 1 or chart_num > len(questions):
        # If out of range, return a random question from the available ones
        question = random.choice(questions)
    else:
        # Adjust for 0-based indexing
        question = questions[(chart_num - 1) % len(questions)]
    
    # Build response
    response = {
        "symbol": question.get("symbol", "BTCUSD"),
        "chart_data": question.get("candles", []),  # This would be actual candle data
        "section": section,
        "instructions": question.get("instruction", f"Identify the {section.replace('_', ' ')} in this chart."),
        "progress": {
            "chart_count": chart_num,
            "total_charts": 5
        }
    }
    
    # Add mock candle data if the real data is empty
    if not response["chart_data"]:
        # Generate some random candles for testing
        base_price = 100 + random.randint(-20, 20)
        response["chart_data"] = generate_random_candles(50, base_price)
    
    return response

@router.post("/charting_exam/{exam_type}/validate")
async def validate_answers(exam_type: str, request: Request):
    """Validate the user's answers for a chart"""
    data = await request.json()
    
    drawing_data = data.get("drawingData", [])
    section = data.get("section", "")
    chart_number = data.get("chartNumber", 1)
    
    # Get the correct answer data
    validation_result = validate_chart_drawings(exam_type, section, chart_number, drawing_data)
    
    # Return validation result with score and feedback
    return validation_result

def validate_chart_drawings(exam_type: str, section: str, chart_number: int, drawing_data: List[Dict]) -> Dict[str, Any]:
    """
    Validate user drawing data against expected answers
    
    Args:
        exam_type: Type of exam (swing_analysis, fibonacci_retracement, etc.)
        section: Section of the exam
        chart_number: Chart number being validated
        drawing_data: User's drawing data
        
    Returns:
        Validation result with score and feedback
    """
    # Default response
    result = {
        "score": 0,
        "feedback": "No validation criteria available for this chart.",
        "correct_points": [],
        "missed_points": [],
        "false_positives": []
    }
    
    # Check if we have data for this exam type and section
    if exam_type not in EXAM_QUESTIONS or section not in EXAM_QUESTIONS.get(exam_type, {}):
        return result
    
    # Get questions for this section
    questions = EXAM_QUESTIONS[exam_type][section]
    
    # Ensure chart_number is in valid range
    if chart_number < 1 or chart_number > len(questions):
        # Use first question as fallback
        question = questions[0]
    else:
        # Adjust for 0-based indexing
        question = questions[(chart_number - 1) % len(questions)]
    
    # Separate drawings by type
    points = [d for d in drawing_data if d.get("type") == "point"]
    lines = [d for d in drawing_data if d.get("type") == "line"]
    boxes = [d for d in drawing_data if d.get("type") == "box"]
    fibs = [d for d in drawing_data if d.get("type") == "fibonacci"]
    
    score = 0
    feedback_messages = []
    
    # Swing Analysis validation
    if exam_type == "swing_analysis":
        if section == "swing_points" and "correct_points" in question:
            # Validate swing points
            expected_highs = question["correct_points"].get("swing_highs", [])
            expected_lows = question["correct_points"].get("swing_lows", [])
            tolerance = question["correct_points"].get("tolerance", 15)
            
            # Validate swing highs
            high_results = ChartValidator.validate_points(points, expected_highs, tolerance)
            
            # Add points for each correct match
            score += len(high_results["matches"]) * 10
            
            # Add feedback
            for _, expected in high_results["matches"]:
                feedback_messages.append(f"Correct swing high identified at {expected.get('description', 'unknown position')}")
            
            for expected in high_results["misses"]:
                feedback_messages.append(f"Missed swing high at {expected.get('description', 'unknown position')}")
            
            # Validate swing lows
            low_results = ChartValidator.validate_points(points, expected_lows, tolerance)
            
            # Add points for each correct match
            score += len(low_results["matches"]) * 10
            
            # Add feedback
            for _, expected in low_results["matches"]:
                feedback_messages.append(f"Correct swing low identified at {expected.get('description', 'unknown position')}")
            
            for expected in low_results["misses"]:
                feedback_messages.append(f"Missed swing low at {expected.get('description', 'unknown position')}")
            
        elif section == "equal_levels" and "correct_lines" in question:
            # Validate equal levels (lines)
            expected_lines = question["correct_lines"]
            
            # Validate lines
            line_results = ChartValidator.validate_lines(lines, expected_lines)
            
            # Add points for each correct match
            score += len(line_results["matches"]) * 15
            
            # Add feedback
            for _, expected in line_results["matches"]:
                feedback_messages.append(f"Correct equal level identified: {expected.get('description', 'unknown level')}")
            
            for expected in line_results["misses"]:
                feedback_messages.append(f"Missed equal level: {expected.get('description', 'unknown level')}")
    
    # Fibonacci retracement validation
    elif exam_type == "fibonacci_retracement" and "correct_fibonacci" in question:
        expected_fib = question["correct_fibonacci"]
        
        # For simplicity, we'll just check if the main trend line is drawn correctly
        # A more complete implementation would check all Fibonacci levels
        expected_fib_line = {
            "x1": expected_fib["start"]["x"],
            "y1": expected_fib["start"]["y"],
            "x2": expected_fib["end"]["x"],
            "y2": expected_fib["end"]["y"],
            "description": "Main impulse wave"
        }
        
        # Validate main trend line
        if lines:  # Use line drawings for simple validation
            line_results = ChartValidator.validate_lines([lines[0]], [expected_fib_line])
            if line_results["matches"]:
                score += 30
                feedback_messages.append("Correct impulse wave identified")
            else:
                feedback_messages.append("Missed the main impulse wave")
        elif fibs:  # Use fibonacci drawings if available
            # For a proper implementation, we would validate fibonacci levels here
            score += 20  # Partial credit
            feedback_messages.append("Fibonacci retracement applied but levels may not be optimal")
    
    # Gap analysis validation
    elif exam_type == "gap_analysis" and "correct_boxes" in question:
        expected_boxes = question["correct_boxes"]
        
        # Validate boxes
        box_results = ChartValidator.validate_boxes(boxes, expected_boxes)
        
        # Add points for each correct match
        score += len(box_results["matches"]) * 20
        
        # Add feedback
        for _, expected in box_results["matches"]:
            feedback_messages.append(f"Correctly identified: {expected.get('description', 'Fair Value Gap')}")
        
        for expected in box_results["misses"]:
            feedback_messages.append(f"Missed: {expected.get('description', 'Fair Value Gap')}")
    
    # Cap the score at 100
    score = min(100, score)
    
    # Generate result
    result = {
        "score": score,
        "feedback": "\n".join(feedback_messages) if feedback_messages else "No specific feedback available.",
        "passed": score >= 70,  # 70% is passing score
        "breakdown": {
            "correct_identifications": score // 10,  # Simplified breakdown
            "missed_identifications": (100 - score) // 10
        }
    }
    
    return result

def generate_random_candles(count: int, base_price: float = 100.0) -> List[Dict[str, Any]]:
    """Generate random candle data for testing"""
    candles = []
    current_price = base_price
    
    for i in range(count):
        # Random price movement
        price_change = random.uniform(-5, 5)
        open_price = current_price
        close_price = open_price + price_change
        high_price = max(open_price, close_price) + random.uniform(0, 2)
        low_price = min(open_price, close_price) - random.uniform(0, 2)
        
        # Random volume
        volume = random.randint(100, 1000)
        
        # Create candle
        candle = {
            "time": 1609459200 + i * 3600,  # Starting from 2021-01-01, hourly candles
            "open": round(open_price, 2),
            "high": round(high_price, 2),
            "low": round(low_price, 2),
            "close": round(close_price, 2),
            "volume": volume
        }
        
        candles.append(candle)
        current_price = close_price
    
    return candles

@router.get("/charting_exam/next_chart")
async def get_next_chart(exam_type: str, section: str, chart_count: int = 1):
    """Get the next chart in a sequence"""
    
    # Make sure chart_count is within range 1-5
    chart_count = max(1, min(5, chart_count))
    
    # Check if exam type exists
    if exam_type not in EXAM_QUESTIONS:
        raise HTTPException(status_code=404, detail=f"Exam type '{exam_type}' not found")
    
    # Get available sections for this exam type
    available_sections = list(EXAM_QUESTIONS[exam_type].keys())
    
    if not available_sections:
        raise HTTPException(status_code=404, detail=f"No sections available for exam type '{exam_type}'")
    
    # If requested section doesn't exist, fall back to the first available section
    if section not in available_sections:
        section = available_sections[0]
        print(f"Falling back to section '{section}' for exam type '{exam_type}'")
    
    # Generate random chart data for the next chart
    symbols = ["BTCUSD", "ETHUSD", "BNBUSD", "SOLUSD", "XRPUSD", "LTCUSD", "LINKUSD"]
    intervals = ["5m", "4h", "1d", "1w"]
    selected_interval = random.choice(intervals)
    candle_limits = {'5m': 200, '4h': 100, '1d': 75, '1w': 50}
    limit = candle_limits[selected_interval]
    
    # Generate random candles
    time_increment = {'5m': 300, '4h': 14400, '1d': 86400, '1w': 604800}[selected_interval]
    chart_data = [
        {'time': 1677657600 + i * time_increment, 'open': 50000 + i * 10, 
         'high': 51000 + i * 10 + random.randint(0, 500), 
         'low': 49500 + i * 10 - random.randint(0, 500), 
         'close': 50500 + i * 10 + random.randint(-200, 200), 
         'symbol': random.choice(symbols)}
        for i in range(limit)
    ]
    
    return {
        "chart_data": chart_data,
        "chart_count": chart_count,
        "symbol": random.choice(symbols),
        "interval": selected_interval,
        "section": section,
        "progress": {
            "chart_count": chart_count,
            "total_charts": 5
        },
        "instructions": f"Identify the {section.replace('_', ' ')} in this chart."
    } 
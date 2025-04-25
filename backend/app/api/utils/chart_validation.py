from typing import List, Dict, Any, Tuple, Optional
import math


class ChartValidator:
    """
    Utility class to validate different types of chart drawings against expected values.
    """
    
    @staticmethod
    def validate_points(user_points: List[Dict], expected_points: List[Dict], tolerance: float = 15) -> Dict[str, Any]:
        """
        Validate user-drawn points against expected points with a given tolerance.
        
        Args:
            user_points: List of points drawn by the user
            expected_points: List of expected/correct points
            tolerance: Pixel distance tolerance for a match
            
        Returns:
            Dictionary with matches, misses, and false positives
        """
        matches = []
        remaining_user_points = list(user_points)
        
        # Find matches
        for expected_point in expected_points:
            expected_x = expected_point.get("x", 0)
            expected_y = expected_point.get("y", 0)
            
            closest_point = None
            closest_distance = float('inf')
            
            # Find the closest user point to this expected point
            for user_point in remaining_user_points:
                user_x = user_point.get("x", 0)
                user_y = user_point.get("y", 0)
                
                distance = math.sqrt((user_x - expected_x)**2 + (user_y - expected_y)**2)
                if distance < closest_distance:
                    closest_distance = distance
                    closest_point = user_point
            
            # Check if the closest point is within tolerance
            if closest_point and closest_distance <= tolerance:
                matches.append((closest_point, expected_point))
                remaining_user_points.remove(closest_point)
        
        # Misses are expected points without a matching user point
        misses = [point for point in expected_points if not any(point == expected for _, expected in matches)]
        
        # False positives are remaining user points that didn't match any expected point
        false_positives = remaining_user_points
        
        return {
            "matches": matches,
            "misses": misses,
            "false_positives": false_positives
        }
    
    @staticmethod
    def validate_lines(user_lines: List[Dict], expected_lines: List[Dict], angle_tolerance: float = 15, distance_tolerance: float = 20) -> Dict[str, Any]:
        """
        Validate user-drawn lines against expected lines with given tolerances.
        
        Args:
            user_lines: List of lines drawn by the user
            expected_lines: List of expected/correct lines
            angle_tolerance: Angle difference tolerance in degrees
            distance_tolerance: Distance tolerance for line endpoints
            
        Returns:
            Dictionary with matches, misses, and false positives
        """
        matches = []
        remaining_user_lines = list(user_lines)
        
        # Find matches
        for expected_line in expected_lines:
            expected_x1 = expected_line.get("x1", 0)
            expected_y1 = expected_line.get("y1", 0)
            expected_x2 = expected_line.get("x2", 0)
            expected_y2 = expected_line.get("y2", 0)
            
            expected_angle = math.degrees(math.atan2(expected_y2 - expected_y1, expected_x2 - expected_x1))
            expected_length = math.sqrt((expected_x2 - expected_x1)**2 + (expected_y2 - expected_y1)**2)
            
            closest_line = None
            closest_score = float('inf')  # Lower is better
            
            # Find the best matching user line
            for user_line in remaining_user_lines:
                user_x1 = user_line.get("x1", 0)
                user_y1 = user_line.get("y1", 0)
                user_x2 = user_line.get("x2", 0)
                user_y2 = user_line.get("y2", 0)
                
                user_angle = math.degrees(math.atan2(user_y2 - user_y1, user_x2 - user_x1))
                user_length = math.sqrt((user_x2 - user_x1)**2 + (user_y2 - user_y1)**2)
                
                # Calculate distance from user line endpoints to expected line
                dist1 = min(
                    math.sqrt((user_x1 - expected_x1)**2 + (user_y1 - expected_y1)**2),
                    math.sqrt((user_x1 - expected_x2)**2 + (user_y1 - expected_y2)**2)
                )
                dist2 = min(
                    math.sqrt((user_x2 - expected_x1)**2 + (user_y2 - expected_y1)**2),
                    math.sqrt((user_x2 - expected_x2)**2 + (user_y2 - expected_y2)**2)
                )
                
                # Calculate angle difference (normalized to 0-180)
                angle_diff = abs((user_angle - expected_angle + 180) % 360 - 180)
                
                # Calculate length difference as percentage
                length_diff = abs(user_length - expected_length) / max(expected_length, 1) * 100
                
                # Weighted score (lower is better)
                score = angle_diff * 2 + (dist1 + dist2) / 2 + length_diff / 2
                
                if score < closest_score:
                    closest_score = score
                    closest_line = user_line
            
            # Check if the closest line is within tolerances
            if closest_line and closest_score < angle_tolerance + distance_tolerance:
                matches.append((closest_line, expected_line))
                remaining_user_lines.remove(closest_line)
        
        # Misses are expected lines without a matching user line
        misses = [line for line in expected_lines if not any(line == expected for _, expected in matches)]
        
        # False positives are remaining user lines that didn't match any expected line
        false_positives = remaining_user_lines
        
        return {
            "matches": matches,
            "misses": misses,
            "false_positives": false_positives
        }
    
    @staticmethod
    def validate_boxes(user_boxes: List[Dict], expected_boxes: List[Dict], overlap_threshold: float = 0.5) -> Dict[str, Any]:
        """
        Validate user-drawn boxes against expected boxes with a given overlap threshold.
        
        Args:
            user_boxes: List of boxes drawn by the user
            expected_boxes: List of expected/correct boxes
            overlap_threshold: Minimum overlap ratio required for a match (0-1)
            
        Returns:
            Dictionary with matches, misses, and false positives
        """
        matches = []
        remaining_user_boxes = list(user_boxes)
        
        # Find matches
        for expected_box in expected_boxes:
            expected_x = expected_box.get("x", 0)
            expected_y = expected_box.get("y", 0)
            expected_width = expected_box.get("width", 0)
            expected_height = expected_box.get("height", 0)
            
            best_box = None
            best_overlap_ratio = 0
            
            # Find the best matching user box
            for user_box in remaining_user_boxes:
                user_x = user_box.get("x", 0)
                user_y = user_box.get("y", 0)
                user_width = user_box.get("width", 0)
                user_height = user_box.get("height", 0)
                
                # Calculate overlap area
                overlap_x1 = max(user_x, expected_x)
                overlap_y1 = max(user_y, expected_y)
                overlap_x2 = min(user_x + user_width, expected_x + expected_width)
                overlap_y2 = min(user_y + user_height, expected_y + expected_height)
                
                if overlap_x1 < overlap_x2 and overlap_y1 < overlap_y2:
                    overlap_area = (overlap_x2 - overlap_x1) * (overlap_y2 - overlap_y1)
                    expected_area = expected_width * expected_height
                    user_area = user_width * user_height
                    
                    # Calculate overlap ratio (relative to the smaller box)
                    overlap_ratio = overlap_area / min(expected_area, user_area)
                    
                    if overlap_ratio > best_overlap_ratio:
                        best_overlap_ratio = overlap_ratio
                        best_box = user_box
            
            # Check if the best box has sufficient overlap
            if best_box and best_overlap_ratio >= overlap_threshold:
                matches.append((best_box, expected_box))
                remaining_user_boxes.remove(best_box)
        
        # Misses are expected boxes without a matching user box
        misses = [box for box in expected_boxes if not any(box == expected for _, expected in matches)]
        
        # False positives are remaining user boxes that didn't match any expected box
        false_positives = remaining_user_boxes
        
        return {
            "matches": matches,
            "misses": misses,
            "false_positives": false_positives
        }
    
    @staticmethod
    def validate_fibonacci(user_fibs: List[Dict], expected_fib: Dict, tolerance: float = 0.2) -> Dict[str, Any]:
        """
        Validate user-drawn Fibonacci retracements against expected values.
        
        Args:
            user_fibs: List of Fibonacci retracements drawn by the user
            expected_fib: Expected/correct Fibonacci retracement
            tolerance: Tolerance for deviation in placement
            
        Returns:
            Dictionary with matches and false positives
        """
        matches = []
        
        expected_start_x = expected_fib.get("start", {}).get("x", 0)
        expected_start_y = expected_fib.get("start", {}).get("y", 0)
        expected_end_x = expected_fib.get("end", {}).get("x", 0)
        expected_end_y = expected_fib.get("end", {}).get("y", 0)
        
        expected_levels = expected_fib.get("levels", [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1])
        
        # Find the best matching user Fibonacci retracement
        for user_fib in user_fibs:
            user_start_x = user_fib.get("start", {}).get("x", 0)
            user_start_y = user_fib.get("start", {}).get("y", 0)
            user_end_x = user_fib.get("end", {}).get("x", 0)
            user_end_y = user_fib.get("end", {}).get("y", 0)
            
            user_levels = user_fib.get("levels", [])
            
            # Calculate distances between endpoints
            start_distance = math.sqrt((user_start_x - expected_start_x)**2 + (user_start_y - expected_start_y)**2)
            end_distance = math.sqrt((user_end_x - expected_end_x)**2 + (user_end_y - expected_end_y)**2)
            
            # Calculate expected distance
            expected_distance = math.sqrt((expected_end_x - expected_start_x)**2 + (expected_end_y - expected_start_y)**2)
            
            # Check if the user's Fibonacci retracement is sufficiently close to the expected one
            if (start_distance + end_distance) / 2 <= expected_distance * tolerance:
                matches.append((user_fib, expected_fib))
        
        return {
            "matches": matches,
            "misses": [] if matches else [expected_fib],
            "false_positives": [fib for fib in user_fibs if not any(fib == user for user, _ in matches)]
        }
    
    @staticmethod
    def validate_trend_line(user_fibs: List[Dict], expected_fib: Dict) -> int:
        """
        Validate the trend line of user-drawn Fibonacci retracements and return a score.
        
        Args:
            user_fibs: List of Fibonacci retracements drawn by the user
            expected_fib: Expected/correct Fibonacci retracement
            
        Returns:
            Score based on trend line accuracy (0-30)
        """
        expected_start_x = expected_fib.get("start", {}).get("x", 0)
        expected_start_y = expected_fib.get("start", {}).get("y", 0)
        expected_end_x = expected_fib.get("end", {}).get("x", 0)
        expected_end_y = expected_fib.get("end", {}).get("y", 0)
        
        expected_angle = math.degrees(math.atan2(expected_end_y - expected_start_y, expected_end_x - expected_start_x))
        expected_length = math.sqrt((expected_end_x - expected_start_x)**2 + (expected_end_y - expected_start_y)**2)
        
        best_score = 0
        
        for user_fib in user_fibs:
            user_start_x = user_fib.get("start", {}).get("x", 0)
            user_start_y = user_fib.get("start", {}).get("y", 0)
            user_end_x = user_fib.get("end", {}).get("x", 0)
            user_end_y = user_fib.get("end", {}).get("y", 0)
            
            user_angle = math.degrees(math.atan2(user_end_y - user_start_y, user_end_x - user_start_x))
            user_length = math.sqrt((user_end_x - user_start_x)**2 + (user_end_y - user_start_y)**2)
            
            # Angle difference (normalized to 0-180)
            angle_diff = abs((user_angle - expected_angle + 180) % 360 - 180)
            
            # Length difference as percentage
            length_diff = abs(user_length - expected_length) / max(expected_length, 1) * 100
            
            # Calculate placement score (0-30), higher is better
            angle_score = max(0, 15 - angle_diff / 3)  # Up to 15 points for angle
            length_score = max(0, 15 - length_diff / 10)  # Up to 15 points for length
            
            score = int(angle_score + length_score)
            if score > best_score:
                best_score = score
        
        return best_score
    
    @staticmethod
    def validate_fib_levels(user_fibs: List[Dict[str, Any]], expected_fibs: List[Dict[str, Any]], 
                           price_tolerance_percent=0.5) -> Dict[str, Any]:
        """
        Validate user-drawn Fibonacci levels against expected levels
        
        Args:
            user_fibs: List of Fibonacci levels drawn by user
            expected_fibs: List of expected correct Fibonacci levels
            price_tolerance_percent: Tolerance as percentage of price range
            
        Returns:
            Dictionary with matches, misses, and incorrect levels
        """
        # Basic implementation
        matches = []
        misses = list(expected_fibs)
        incorrect = []
        
        for user_fib in user_fibs:
            matched = False
            for i, expected in enumerate(misses):
                # Basic matching logic - check if the main trend line matches
                if (ChartValidator.line_angle_diff(user_fib, expected) <= 15 and
                    ChartValidator.line_position_diff(user_fib, expected) <= 20):
                    matches.append((user_fib, expected))
                    misses.pop(i)
                    matched = True
                    break
            
            if not matched:
                incorrect.append(user_fib)
                
        return {
            'matches': matches,
            'misses': misses,
            'incorrect': incorrect
        }
    
    @staticmethod
    def point_distance(p1: Dict[str, Any], p2: Dict[str, Any]) -> float:
        """Calculate Euclidean distance between two points"""
        return math.sqrt((p1.get('x', 0) - p2.get('x', 0))**2 + 
                         (p1.get('y', 0) - p2.get('y', 0))**2)
    
    @staticmethod
    def line_angle(line: Dict[str, Any]) -> float:
        """Calculate angle of a line in degrees"""
        dx = line.get('x2', 0) - line.get('x1', 0)
        dy = line.get('y2', 0) - line.get('y1', 0)
        return math.degrees(math.atan2(dy, dx))
    
    @staticmethod
    def line_angle_diff(line1: Dict[str, Any], line2: Dict[str, Any]) -> float:
        """Calculate angle difference between two lines in degrees"""
        angle1 = ChartValidator.line_angle(line1)
        angle2 = ChartValidator.line_angle(line2)
        
        diff = abs(angle1 - angle2) % 180
        return min(diff, 180 - diff)
    
    @staticmethod
    def line_midpoint(line: Dict[str, Any]) -> Dict[str, float]:
        """Calculate midpoint of a line"""
        return {
            'x': (line.get('x1', 0) + line.get('x2', 0)) / 2,
            'y': (line.get('y1', 0) + line.get('y2', 0)) / 2
        }
    
    @staticmethod
    def line_position_diff(line1: Dict[str, Any], line2: Dict[str, Any]) -> float:
        """Calculate position difference between two lines using midpoints"""
        mid1 = ChartValidator.line_midpoint(line1)
        mid2 = ChartValidator.line_midpoint(line2)
        return ChartValidator.point_distance(mid1, mid2)
    
    @staticmethod
    def box_overlap(box1: Dict[str, Any], box2: Dict[str, Any]) -> float:
        """Calculate overlap area proportion between two boxes"""
        # Get coordinates
        x1_1, y1_1 = box1.get('x', 0), box1.get('y', 0)
        x2_1, y2_1 = x1_1 + box1.get('width', 0), y1_1 + box1.get('height', 0)
        
        x1_2, y1_2 = box2.get('x', 0), box2.get('y', 0)
        x2_2, y2_2 = x1_2 + box2.get('width', 0), y1_2 + box2.get('height', 0)
        
        # Calculate overlap dimensions
        overlap_width = max(0, min(x2_1, x2_2) - max(x1_1, x1_2))
        overlap_height = max(0, min(y2_1, y2_2) - max(y1_1, y1_2))
        overlap_area = overlap_width * overlap_height
        
        # Calculate original areas
        area1 = box1.get('width', 0) * box1.get('height', 0)
        area2 = box2.get('width', 0) * box2.get('height', 0)
        
        # Avoid division by zero
        if min(area1, area2) == 0:
            return 0
            
        # Return proportion of smaller box that is overlapped
        return overlap_area / min(area1, area2) 
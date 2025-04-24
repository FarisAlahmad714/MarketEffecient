import math
from typing import List, Dict, Any, Tuple, Optional


class ChartValidator:
    """Helper class for validating chart drawings"""
    
    @staticmethod
    def validate_points(user_points: List[Dict[str, Any]], expected_points: List[Dict[str, Any]], tolerance=15) -> Dict[str, Any]:
        """
        Validate user-drawn points against expected points
        
        Args:
            user_points: List of points drawn by user
            expected_points: List of expected correct points
            tolerance: Pixel distance tolerance
            
        Returns:
            Dictionary with matches, misses, and incorrect points
        """
        matches = []
        misses = list(expected_points)  # Copy to modify
        incorrect = []
        
        for user_point in user_points:
            matched = False
            for i, expected in enumerate(misses):
                if ChartValidator.point_distance(user_point, expected) <= tolerance:
                    matches.append((user_point, expected))
                    misses.pop(i)
                    matched = True
                    break
            
            if not matched:
                incorrect.append(user_point)
        
        return {
            'matches': matches,
            'misses': misses,
            'incorrect': incorrect
        }
    
    @staticmethod
    def validate_lines(user_lines: List[Dict[str, Any]], expected_lines: List[Dict[str, Any]], 
                       angle_tolerance=10, position_tolerance=15) -> Dict[str, Any]:
        """
        Validate user-drawn lines against expected lines
        
        Args:
            user_lines: List of lines drawn by user
            expected_lines: List of expected correct lines
            angle_tolerance: Degrees of angle tolerance
            position_tolerance: Pixel distance tolerance for position
            
        Returns:
            Dictionary with matches, misses, and incorrect lines
        """
        matches = []
        misses = list(expected_lines)  # Copy to modify
        incorrect = []
        
        for user_line in user_lines:
            matched = False
            for i, expected in enumerate(misses):
                if (ChartValidator.line_angle_diff(user_line, expected) <= angle_tolerance and
                    ChartValidator.line_position_diff(user_line, expected) <= position_tolerance):
                    matches.append((user_line, expected))
                    misses.pop(i)
                    matched = True
                    break
            
            if not matched:
                incorrect.append(user_line)
        
        return {
            'matches': matches,
            'misses': misses,
            'incorrect': incorrect
        }
    
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
    def validate_boxes(user_boxes: List[Dict[str, Any]], expected_boxes: List[Dict[str, Any]], 
                       area_overlap_threshold=0.6) -> Dict[str, Any]:
        """
        Validate user-drawn boxes against expected boxes
        
        Args:
            user_boxes: List of boxes drawn by user
            expected_boxes: List of expected correct boxes
            area_overlap_threshold: Required overlap as percentage of box area
            
        Returns:
            Dictionary with matches, misses, and incorrect boxes
        """
        matches = []
        misses = list(expected_boxes)
        incorrect = []
        
        for user_box in user_boxes:
            matched = False
            for i, expected in enumerate(misses):
                # Calculate overlap percentage
                overlap = ChartValidator.box_overlap(user_box, expected)
                if overlap >= area_overlap_threshold:
                    matches.append((user_box, expected))
                    misses.pop(i)
                    matched = True
                    break
            
            if not matched:
                incorrect.append(user_box)
        
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
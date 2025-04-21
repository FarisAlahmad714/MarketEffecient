#!/usr/bin/env python

"""
Migration script to run alembic upgrades
Usage: python migrate.py
"""

import os
import sys
import subprocess

def run_migrations():
    """Run alembic migrations"""
    try:
        # Run the migration
        result = subprocess.run(['alembic', 'upgrade', 'head'], capture_output=True, text=True)
        
        # Print the output
        print(result.stdout)
        
        if result.returncode != 0:
            print(f"Error running migrations: {result.stderr}", file=sys.stderr)
            return False
        
        print("Migrations completed successfully!")
        return True
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    run_migrations() 
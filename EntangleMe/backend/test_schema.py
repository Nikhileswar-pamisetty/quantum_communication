from sqlalchemy import create_engine, inspect
import sys
import os

# Add parent directory to path to import app
sys.path.append(os.getcwd())

from app.database.session import engine

def check_group_members_schema():
    inspector = inspect(engine)
    columns = inspector.get_columns('group_members')
    column_names = [c['name'] for c in columns]
    print(f"Columns in group_members: {column_names}")
    if 'role' in column_names:
        print("Role column exists! Verification successful.")
    else:
        print("Role column MISSING. Need to add it manually.")

if __name__ == "__main__":
    check_group_members_schema()

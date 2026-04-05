import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "entangleme.db")

def migrate():
    print(f"Connecting to database at {db_path}...")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Cleaning up users table for fresh start...")
    try:
        # Drop and recreate users table to ensure no stale/corrupt data
        cursor.execute("DROP TABLE IF EXISTS users")
        
        # We'll use the model to recreate it generally, but let's do it manually here 
        # to ensure the fields match what we expect.
        cursor.execute("""
            CREATE TABLE users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE,
                password_hash TEXT,
                role TEXT DEFAULT 'participant',
                is_online BOOLEAN DEFAULT 0,
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Users table recreated successfully.")
    except Exception as e:
        print(f"❌ Error during migration: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()

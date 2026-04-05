from sqlalchemy import text
from app.database.session import engine
from app.models.database import Group, GroupMember
from sqlalchemy.orm import Session

def migrate():
    with engine.connect() as conn:
        print("Adding role column to group_members...")
        try:
            conn.execute(text("ALTER TABLE group_members ADD COLUMN role VARCHAR DEFAULT 'participant'"))
            conn.commit()
            print("Column added successfully.")
        except Exception as e:
            print(f"Error adding column (it might already exist): {e}")

    # Now assign admin role to creators
    db = Session(engine)
    try:
        groups = db.query(Group).all()
        for g in groups:
            admin_member = db.query(GroupMember).filter_by(group_id=g.id, user_id=g.created_by).first()
            if admin_member:
                admin_member.role = "admin"
                print(f"Set user {g.created_by} as admin of group {g.name}")
        db.commit()
        print("Migration complete.")
    except Exception as e:
        print(f"Error updating roles: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()

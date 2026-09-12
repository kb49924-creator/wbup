from src.database import db

# Update setting in DB
db.set_setting("products_per_category", "50")
print("Setting updated to 50")

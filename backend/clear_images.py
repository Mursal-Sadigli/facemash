import certifi
from pymongo import MongoClient

# MongoDB-ə qoşul
client = MongoClient('mongodb+srv://fullmursel2025_db_user:jjD65NDc14JIlBDg@cluster0.524owwq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', tlsCAFile=certifi.where())
db = client['facemash']
images_collection = db['images']

# Bütün şəkilləri sil
result = images_collection.delete_many({})
print(f"✓ {result.deleted_count} şəkil silindi.")

client.close()

import time
import requests
import certifi
from pymongo import MongoClient

client = MongoClient('mongodb+srv://fullmursel2025_db_user:jjD65NDc14JIlBDg@cluster0.524owwq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', tlsCAFile=certifi.where())
db = client['facemash']
images_collection = db['images']

SEARCH_QUERIES = {
    'dizayn': 'website ui design',
    'maşın': 'sports car',
    'qız': 'beautiful young woman'
}

def fetch_and_save_images():
    for az_cat, eng_cat in SEARCH_QUERIES.items():
        count = images_collection.count_documents({'category': az_cat})
        if count < 500:
            page = (count // 30) + 1
            url = f"https://unsplash.com/napi/search/photos?query={eng_cat}&per_page=30&page={page}"
            try:
                print(f"[{az_cat}] Səhifə {page} API-dən çəkilir...")
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    results = data.get('results', [])
                    added = 0
                    for img in results:
                        image_url = img['urls']['regular']
                        image_id = img['id']
                        name = f"{az_cat.capitalize()} {image_id}"
                        
                        if not images_collection.find_one({'name': name}):
                            images_collection.insert_one({
                                'name': name,
                                'url': image_url,
                                'rating': 1200,
                                'category': az_cat,
                                'votes': 0
                            })
                            added += 1
                    print(f"[{az_cat}] {added} yeni şəkil əlavə edildi. (Ümumi say: {count + added})")
                else:
                    print(f"[{az_cat}] API xətası. Status kodu: {response.status_code}")
            except Exception as e:
                print(f"[{az_cat}] Xəta baş verdi: {e}")

if __name__ == "__main__":
    print("Unsplash Scraper işə salındı... Şəkillər azaldıqca avtomatik yeniləri çəkiləcək.")
    while True:
        fetch_and_save_images()
        time.sleep(60)

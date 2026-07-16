import time
import requests
import psycopg2

DATABASE_URL = 'postgresql://neondb_owner:npg_A2Z0GcrbiTUk@ep-plain-bonus-asojuitt-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require'
UNSPLASH_ACCESS_KEY = 'rFd_eax5gEukaxliFYruF1IJgulnsdUC4rARkOW22hg'

SEARCH_QUERIES = {
    'dizayn': 'website ui design',
    'maşın': 'sports car',
    'qız': 'beautiful young woman'
}

def get_connection():
    return psycopg2.connect(DATABASE_URL)

def fetch_and_save_images():
    conn = get_connection()
    cur = conn.cursor()
    
    for az_cat, eng_cat in SEARCH_QUERIES.items():
        cur.execute("SELECT COUNT(*) FROM images WHERE category = %s", (az_cat,))
        count = cur.fetchone()[0]
        
        if count < 500:
            page = (count // 30) + 1
            url = f"https://api.unsplash.com/search/photos?query={eng_cat}&per_page=30&page={page}&client_id={UNSPLASH_ACCESS_KEY}"
            try:
                print(f"[{az_cat}] Səhifə {page} API-dən çəkilir...")
                response = requests.get(url, timeout=15)
                if response.status_code == 200:
                    data = response.json()
                    results = data.get('results', [])
                    added = 0
                    for img in results:
                        image_url = img['urls']['regular']
                        image_id = img['id']
                        name = f"{az_cat.capitalize()} {image_id}"
                        
                        # UPSERT: varsa keç, yoxdursa əlavə et
                        cur.execute("""
                            INSERT INTO images (name, url, rating, category, votes)
                            VALUES (%s, %s, 1200, %s, 0)
                            ON CONFLICT (name) DO NOTHING
                        """, (name, image_url, az_cat))
                        if cur.rowcount > 0:
                            added += 1
                    
                    conn.commit()
                    print(f"[{az_cat}] {added} yeni şəkil əlavə edildi. (Ümumi say: {count + added})")
                else:
                    print(f"[{az_cat}] API xətası. Status kodu: {response.status_code}")
            except Exception as e:
                conn.rollback()
                print(f"[{az_cat}] Xəta baş verdi: {e}")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    print("Unsplash Scraper işə salındı... Şəkillər azaldıqca avtomatik yeniləri çəkiləcək.")
    while True:
        fetch_and_save_images()
        time.sleep(60)

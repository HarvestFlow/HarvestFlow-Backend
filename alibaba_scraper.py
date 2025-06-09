from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.action_chains import ActionChains
import csv
import time
import random
from selenium.common.exceptions import NoSuchElementException, TimeoutException, WebDriverException

# Configuration du navigateur Selenium avec Chrome
def setup_driver(headless=False):  # Désactivé headless pour le débogage
    chrome_options = Options()
    if headless:
        chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-webgl")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    driver.set_window_size(1920, 1080)
    return driver

# Simuler des mouvements de souris aléatoires
def simulate_human_behavior(driver):
    try:
        actions = ActionChains(driver)
        actions.move_by_offset(random.randint(50, 200), random.randint(50, 200)).perform()
        time.sleep(random.uniform(0.5, 2))
    except Exception as e:
        print(f"Erreur lors de la simulation du comportement humain : {e}")

# Faire défiler la page pour charger le contenu dynamique
def scroll_page(driver, wait):
    try:
        last_height = driver.execute_script("return document.body.scrollHeight")
        while True:
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(random.uniform(3, 5))  # Délai augmenté
            # Attendre que les produits soient chargés
            wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, ".search-card, .m-gallery-product-item-v2")))
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height
        print("Défilement de la page terminé.")
    except Exception as e:
        print(f"Erreur lors du défilement : {e}")

# Scraper les données des produits d'une page
def scrape_page(driver, writer, wait, page_number):
    seen_offers = set()  # Ensemble pour suivre les offres déjà vues
    try:
        scroll_page(driver, wait)
        simulate_human_behavior(driver)
        
        # Sélecteurs plus robustes pour les produits
        product_selector = ".search-card, .m-gallery-product-item-v2, .offer-card"
        products = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, product_selector)))
        
        if not products:
            print(f"Aucun produit trouvé sur la page {page_number}. Sauvegarde de la source de la page pour le débogage...")
            with open(f"page_source_page_{page_number}.html", "w", encoding="utf-8") as f:
                f.write(driver.page_source)
            return False
        
        print(f"Nombre de produits trouvés sur la page {page_number} : {len(products)}")
        
        for product in products:
            try:
                # Extraction du product_id (si disponible)
                product_id = product.get_attribute("data-product-id") or "N/A"
                
                # Extraction du titre
                title_elements = product.find_elements(By.CSS_SELECTOR, ".search-card-e-title a span, [class*='title'] a, [class*='title'] span")
                title = title_elements[0].text.strip() if title_elements else "N/A"
                
                # Extraction du prix
                price_elements = product.find_elements(By.CSS_SELECTOR, ".search-card-e-price-main, [class*='price'], .elements-offer-price-normal__price")
                price = price_elements[0].text.strip() if price_elements else "N/A"
                
                # Extraction du nom du fournisseur
                supplier_elements = product.find_elements(By.CSS_SELECTOR, ".search-card-e-company, [class*='company'], .gallery-offer-supplier-name")
                supplier = supplier_elements[0].text.strip() if supplier_elements else "N/A"
                
                # Extraction des informations sur le fournisseur
                supplier_info_elements = product.find_elements(By.CSS_SELECTOR, ".search-card-e-supplier__year span, [class*='supplier'] span, .gallery-offer-supplier-years")
                supplier_info = supplier_info_elements[0].text.strip() if supplier_info_elements else "N/A"
                
                # Extraction de l'URL de l'image
                image_elements = product.find_elements(By.CSS_SELECTOR, ".search-card-e-slider__img, img[src*='alicdn.com'], .gallery-offer-image img")
                image_url = image_elements[0].get_attribute("src") if image_elements else "N/A"
                
                # Générer un hash unique pour l’offre
                offer_hash = product_id if product_id != "N/A" else f"{title}|{price}|{supplier}|{supplier_info}"
                if offer_hash in seen_offers:
                    print(f"Doublon ignoré sur la page {page_number} : {title} (hash: {offer_hash})")
                    continue
                seen_offers.add(offer_hash)
                
                # Écrire dans le CSV si le titre est valide
                if title != "N/A":
                    writer.writerow([title, price, supplier, supplier_info, "N/A", "N/A", "N/A", image_url])
                    print(f"Scrapé (page {page_number}) : {title} | {price} | {supplier} | {supplier_info} | Image URL: {image_url}")
                
            except Exception as e:
                print(f"Erreur lors du scraping d'un produit sur la page {page_number} : {e}")
                continue
                
    except TimeoutException:
        print(f"Timeout lors de l'attente des produits sur la page {page_number}. Sauvegarde de la source de la page pour le débogage...")
        with open(f"page_source_page_{page_number}.html", "w", encoding="utf-8") as f:
            f.write(driver.page_source)
        return False
    except Exception as e:
        print(f"Erreur lors de la recherche des produits sur la page {page_number} : {e}")
        return False
    return True

# Fonction principale pour scraper les deux pages
def main():
    urls = [
        "https://www.alibaba.com/trade/search?spm=a2700.product_home_fy25.home_login_first_screen_fy23_pc_search_bar.keydown__Enter&tab=all&SearchText=wheat",
        "https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&keywords=wheat&originKeywords=wheat&tab=all&&page=2&spm=a2700.galleryofferlist.pagination.0"
    ]
    driver = setup_driver(headless=False)  # Mode non-headless pour débogage
    wait = WebDriverWait(driver, 30)
    
    with open("alibaba_wheat_no_login.csv", "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["Title", "Price", "Supplier", "Supplier Info (Years & Location)", "Contact Name", "Email", "Phone", "Image URL"])
        
        for page_number, url in enumerate(urls, 1):
            try:
                print(f"Chargement de l'URL {url}...")
                driver.get(url)
                print(f"Page {page_number} de recherche chargée.")
                time.sleep(random.uniform(5, 10))
                simulate_human_behavior(driver)
                
                print(f"Scraping de la page {page_number}...")
                scrape_page(driver, writer, wait, page_number)
                
            except WebDriverException as e:
                print(f"Erreur WebDriver sur la page {page_number} : {e}")
            except Exception as e:
                print(f"Erreur inattendue sur la page {page_number} : {e}")
                
    driver.quit()
    print("Scraping terminé. Données enregistrées dans alibaba_wheat_no_login.csv")

if __name__ == "__main__":
    main()
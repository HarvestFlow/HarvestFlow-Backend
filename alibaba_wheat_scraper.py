import json
import logging
import random
import time
import re
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import NoSuchElementException, TimeoutException, WebDriverException
import csv

# Configurer les journaux
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration du navigateur Selenium avec Chrome
def setup_driver(headless=False):
    logger.info("Configuration du WebDriver...")
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
        logger.info("Simulation de comportement humain effectuée.")
    except Exception as e:
        logger.error(f"Erreur lors de la simulation du comportement humain : {e}")

# Faire défiler la page pour charger le contenu dynamique
def scroll_page(driver, wait):
    try:
        last_height = driver.execute_script("return document.body.scrollHeight")
        while True:
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(random.uniform(2, 4))
            wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, ".search-card, .m-gallery-product-item-v2")))
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height
        logger.info("Défilement de la page terminé.")
    except Exception as e:
        logger.error(f"Erreur lors du défilement : {e}")

# Scraper les données des produits d'une page
def scrape_page(driver, writer, wait, page_number, crop_type):
    seen_offers = set()
    try:
        scroll_page(driver, wait)
        simulate_human_behavior(driver)
        
        product_selector = ".search-card, .m-gallery-product-item-v2, .offer-card"
        products = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, product_selector)))
        
        if not products:
            logger.warning(f"Aucun produit trouvé sur la page {page_number}. Sauvegarde de la source de la page...")
            with open(f"page_source_page_{page_number}.html", "w", encoding="utf-8") as f:
                f.write(driver.page_source)
            return False
        
        logger.info(f"Nombre de produits trouvés sur la page {page_number} : {len(products)}")
        
        for product in products:
            try:
                product_id = product.get_attribute("data-product-id") or "N/A"
                
                # Extraire le titre
                title_elements = product.find_elements(By.CSS_SELECTOR, ".search-card-e-title a span, [class*='title'] a, [class*='title'] span")
                title = title_elements[0].text.strip() if title_elements else "N/A"
                
                # Extraire le prix
                price_elements = product.find_elements(By.CSS_SELECTOR, ".search-card-e-price-main, [class*='price'], .elements-offer-price-normal__price")
                price = price_elements[0].text.strip() if price_elements else "N/A"
                
                # Extraire la quantité minimale (MOQ)
                moq_elements = product.find_elements(By.CSS_SELECTOR, ".search-card-m-sale-features__item, [class*='moq'], [data-aplus-auto-card-mod*='moq']")
                min_quantity = "N/A"
                for elem in moq_elements:
                    text = elem.text.strip()
                    if "Quantité min." in text or "MOQ" in text.lower():
                        min_quantity = text.replace("Quantité min. :", "").strip()
                        break
                if min_quantity == "N/A" and title != "N/A":
                    # Tenter d'extraire la quantité depuis le titre
                    quantity_match = re.search(r'(\d+\.?\d*)\s*(tons|tonnes|mt|t|kg|kilograms)\b', title, re.IGNORECASE)
                    min_quantity = quantity_match.group(0) if quantity_match else "N/A"
                
                # Extraire le fournisseur
                supplier_elements = product.find_elements(By.CSS_SELECTOR, ".search-card-e-company, [class*='company'], .gallery-offer-supplier-name")
                supplier = supplier_elements[0].text.strip() if supplier_elements else "N/A"
                
                # Extraire les informations du fournisseur
                supplier_info_elements = product.find_elements(By.CSS_SELECTOR, ".search-card-e-supplier__year span, [class*='supplier'] span, .gallery-offer-supplier-years")
                supplier_info = supplier_info_elements[0].text.strip() if supplier_info_elements else "N/A"
                
                contact_name = "N/A"
                email = "N/A"
                phone = "N/A"
                
                # Extraire l'URL de l'image
                image_elements = product.find_elements(By.CSS_SELECTOR, ".search-card-e-slider__img, img[src*='alicdn.com'], .gallery-offer-image img")
                image_url = image_elements[0].get_attribute("src") if image_elements else "N/A"
                
                offer_hash = product_id if product_id != "N/A" else f"{title}|{price}|{min_quantity}|{supplier}|{supplier_info}"
                if offer_hash in seen_offers:
                    logger.info(f"Doublon ignoré sur la page {page_number} : {title} (hash: {offer_hash})")
                    continue
                seen_offers.add(offer_hash)
                
                if title != "N/A":
                    writer.writerow([title, price, min_quantity, supplier, supplier_info, contact_name, email, phone, image_url, crop_type])
                    logger.info(f"Scrapé (page {page_number}) : {title} | {price} | Min Quantity: {min_quantity} | {supplier} | {supplier_info} | Crop Type: {crop_type} | Image URL: {image_url}")
                
            except Exception as e:
                logger.error(f"Erreur lors du scraping d'un produit sur la page {page_number} : {e}")
                continue
                
    except TimeoutException:
        logger.error(f"Timeout lors de l'attente des produits sur la page {page_number}. Sauvegarde de la source de la page...")
        with open(f"page_source_page_{page_number}.html", "w", encoding="utf-8") as f:
            f.write(driver.page_source)
        return False
    except Exception as e:
        logger.error(f"Erreur lors de la recherche des produits sur la page {page_number} : {e}")
        return False
    return True

# Fonction principale pour scraper les deux pages
def main():
    urls = [
        ("https://www.alibaba.com/trade/search?spm=a2700.product_home_fy25.home_login_first_screen_fy23_pc_search_bar.keydown__Enter&tab=all&SearchText=wheat", "wheat"),
        ("https://www.alibaba.com/trade/search?spm=a2700.product_home_fy25.home_login_first_screen_fy23_pc_search_bar.keydown__Enter&tab=all&SearchText=Barley", "barley"),
    ]
    driver = setup_driver(headless=False)
    wait = WebDriverWait(driver, 30)
    
    try:
        with open("alibaba_crops_no_login.csv", "w", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            writer.writerow(["Title", "Price", "Min Quantity", "Supplier", "Supplier Info (Years & Location)", "Contact Name", "Email", "Phone", "Image URL", "Crop Type"])
            
            for page_number, (url, crop_type) in enumerate(urls, 1):
                try:
                    logger.info(f"Chargement de l'URL {url} (Crop Type: {crop_type})...")
                    driver.get(url)
                    logger.info(f"Page {page_number} de recherche chargée.")
                    time.sleep(random.uniform(5, 10))
                    simulate_human_behavior(driver)
                    
                    logger.info(f"Scraping de la page {page_number}...")
                    scrape_page(driver, writer, wait, page_number, crop_type)
                    
                except WebDriverException as e:
                    logger.error(f"Erreur WebDriver sur la page {page_number} : {e}")
                except Exception as e:
                    logger.error(f"Erreur inattendue sur la page {page_number} : {e}")
                    
        return {
            'status': 'success',
            'message': 'Scraping terminé. Données enregistrées dans alibaba_crops_no_login.csv'
        }
    
    except Exception as e:
        logger.error(f"Erreur générale lors du scraping : {e}")
        return {
            'status': 'error',
            'message': 'Erreur lors du scraping',
            'error': str(e)
        }
    
    finally:
        logger.info("Fermeture du WebDriver...")
        driver.quit()

if __name__ == "__main__":
    result = main()
    print(json.dumps(result, indent=2))
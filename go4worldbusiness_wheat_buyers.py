# go4worldbusiness_wheat_buyers.py
import sys
import csv
import time
import random
import logging
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import NoSuchElementException, TimeoutException, WebDriverException

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG for detailed logs
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def setup_driver(headless=False):  # Non-headless for debugging
    logger.info("Setting up Chrome driver")
    chrome_options = Options()
    if headless:
        chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-webgl")
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    try:
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
        driver.set_window_size(1920, 1080)
        return driver
    except Exception as e:
        logger.error(f"Failed to set up driver: {e}")
        raise

def simulate_human_behavior(driver):
    try:
        actions = ActionChains(driver)
        actions.move_by_offset(random.randint(50, 200), random.randint(50, 200)).perform()
        time.sleep(random.uniform(0.5, 1.5))
    except Exception as e:
        logger.warning(f"Failed to simulate human behavior: {e}")

def scroll_page(driver):
    try:
        last_height = driver.execute_script("return document.body.scrollHeight")
        for _ in range(3):  # Limit to 3 scrolls
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(random.uniform(2, 4))
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height
    except Exception as e:
        logger.warning(f"Failed to scroll page: {e}")

def clean_text(text):
    """Clean text to prevent CSV formatting issues."""
    if not text:
        return "N/A"
    return text.replace('\n', ' ').replace(',', ' ').replace('"', '').strip()

def save_screenshot(driver, filename):
    """Save a screenshot for debugging."""
    try:
        driver.save_screenshot(filename)
        logger.info(f"Screenshot saved: {filename}")
    except Exception as e:
        logger.error(f"Failed to save screenshot: {e}")

def scrape_page(driver, writer, wait, page_number, cereal_type):
    logger.info(f"Scraping page {page_number} for {cereal_type}")
    try:
        scroll_page(driver)
        simulate_human_behavior(driver)
        buyer_selector = ".entity-rows-container"
        logger.debug(f"Waiting for buyer elements with selector: {buyer_selector}")
        buyers = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, buyer_selector)))
        logger.debug(f"Found {len(buyers)} buyer elements on page {page_number} for {cereal_type}")

        if not buyers:
            logger.warning(f"No buyers found on page {page_number} for {cereal_type}")
            save_screenshot(driver, f"no_buyers_{cereal_type}_page_{page_number}.png")
            return False

        for buyer in buyers:
            try:
                title = clean_text(buyer.find_element(By.CSS_SELECTOR, ".entity-row-title").text if buyer.find_elements(By.CSS_SELECTOR, ".entity-row-title") else "N/A")
                if title == "N/A":
                    logger.debug("Skipping buyer with invalid title")
                    continue
                country = clean_text(buyer.find_element(By.CSS_SELECTOR, ".subtitle.text-capitalize").text.replace("Buyer From ", "") if buyer.find_elements(By.CSS_SELECTOR, ".subtitle.text-capitalize") else "N/A")
                quantity = clean_text(buyer.find_element(By.CSS_SELECTOR, ".col-xs-12.col-sm-6.nopadding.mar-bot-5.ellipsis span[style*='font-weight: 300']").text if buyer.find_elements(By.CSS_SELECTOR, ".col-xs-12.col-sm-6.nopadding.mar-bot-5.ellipsis span[style*='font-weight: 300']") else "N/A")
                payment_terms = clean_text(buyer.find_element(By.XPATH, ".//span[contains(text(), 'Payment Terms')]//following-sibling::span").text if buyer.find_elements(By.XPATH, ".//span[contains(text(), 'Payment Terms')]") else "N/A")
                destination = clean_text(buyer.find_element(By.XPATH, ".//span[contains(text(), 'Destination Port')]//following-sibling::span").text if buyer.find_elements(By.XPATH, ".//span[contains(text(), 'Destination Port')]") else "N/A")
                supplier_regions = clean_text(buyer.find_element(By.XPATH, ".//span[contains(text(), 'Looking for suppliers from')]//following-sibling::span").text if buyer.find_elements(By.XPATH, ".//span[contains(text(), 'Looking for suppliers from')]") else "N/A")
                description = clean_text(buyer.find_element(By.CSS_SELECTOR, ".entity-row-description-search").text if buyer.find_elements(By.CSS_SELECTOR, ".entity-row-description-search") else "N/A")
                contact_name = clean_text(description.split("Contact :")[-1] if "Contact :" in description else "N/A")
                verified = clean_text(buyer.find_element(By.CSS_SELECTOR, ".verify-text small").text if buyer.find_elements(By.CSS_SELECTOR, ".verify-text small") else "N/A")
                date = clean_text(buyer.find_element(By.CSS_SELECTOR, ".col-xs-3.col-sm-2.xs-padd-lr-2.nopadding.text-right small").text if buyer.find_elements(By.CSS_SELECTOR, ".col-xs-3.col-sm-2.xs-padd-lr-2.nopadding.text-right small") else "N/A")

                row = [title, country, quantity, payment_terms, destination, supplier_regions, description, contact_name, verified, date, cereal_type]
                logger.debug(f"Scraped row: {row}")
                writer.writerow(row)
                logger.debug(f"Scraped buyer: {title} | {cereal_type}")
            except Exception as e:
                logger.debug(f"Failed to scrape buyer: {e}")
                continue
        return True
    except TimeoutException:
        logger.warning(f"Timeout waiting for buyers on page {page_number} for {cereal_type}")
        save_screenshot(driver, f"timeout_{cereal_type}_page_{page_number}.png")
        return False
    except Exception as e:
        logger.error(f"Error scraping page {page_number} for {cereal_type}: {e}")
        save_screenshot(driver, f"error_{cereal_type}_page_{page_number}.png")
        return False

def scrape_cereal_type(driver, wait, cereal_type, base_url, csv_file):
    logger.info(f"Starting scraping for {cereal_type}")
    with open(csv_file, 'a', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile, lineterminator='\n', quoting=csv.QUOTE_ALL)
        if csvfile.tell() == 0:
            writer.writerow(["Title", "Country", "Quantity Required", "Payment Terms", "Destination", "Looking for Suppliers From", "Product Description", "Contact Name", "Verified Status", "Date", "Cereal Type"])

        page_number = 1
        max_retries = 3
        while page_number <= 10:  # Limit to 10 pages
            for attempt in range(max_retries):
                try:
                    url = base_url if page_number == 1 else f"{base_url}&pg={page_number}"
                    logger.info(f"Navigating to {url} (Attempt {attempt + 1}/{max_retries})")
                    driver.get(url)
                    time.sleep(random.uniform(5, 10))
                    simulate_human_behavior(driver)

                    # Log page title and partial HTML for debugging
                    page_title = driver.title
                    logger.debug(f"Page title: {page_title}")
                    page_html = driver.page_source[:1000]  # First 1000 chars
                    logger.debug(f"Page HTML (first 1000 chars): {page_html}")

                    if not scrape_page(driver, writer, wait, page_number, cereal_type):
                        logger.info(f"No more buyers found on page {page_number} for {cereal_type}")
                        return

                    # Check for next button
                    try:
                        next_button = driver.find_element(By.CSS_SELECTOR, "a[title='Next']")
                        logger.debug(f"Next button found: {next_button.get_attribute('outerHTML')}")
                        if "disabled" in next_button.get_attribute("class"):
                            logger.info(f"Reached last page for {cereal_type}")
                            return
                        page_number += 1
                        break
                    except NoSuchElementException:
                        logger.info(f"No next button found for {cereal_type} on page {page_number}")
                        return
                except WebDriverException as e:
                    logger.error(f"WebDriver error for {cereal_type} on page {page_number}: {e}")
                    save_screenshot(driver, f"webdriver_error_{cereal_type}_page_{page_number}_attempt_{attempt + 1}.png")
                    if attempt == max_retries - 1:
                        logger.error(f"Max retries reached for page {page_number} of {cereal_type}")
                        return
                    time.sleep(random.uniform(5, 10))
                except Exception as e:
                    logger.error(f"General error for {cereal_type} on page {page_number}: {e}")
                    save_screenshot(driver, f"general_error_{cereal_type}_page_{page_number}_attempt_{attempt + 1}.png")
                    if attempt == max_retries - 1:
                        logger.error(f"Max retries reached for page {page_number} of {cereal_type}")
                        return
                    time.sleep(random.uniform(5, 10))

def main():
    csv_file = 'go4worldbusiness_buyers.csv'
    # Clear the CSV file before starting
    if os.path.exists(csv_file):
        os.remove(csv_file)
        logger.info(f"Cleared existing CSV file: {csv_file}")

    urls = [
        ("wheat", "https://www.go4worldbusiness.com/find?regionFilter%5B0%5D=africa&searchText=wheat&BuyersOrSuppliers=buyers"),
        ("barley", "https://www.go4worldbusiness.com/find?searchText=barley&BuyersOrSuppliers=Buyers")
    ]

    driver = setup_driver(headless=False)  # Non-headless for debugging
    wait = WebDriverWait(driver, 30)
    try:
        for cereal_type, base_url in urls:
            scrape_cereal_type(driver, wait, cereal_type, base_url, csv_file)
    finally:
        driver.quit()
        logger.info("Driver closed")

if __name__ == "__main__":
    main()
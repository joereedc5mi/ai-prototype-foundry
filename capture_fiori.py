from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8000")
            page.wait_for_timeout(4000)
            page.screenshot(path="/home/jules/verification/fiori_c5mi_final.png", full_page=True)
            print("Fiori Screenshot saved.")
        finally:
            browser.close()

if __name__ == "__main__":
    run()

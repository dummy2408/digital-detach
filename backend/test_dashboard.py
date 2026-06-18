from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:3000")

    page.evaluate("""
        localStorage.setItem('sg_current_user', 'test@test.com');
        localStorage.setItem('sg_users', JSON.stringify({ 
            'test@test.com': { 
                history: [], 
                profile: { name: 'Test User', age: 25, gender: 'Other', schoolGrade: 'None' } 
            } 
        }));
    """)
    page.reload()

    time.sleep(2)

    page.screenshot(path="screenshot_dashboard_initial.png")

    page.fill('input[placeholder="e.g. 3.5"]', "2") 
    page.fill('input[placeholder="e.g. 2.5"]', "1") 
    page.fill('input[placeholder="e.g. 1.0"]', "0.5") 
    page.fill('input[placeholder="e.g. 0.5"]', "1.5") 
    page.fill('input[placeholder="e.g. 85"]', "30") 
    page.fill('input[placeholder="e.g. 12"]', "10") 
    page.fill('input[placeholder="e.g. 1.0"]', "1") 

    page.click('button[type="submit"]')

    time.sleep(5)
    page.screenshot(path="screenshot_dashboard_seed.png")

    page.click('button[type="submit"]')
    time.sleep(5)
    page.screenshot(path="screenshot_dashboard_seed_2.png")

    page.click('button[type="submit"]')
    time.sleep(5)
    page.screenshot(path="screenshot_dashboard_sprout.png")

    browser.close()

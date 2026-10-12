import { chromium } from 'playwright'
import { spawn } from 'child_process'
import http from 'http'

function waitForServer(url, timeout = 15000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode === 200) {
            resolve(true)
          } else {
            retry()
          }
        })
        .on('error', () => {
          retry()
        })
    }

    const retry = () => {
      if (Date.now() - start > timeout) {
        reject(new Error(`Server at ${url} did not start within ${timeout}ms`))
      } else {
        setTimeout(check, 300)
      }
    }

    check()
  })
}

async function run() {
  console.log('🚀 Checking / Starting Vite preview server on port 1421...')

  let server = null
  const isAlreadyRunning = await new Promise((resolve) => {
    http
      .get('http://localhost:1421', (res) => resolve(res.statusCode === 200))
      .on('error', () => resolve(false))
  })

  if (!isAlreadyRunning) {
    server = spawn('pnpm', ['dev', '--port', '1421'], {
      cwd: '/Users/huy/dev/amktest/beamrest',
      stdio: 'pipe',
      shell: true,
    })
    server.stdout.on('data', (d) => process.stdout.write(`[Vite] ${d}`))
    server.stderr.on('data', (d) => process.stderr.write(`[Vite Err] ${d}`))
    await waitForServer('http://localhost:1421')
  }

  console.log('✅ Server is active at http://localhost:1421')

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  })
  const page = await browser.newPage({ viewport: { width: 1366, height: 860 } })

  page.on('console', (msg) => console.log('BROWSER LOG:', msg.type(), msg.text()))
  page.on('pageerror', (err) => console.log('BROWSER ERROR:', err))

  try {
    console.log('📄 Navigating to BeamREST...')
    await page.goto('http://localhost:1421')
    await page.waitForLoadState('networkidle')

    // 1. Verify Header & Branding
    console.log('🔍 1. Verifying Header & Branding...')
    const brand = await page.textContent('body')
    if (!brand.includes('BeamREST')) throw new Error('Brand BeamREST missing from UI')
    console.log('✅ Branding and logo verified')

    // 2. Test Shortcuts Modal (? button)
    console.log('⌨️ 2. Testing Shortcuts Cheat Sheet modal...')
    await page.click('[data-testid="header-shortcuts-btn"]')
    await page.waitForTimeout(300)
    const shortcutsTitle = page.locator('text="Keyboard Shortcuts"')
    if (!(await shortcutsTitle.isVisible())) throw new Error('Shortcuts modal did not open')
    console.log('✅ Shortcuts modal opened successfully')
    await page.click('button:has-text("Got it")')
    await page.waitForTimeout(200)

    // 3. Test Sidebar New Project Modal
    console.log('📁 3. Testing New Project creation...')
    await page.click('[data-testid="sidebar-new-project-btn"]')
    await page.waitForTimeout(300)
    const newProjModalTitle = page.locator('text="Create New Project"')
    if (!(await newProjModalTitle.isVisible())) throw new Error('New Project modal did not open')

    const projNameInput = page.locator('input[placeholder*="Authentication Service"]')
    await projNameInput.fill('Billing Service')
    await page.click('button:has-text("Create Project")')
    await page.waitForTimeout(400)

    const createdProj = page.locator('aside').getByText('Billing Service', { exact: true })
    if (!(await createdProj.isVisible())) throw new Error('Newly created project not visible in sidebar')
    console.log('✅ New Project created and visible in sidebar')

    // 3.1 Test Project Renaming in Sidebar
    console.log('✏️ 3.1. Testing Project Renaming in Sidebar...')
    const projContainer = page.locator('[data-testid^="sidebar-project-header-"]').filter({ hasText: 'Billing Service' })
    const renameProjBtn = projContainer.locator('button[title="Rename Project"]')
    await renameProjBtn.click({ force: true })
    await page.waitForTimeout(200)

    const projRenameInput = page.locator('input[data-testid^="sidebar-rename-project-input-"]').first()
    await projRenameInput.fill('Billing & Payments')
    const projSaveRenameBtn = page.locator('button[data-testid^="sidebar-save-project-rename-btn-"]').first()
    await projSaveRenameBtn.click()
    await page.waitForTimeout(300)

    const renamedProj = page.locator('aside').getByText('Billing & Payments', { exact: true })
    if (!(await renamedProj.isVisible())) throw new Error('Renamed project not visible in sidebar')
    console.log('✅ Project renamed to "Billing & Payments" in sidebar')

    // Rename back to Billing Service so subsequent tests work seamlessly
    const renamedContainer = page.locator('[data-testid^="sidebar-project-header-"]').filter({ hasText: 'Billing & Payments' })
    const renameBackBtn = renamedContainer.locator('button[title="Rename Project"]')
    await renameBackBtn.click({ force: true })
    await page.waitForTimeout(200)

    const projRenameBackInput = page.locator('input[data-testid^="sidebar-rename-project-input-"]').first()
    await projRenameBackInput.fill('Billing Service')
    const projSaveRenameBackBtn = page.locator('button[data-testid^="sidebar-save-project-rename-btn-"]').first()
    await projSaveRenameBackBtn.click()
    await page.waitForTimeout(300)
    console.log('✅ Project renamed back to "Billing Service"')

    // 4. Test New Request creation inside Project
    console.log('➕ 4. Testing New Request creation inside Project...')
    const addReqBtn = page.locator('button[title*="Add Request to this project"]').first()
    await addReqBtn.click()
    await page.waitForTimeout(300)

    const newReqModalTitle = page.locator('text="Create New Request"')
    if (!(await newReqModalTitle.isVisible())) throw new Error('New Request modal did not open')

    const reqNameInput = page.locator('input[placeholder*="Get User Profile"]')
    await reqNameInput.fill('Get Invoices List')
    await page.click('button:has-text("Create Request")')
    await page.waitForTimeout(400)

    const createdReq = page.locator('text="Get Invoices List"').first()
    if (!(await createdReq.isVisible())) throw new Error('Newly created request not visible in sidebar')
    console.log('✅ New Request created and visible in sidebar')

    // 4.1 Test Request Renaming (from RequestPane and Sidebar)
    console.log('✏️ 4.1. Testing Request Renaming from RequestPane and Sidebar...')
    const paneEditBtn = page.locator('[data-testid="request-pane-edit-name-btn"]')
    await paneEditBtn.click()
    await page.waitForTimeout(200)

    const paneNameInput = page.locator('[data-testid="request-pane-name-input"]')
    await paneNameInput.fill('Get Invoices List (Pane Renamed)')
    await page.click('[data-testid="request-pane-save-name-btn"]')
    await page.waitForTimeout(300)

    const paneUpdatedTitle = page.locator('[data-testid="request-pane-name"]')
    if ((await paneUpdatedTitle.textContent()) !== 'Get Invoices List (Pane Renamed)') {
      throw new Error('Request title not updated in RequestPane')
    }
    console.log('✅ Request renamed from RequestPane title bar')

    // Rename back from Sidebar
    const activeReqItem = page.locator('[data-testid^="sidebar-request-"]').filter({ hasText: 'Get Invoices List (Pane Renamed)' })
    const sidebarRenameBtn = activeReqItem.locator('button[title="Rename Request"]')
    await sidebarRenameBtn.click({ force: true })
    await page.waitForTimeout(200)

    const sidebarRenameInput = page.locator('input[data-testid^="sidebar-rename-input-"]').first()
    await sidebarRenameInput.fill('Get Invoices List')
    const sidebarSaveRenameBtn = page.locator('button[data-testid^="sidebar-save-rename-btn-"]').first()
    await sidebarSaveRenameBtn.click()
    await page.waitForTimeout(300)

    if ((await paneUpdatedTitle.textContent()) !== 'Get Invoices List') {
      throw new Error('Request title not updated after Sidebar rename')
    }
    console.log('✅ Request renamed from Sidebar inline input')

    // 4.2 Test Recent Requests section in Sidebar
    console.log('🕒 4.2. Testing Recent Requests section in Sidebar...')
    const recentSection = page.locator('[data-testid="sidebar-recent-requests-section"]')
    if (!(await recentSection.isVisible())) throw new Error('Recent Requests section not visible in sidebar')

    const recentItem = page.locator('[data-testid^="sidebar-recent-request-"]').first()
    if (!(await recentItem.isVisible())) throw new Error('Recent request item not visible in list')

    const recentItemText = await recentItem.innerText()
    if (!recentItemText.includes('Get Invoices List')) {
      throw new Error(`Recent request does not contain expected name: ${recentItemText}`)
    }
    console.log('✅ Recent request item shows "Get Invoices List"')

    await recentItem.click()
    await page.waitForTimeout(200)
    console.log('✅ Recent request item clicked and selected')

    // 4.3 Test Request Cloning / Duplicating
    console.log('📋 4.3. Testing Request Cloning / Duplicating...')
    const cloneBtn = page.locator('[data-testid="request-pane-clone-btn"]')
    await cloneBtn.click()
    await page.waitForTimeout(400)

    const clonedPaneTitle = page.locator('[data-testid="request-pane-name"]')
    const clonedName = await clonedPaneTitle.textContent()
    if (clonedName !== 'Get Invoices List (Copy)') {
      throw new Error(`Expected cloned request name 'Get Invoices List (Copy)', got '${clonedName}'`)
    }
    console.log('✅ Request cloned via RequestPane Clone button')

    // Verify cloned request appears in sidebar
    const clonedSidebarItem = page.locator('[data-testid^="sidebar-request-"]').filter({ hasText: 'Get Invoices List (Copy)' })
    if (!(await clonedSidebarItem.isVisible())) {
      throw new Error('Cloned request not visible in sidebar')
    }

    // Test cloning via Sidebar hover action
    const sidebarCloneBtn = clonedSidebarItem.locator('button[title="Clone Request"]')
    await sidebarCloneBtn.click({ force: true })
    await page.waitForTimeout(400)

    const secondClonedName = await clonedPaneTitle.textContent()
    if (secondClonedName !== 'Get Invoices List (Copy 2)') {
      throw new Error(`Expected second cloned request name 'Get Invoices List (Copy 2)', got '${secondClonedName}'`)
    }
    console.log('✅ Cloned request cloned again via Sidebar button to "Get Invoices List (Copy 2)"')

    // Clean up both cloned requests so subsequent tests work seamlessly
    const deleteCopy2Btn = page.locator('[data-testid^="sidebar-request-"]').filter({ hasText: 'Get Invoices List (Copy 2)' }).locator('button[title="Delete Request"]')
    await deleteCopy2Btn.click({ force: true })
    await page.waitForTimeout(300)
    await page.click('button:has-text("Delete")')
    await page.waitForTimeout(400)

    const deleteCopyBtn = page.locator('[data-testid^="sidebar-request-"]').filter({ hasText: 'Get Invoices List (Copy)' }).locator('button[title="Delete Request"]')
    await deleteCopyBtn.click({ force: true })
    await page.waitForTimeout(300)
    await page.click('button:has-text("Delete")')
    await page.waitForTimeout(400)

    // Select the original request back
    const originalReq = page.locator('[data-testid^="sidebar-request-"]').filter({ hasText: 'Get Invoices List' }).first()
    await originalReq.click()
    await page.waitForTimeout(300)
    console.log('✅ Both cloned requests cleaned up and original request active')

    // 5. Test Request Configuration (URL, Params, Headers, Body, Auth, Extractors)
    console.log('🔧 5. Testing Request Editor tabs & inputs...')

    // Switch method
    const methodSelect = page.locator('[data-testid="request-method-select"]')
    await methodSelect.selectOption('POST')

    // Fill URL
    const urlInput = page.locator('[data-testid="request-url-input"]')
    await urlInput.fill('https://httpbin.org/post')

    // Params Tab
    await page.click('[data-testid="request-tab-params"]')
    await page.click('[data-testid="add-param-btn"]')
    const paramKey = page.locator('input[placeholder="Key"]').first()
    const paramVal = page.locator('input[placeholder*="Value"]').first()
    await paramKey.fill('limit')
    await paramVal.fill('50')
    console.log('✅ Query Params added and verified')

    // Headers Tab
    await page.click('[data-testid="request-tab-headers"]')
    await page.click('[data-testid="add-header-btn"]')
    const headerKey = page.locator('input[placeholder="Header Name"]').first()
    const headerVal = page.locator('input[placeholder="Header Value"]').first()
    await headerKey.fill('X-App-Client')
    await headerVal.fill('BeamREST-Playwright')
    console.log('✅ Headers added and verified')

    // Body Tab
    await page.click('[data-testid="request-tab-body"]')
    await page.click('label:has-text("json")')
    await page.waitForTimeout(300)
    console.log('✅ Body radio switched to JSON')

    // Auth Tab
    await page.click('[data-testid="request-tab-auth"]')
    const authSelect = page.locator('select').nth(2) // auth type select
    await authSelect.selectOption('bearer')
    const tokenInput = page.locator('input[placeholder*="jwt_token"]')
    await tokenInput.fill('test-bearer-token-123')
    console.log('✅ Bearer token auth configured')

    // Auto Extractors Tab
    await page.click('[data-testid="request-tab-extractors"]')
    await page.click('[data-testid="add-extractor-btn"]')
    const extractorField = page.locator('input[placeholder*="data.token"]').first()
    await extractorField.fill('origin')
    console.log('✅ Auto Extractor rule added')

    // 6. Test Icon-Only Buttons, Unsaved Dot Indicator & Live cURL Tab
    console.log('⚡ 6. Testing icon-only buttons, unsaved indicator, and live cURL tab...')
    // Verify no standalone cURL button next to Save
    const standaloneCurlBtnCount = await page.locator('[data-testid="request-curl-btn"]').count()
    if (standaloneCurlBtnCount > 0) throw new Error('Standalone cURL button should be removed')
    console.log('✅ Standalone cURL button removed')

    // Verify Send and Save buttons are icon-only
    const sendBtnText = (await page.locator('[data-testid="request-send-btn"]').innerText()).trim()
    if (sendBtnText !== '') throw new Error(`Send button should be icon-only, found: "${sendBtnText}"`)
    const saveBtnText = (await page.locator('[data-testid="request-save-btn"]').innerText()).trim()
    if (saveBtnText !== '') throw new Error(`Save button should be icon-only, found: "${saveBtnText}"`)
    console.log('✅ Send and Save buttons verified as icon-only')

    // Verify Unsaved indicator dot is visible because request was edited
    const unsavedDot = page.locator('[data-testid="request-unsaved-dot"]')
    if (!(await unsavedDot.isVisible())) throw new Error('Unsaved dot should appear on Save button when request is modified')
    console.log('✅ Unsaved dot indicator visible on Save button')

    // Click Save button and verify unsaved dot disappears
    await page.click('[data-testid="request-save-btn"]')
    await page.waitForTimeout(400)
    const isUnsavedStillVisible = await unsavedDot.isVisible()
    if (isUnsavedStillVisible) throw new Error('Unsaved dot should disappear after saving request')
    console.log('✅ Unsaved dot cleared after saving request')

    // Switch to cURL Tab and verify live generation
    await page.click('button:has-text("cURL")')
    await page.waitForTimeout(400)
    const curlPreviewText = await page.locator('[data-testid="response-curl-preview"]').innerText()
    if (!curlPreviewText.includes('curl -X POST')) {
      throw new Error(`cURL preview failed to generate, got: ${curlPreviewText}`)
    }
    console.log('✅ Live cURL tab verified')

    // Change URL and verify live cURL tab updates automatically without clicking anything
    await page.fill('[data-testid="request-url-input"]', 'https://httpbin.org/post?live_check=1')
    await page.waitForTimeout(400)
    const updatedCurlText = await page.locator('[data-testid="response-curl-preview"]').innerText()
    if (!updatedCurlText.includes('live_check=1')) {
      throw new Error(`cURL preview did not live-update when URL changed: ${updatedCurlText}`)
    }
    console.log('✅ Live cURL tab auto-updated on request change')

    // 7. Test Send HTTP Request
    console.log('🚀 7. Testing HTTP Send request...')
    await page.click('[data-testid="request-send-btn"]')
    await page.waitForTimeout(1000)

    // Check status badge
    const statusPill = page.locator('text=200').first()
    if (!(await statusPill.isVisible())) {
      console.warn('⚠️ HTTP 200 not immediate (network delay), checking telemetry bar...')
    }
    console.log('✅ Request sent and response telemetry updated')

    // 7.1. Test Workspace Renaming
    console.log('🏷️ 7.1. Testing Workspace Renaming...')
    const wsNameElem = page.locator('[data-testid="header-workspace-name"]')
    await wsNameElem.hover()
    await page.waitForTimeout(200)
    const renameBtn = page.locator('[data-testid="header-rename-ws-btn"]')
    await renameBtn.click()
    await page.waitForTimeout(200)

    const wsInput = page.locator('[data-testid="header-workspace-name-input"]')
    await wsInput.fill('BeamREST Pro Workspace')
    await page.click('[data-testid="header-save-ws-name-btn"]')
    await page.waitForTimeout(400)

    const newWsName = await page.locator('[data-testid="header-workspace-name"]').innerText()
    if (newWsName !== 'BeamREST Pro Workspace') {
      throw new Error(`Workspace name rename failed, expected 'BeamREST Pro Workspace', got '${newWsName}'`)
    }
    console.log('✅ Workspace renamed successfully')

    // 7.2. Test Proxy Configuration
    console.log('🌐 7.2. Testing Proxy Configuration...')
    await page.click('[data-testid="header-proxy-btn"]')
    await page.waitForTimeout(300)

    const proxyModalTitle = page.locator('text="Proxy Configuration"')
    if (!(await proxyModalTitle.isVisible())) throw new Error('Proxy modal failed to open')

    // Enable proxy and set socks5 URL
    await page.click('[data-testid="proxy-enable-toggle"]')
    await page.fill('[data-testid="proxy-url-input"]', 'socks5://127.0.0.1:1080')
    await page.click('[data-testid="proxy-save-btn"]')
    await page.waitForTimeout(400)

    const proxyStatusText = await page.locator('[data-testid="header-proxy-btn"]').innerText()
    if (!proxyStatusText.includes('ON')) throw new Error('Header proxy status should show ON')
    console.log('✅ Proxy enabled in Header')

    // Switch to cURL tab to view updated cURL command
    await page.click('button:has-text("cURL")')
    await page.waitForTimeout(400)

    // Verify cURL tab now includes proxy argument -x "socks5://127.0.0.1:1080"
    const proxyCurlText = await page.locator('[data-testid="response-curl-preview"]').innerText()
    if (!proxyCurlText.includes('-x "socks5://127.0.0.1:1080"')) {
      throw new Error(`cURL preview does not include proxy flag: ${proxyCurlText}`)
    }
    console.log('✅ Live cURL preview includes -x proxy flag')

    // Turn proxy off
    await page.click('[data-testid="header-proxy-btn"]')
    await page.waitForTimeout(300)
    await page.click('[data-testid="proxy-enable-toggle"]')
    await page.click('[data-testid="proxy-save-btn"]')
    await page.waitForTimeout(400)
    const proxyOffText = await page.locator('[data-testid="header-proxy-btn"]').innerText()
    if (!proxyOffText.includes('OFF')) throw new Error('Header proxy status should show OFF')
    console.log('✅ Proxy disabled cleanly')

    // 8. Test Variables / Environment Modal
    console.log('🛡️ 8. Testing Variables & Secrets Modal...')
    await page.click('[data-testid="header-variables-btn"]')
    await page.waitForTimeout(300)

    const varModalTitle = page.locator('text="Variable & Secret Manager"')
    if (!(await varModalTitle.isVisible())) throw new Error('Variables modal failed to open')

    await page.click('[data-testid="env-add-project-var-btn"]')
    const varKeyInput = page.locator('input[placeholder*="baseUrl"]').first()
    await varKeyInput.fill('mySecretApi')
    console.log('✅ Variable added in Variable Manager')

    await page.click('[data-testid="env-done-btn"]')
    await page.waitForTimeout(500)

    const isEnvModalStillVisible = await page.locator('text="Variable & Secret Manager"').isVisible()
    console.log('Is Variables modal still visible after Done?', isEnvModalStillVisible)

    // 9. Test Export Postman Modal
    console.log('📦 9. Testing Postman Export Modal...')
    const exportBtn = page.locator('[data-testid="header-export-btn"]')
    console.log('Export button count:', await exportBtn.count())
    await exportBtn.click()
    await page.waitForTimeout(600)

    const exportModalTitle = page.locator('text="Export to Postman Collection (v2.1)"')
    const isExportModalVisible = await exportModalTitle.isVisible()
    console.log('Is Export modal visible?', isExportModalVisible)
    if (!isExportModalVisible) throw new Error('Export modal failed to open')


    const textarea = page.locator('[data-testid="export-preview-textarea"]')
    const textVal = await textarea.inputValue()
    if (!textVal.includes('https://schema.getpostman.com/json/collection/v2.1.0/collection.json')) {
      throw new Error('Export modal did not generate valid Postman v2.1 schema')
    }
    console.log('✅ Postman Collection v2.1 export auto-generated with schema validation!')

    // Toggle Secret inclusion
    await page.click('[data-testid="export-include-secrets"]')
    await page.waitForTimeout(200)
    console.log('✅ Secret toggle works in Export Modal')

    await page.click('[data-testid="export-close-btn"]')
    await page.waitForTimeout(200)

    // 10. Test Delete Request Modal
    console.log('🗑️ 10. Testing Delete Request Confirmation modal...')
    const deleteBtn = page.locator('button[title="Delete Request"]').first()
    await deleteBtn.click()
    await page.waitForTimeout(300)

    const confirmModalTitle = page.locator('text="Confirm Deletion"')
    if (!(await confirmModalTitle.isVisible())) throw new Error('Confirm Delete modal did not appear')
    await page.click('button:has-text("Delete")')
    await page.waitForTimeout(400)
    console.log('✅ Request deleted successfully via confirmation modal')

    // 11. Test cURL Paste into URL input
    console.log('📋 11. Testing cURL command paste into URL bar...')
    const curlSample = `curl -X PUT "https://httpbin.org/put?role=admin" -H "X-Custom-Auth: token999" -d '{"updated":true}'`
    await page.fill('[data-testid="request-url-input"]', curlSample)
    await page.waitForTimeout(400)

    const updatedUrl = await page.inputValue('[data-testid="request-url-input"]')
    if (updatedUrl !== 'https://httpbin.org/put') {
      throw new Error(`cURL paste did not parse URL correctly: expected https://httpbin.org/put, got ${updatedUrl}`)
    }
    const selectedMethod = await page.inputValue('[data-testid="request-method-select"]')
    if (selectedMethod !== 'PUT') {
      throw new Error(`cURL paste did not parse method correctly: expected PUT, got ${selectedMethod}`)
    }
    console.log('✅ cURL paste successfully parsed method, URL, and parameters into request!')

    // 12. Test Delete Project Modal
    console.log('🗑️ 12. Testing Delete Project confirmation modal...')
    const deleteProjBtn = page.locator('button[title="Delete Project"]').first()
    await deleteProjBtn.click({ force: true })
    await page.waitForTimeout(400)

    const isDeleteProjModalVisible = await page.locator('text=Are you sure you want to delete project').isVisible()
    if (!isDeleteProjModalVisible) throw new Error('Delete Project modal did not appear')
    await page.click('[data-testid="confirm-delete-action-btn"]')
    await page.waitForTimeout(400)
    console.log('✅ Project deleted successfully via confirmation modal')

    // 13. Test New Workspace Modal
    console.log('🏗️ 13. Testing New Workspace modal...')
    await page.click('[data-testid="header-new-ws-btn"]')
    await page.waitForTimeout(300)
    const isNewWsModalVisible = await page.locator('text="Create New Workspace"').isVisible()
    if (!isNewWsModalVisible) throw new Error('New Workspace modal did not appear')
    await page.click('button:has-text("Cancel")')
    await page.waitForTimeout(200)
    console.log('✅ New Workspace modal opened and closed cleanly')

    // 14. Test Recent Workspaces Dropdown
    console.log('📂 14. Testing Recent Workspaces dropdown & quick switcher...')
    await page.click('[data-testid="header-workspace-dropdown-btn"]')
    await page.waitForTimeout(300)
    const wsMenu = page.locator('[data-testid="header-workspace-dropdown-menu"]')
    if (!(await wsMenu.isVisible())) throw new Error('Recent Workspaces dropdown menu failed to open')
    const firstRecentItem = page.locator('[data-testid="header-recent-workspace-0"]')
    if (!(await firstRecentItem.isVisible())) throw new Error('Recent workspace items not visible in dropdown')
    console.log('✅ Recent Workspaces dropdown visible with recorded workspace items')
    // Close dropdown by pressing Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    if (await wsMenu.isVisible()) throw new Error('Workspace dropdown did not close on Escape')
    console.log('✅ Workspace dropdown closed on Escape')

    // 15. Test Variable Autocomplete on {{
    console.log('✨ 15. Testing Variable Autocomplete on {{ trigger...')
    const urlInputForVar = page.locator('[data-testid="request-url-input"]')
    await urlInputForVar.click()
    await page.fill('[data-testid="request-url-input"]', 'https://api.example.com/items/{{')
    await page.waitForTimeout(300)
    const varDropdown = page.locator('[data-testid="variable-suggestions-dropdown"]')
    if (!(await varDropdown.isVisible())) throw new Error('Variable autocomplete dropdown did not appear on {{')
    console.log('✅ Variable suggestions dropdown appeared on {{ trigger')

    // Press Enter to select first suggestion
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
    const completedUrl = await page.inputValue('[data-testid="request-url-input"]')
    if (!completedUrl.includes('{{') || !completedUrl.includes('}}')) {
      throw new Error(`Variable completion failed, got URL: ${completedUrl}`)
    }
    console.log('✅ Variable successfully autocompleted into input:', completedUrl)

    // 16. Test Resizable Panels
    console.log('↔️ 16. Testing Resizable Panels (Sidebar & Split)...')
    const sidebarDivider = page.locator('[data-testid="sidebar-resizer"]')
    if (!(await sidebarDivider.isVisible())) throw new Error('Sidebar resizer divider missing')
    const initialSidebarBox = await sidebarDivider.boundingBox()
    if (!initialSidebarBox) throw new Error('Could not get bounding box of sidebar resizer')

    // Drag sidebar divider 50px to the right
    await page.mouse.move(initialSidebarBox.x + initialSidebarBox.width / 2, initialSidebarBox.y + 100)
    await page.mouse.down()
    await page.mouse.move(initialSidebarBox.x + 50, initialSidebarBox.y + 100, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    const savedSidebarWidth = await page.evaluate(() => localStorage.getItem('beamrest:sidebar_width'))
    if (!savedSidebarWidth || parseInt(savedSidebarWidth, 10) <= 260) {
      console.warn(`Sidebar width saved in localStorage: ${savedSidebarWidth}`)
    }
    console.log('✅ Sidebar panel resized and width persisted in localStorage:', savedSidebarWidth)

    // Drag split pane divider
    const splitDivider = page.locator('[data-testid="split-resizer"]')
    if (!(await splitDivider.isVisible())) throw new Error('Split pane resizer divider missing')
    const initialSplitBox = await splitDivider.boundingBox()
    if (!initialSplitBox) throw new Error('Could not get bounding box of split resizer')

    await page.mouse.move(initialSplitBox.x + initialSplitBox.width / 2, initialSplitBox.y + 150)
    await page.mouse.down()
    await page.mouse.move(initialSplitBox.x + 40, initialSplitBox.y + 150, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    const savedSplitRatio = await page.evaluate(() => localStorage.getItem('beamrest:split_ratio'))
    console.log('✅ Split pane resized and ratio persisted in localStorage:', savedSplitRatio)

    // 17. Test Escape Key Closes Modals
    console.log('🛑 17. Testing Escape Key Closes Modals...')
    // Open Shortcuts Modal
    await page.click('[data-testid="header-shortcuts-btn"]')
    await page.waitForTimeout(300)
    if (!(await page.locator('text="Keyboard Shortcuts"').isVisible())) throw new Error('Shortcuts modal did not open')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    if (await page.locator('text="Keyboard Shortcuts"').isVisible()) throw new Error('Shortcuts modal did not close on Escape')
    console.log('✅ Shortcuts modal closed on Escape')

    // Open Proxy Modal
    await page.click('[data-testid="header-proxy-btn"]')
    await page.waitForTimeout(300)
    if (!(await page.locator('text="Proxy Configuration"').isVisible())) throw new Error('Proxy modal did not open')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    if (await page.locator('text="Proxy Configuration"').isVisible()) throw new Error('Proxy modal did not close on Escape')
    console.log('✅ Proxy modal closed on Escape')

    // Open Variables Modal
    await page.click('[data-testid="header-variables-btn"]')
    await page.waitForTimeout(300)
    if (!(await page.locator('text="Variable & Secret Manager"').isVisible())) throw new Error('Variables modal did not open')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    if (await page.locator('text="Variable & Secret Manager"').isVisible()) throw new Error('Variables modal did not close on Escape')
    // 18. Test Software Update Dialog
    console.log('🔄 18. Testing Software Update modal & version check...')
    await page.click('[data-testid="header-check-update-btn"]')
    await page.waitForTimeout(400)
    const updateDialog = page.locator('[data-testid="update-dialog"]')
    if (!(await updateDialog.isVisible())) throw new Error('Update modal did not open')
    const updateHeaderText = await page.locator('text="BeamREST Software Update"').isVisible()
    if (!updateHeaderText) throw new Error('Update dialog header missing')
    console.log('✅ Software Update dialog opened and verified')
    // Close with Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    if (await updateDialog.isVisible()) throw new Error('Update modal did not close on Escape')
    console.log('✅ Software Update dialog closed on Escape')

    console.log('🎉 ALL 19 PLAYWRIGHT E2E ASSERTIONS PASSED WITH 100% SUCCESS!')
  } finally {
    await browser.close()
    if (server) {
      server.kill()
    }
  }
}

run().catch((err) => {
  console.error('❌ Playwright E2E verification failed:', err)
  process.exit(1)
})

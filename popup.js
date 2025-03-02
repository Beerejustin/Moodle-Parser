/**
 * Event listener for DOMContentLoaded to initialize the popup.
 */
document.addEventListener("DOMContentLoaded", () => {
  // Query the active tab and execute the extractFileLinks function
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0] || !tabs[0].id) {
      displayEmptyState("Could not access the current tab. Please try again.")
      return
    }

    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: extractFileLinks,
      },
      (results) => {
        if (chrome.runtime.lastError) {
          console.error("Script execution error:", chrome.runtime.lastError)
          displayEmptyState("Could not extract files from this page: " + chrome.runtime.lastError.message)
          return
        }

        if (results && results[0] && results[0].result) {
          displayFileLinks(results[0].result)
        } else {
          displayEmptyState()
        }
      },
    )
  })

  // Event listener for the "Select All" button
  document.getElementById("selectAllBtn").addEventListener("click", () => {
    const checkboxes = document.querySelectorAll(".file-checkbox")
    const allChecked = Array.from(checkboxes).every((checkbox) => checkbox.checked)
    checkboxes.forEach((checkbox) => {
      checkbox.checked = !allChecked
    })
    updateFileCounter()
  })

  // Event listener for the "Download" button
  document.getElementById("downloadBtn").addEventListener("click", () => {
    // Show download progress indicator
    const downloadBtn = document.getElementById("downloadBtn")
    const originalBtnText = downloadBtn.innerHTML
    downloadBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Preparing...
    `
    downloadBtn.disabled = true

    // Extract course name from the page title or URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      let courseName = "LearnWebCourse"

      // Try to extract course name from the page title
      if (tabs[0].title) {
        const titleMatch = tabs[0].title.match(/^(.*?)(?:\s*-\s*|:)/)
        if (titleMatch && titleMatch[1]) {
          courseName = sanitizeCourseName(titleMatch[1])
        }
      }

      const selectedFiles = []
      document.querySelectorAll(".file-checkbox:checked").forEach((checkbox) => {
        selectedFiles.push({
          url: checkbox.dataset.url,
          filename: checkbox.dataset.filename,
          section: checkbox.dataset.section || "General",
        })
      })

      // Send message to background script to start downloads
      try {
        chrome.runtime.sendMessage(
          {
            action: "download_files",
            files: selectedFiles,
            courseName: courseName,
          },
          (response) => {
            // Check for runtime error first
            if (chrome.runtime.lastError) {
              console.error("Message sending error:", chrome.runtime.lastError)
              showErrorMessage("Communication error: " + chrome.runtime.lastError.message)
              downloadBtn.innerHTML = originalBtnText
              downloadBtn.disabled = false
              return
            }

            if (response && response.success) {
              // Show success message
              const downloadInfo = document.createElement("div")
              downloadInfo.className = "download-info"
              downloadInfo.innerHTML = `
                <div class="success-message">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <div>
                    <p>Download started!</p>
                    <p class="text-sm text-muted-foreground">Files will be saved to: <span class="font-medium">${response.folderName}</span></p>
                  </div>
                </div>
              `

              // Replace the file list with the success message
              const fileList = document.querySelector(".file-list")
              fileList.innerHTML = ""
              fileList.appendChild(downloadInfo)

              // Update button text
              downloadBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Downloaded</span>
              `

              // Disable other controls
              document.getElementById("selectAllBtn").disabled = true
            } else {
              // Show error and restore button
              showErrorMessage(response && response.error ? response.error : "Unknown error occurred")
              downloadBtn.innerHTML = originalBtnText
              downloadBtn.disabled = false
            }
          },
        )
      } catch (error) {
        console.error("Error sending message:", error)
        showErrorMessage("Failed to start download: " + error.message)
        downloadBtn.innerHTML = originalBtnText
        downloadBtn.disabled = false
      }
    })
  })
})

/**
 * Shows an error message to the user
 * @param {string} message - The error message to display
 */
function showErrorMessage(message) {
  const errorDiv = document.createElement("div")
  errorDiv.className = "error-message"
  errorDiv.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <p>${message}</p>
  `

  // Show the error message
  const fileList = document.querySelector(".file-list")
  if (fileList) {
    // Append to the top of the file list
    fileList.insertBefore(errorDiv, fileList.firstChild)

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode === fileList) {
        fileList.removeChild(errorDiv)
      }
    }, 5000)
  } else {
    alert(message) // Fallback if file list not found
  }
}

/**
 * Extracts file links from the current page.
 * @returns {Array} Array of file link objects with url and filename properties.
 */
function extractFileLinks() {
  try {
    const sections = []
    const sectionHeaders = document.querySelectorAll(".course-section-header")

    if (sectionHeaders.length === 0) {
      return [] // No sections found
    }

    sectionHeaders.forEach((section) => {
      // Make sure we have the section title element
      const titleElement = section.querySelector("h3 a")
      if (!titleElement) return

      const sectionTitle = titleElement.innerText.trim()
      const fileLinks = []

      // Make sure the section has a next element sibling
      if (!section.nextElementSibling) return

      // Find all resource links in this section
      const resourceLinks = section.nextElementSibling.querySelectorAll('a[href*="mod/resource/view.php?id="]')
      resourceLinks.forEach((link) => {
        fileLinks.push({
          url: link.href,
          filename: link.innerText.trim() + ".pdf",
          section: sectionTitle,
        })
      })

      if (fileLinks.length > 0) {
        sections.push({ title: sectionTitle, files: fileLinks })
      }
    })

    return sections
  } catch (error) {
    console.error("Error extracting file links:", error)
    return [] // Return empty array on error
  }
}

/**
 * Displays the extracted file links in the popup.
 * @param {Array} sections - Array of section objects with title and files properties.
 */
function displayFileLinks(sections) {
  const fileList = document.querySelector(".file-list")
  fileList.innerHTML = "" // Clear any existing content

  if (!sections || sections.length === 0) {
    displayEmptyState()
    return
  }

  sections.forEach((section) => {
    const sectionDiv = document.createElement("div")
    sectionDiv.className = "section collapsed" // Start collapsed

    const sectionHeader = document.createElement("div")
    sectionHeader.className = "section-header"

    const sectionCheckbox = document.createElement("input")
    sectionCheckbox.type = "checkbox"
    sectionCheckbox.className = "section-checkbox"
    sectionCheckbox.addEventListener("change", () => {
      const checkboxes = sectionDiv.querySelectorAll(".file-checkbox")
      checkboxes.forEach((checkbox) => {
        checkbox.checked = sectionCheckbox.checked
      })
      updateFileCounter()
    })

    const sectionTitle = document.createElement("h3")
    sectionTitle.innerText = section.title

    sectionHeader.appendChild(sectionCheckbox)
    sectionHeader.appendChild(sectionTitle)
    sectionDiv.appendChild(sectionHeader)

    section.files.forEach((file) => {
      const fileItem = document.createElement("div")
      fileItem.className = "file-item"

      const checkboxWrapper = document.createElement("div")
      checkboxWrapper.className = "checkbox-wrapper"

      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.className = "file-checkbox"
      checkbox.dataset.url = file.url
      checkbox.dataset.filename = file.filename
      checkbox.dataset.section = section.title
      checkbox.addEventListener("change", updateFileCounter)

      checkboxWrapper.appendChild(checkbox)

      const fileIcon = document.createElement("div")
      fileIcon.className = "file-icon"
      fileIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
          <polyline points="13 2 13 9 20 9"></polyline>
        </svg>
      `

      const fileName = document.createElement("div")
      fileName.className = "file-name"
      fileName.textContent = file.filename

      fileItem.appendChild(checkboxWrapper)
      fileItem.appendChild(fileIcon)
      fileItem.appendChild(fileName)
      sectionDiv.appendChild(fileItem)
    })
    fileList.appendChild(sectionDiv)
  })

  // Add event listeners for collapsing sections
  document.querySelectorAll(".section-header").forEach((header) => {
    header.addEventListener("click", (e) => {
      // Don't toggle if clicking on the checkbox
      if (e.target.type !== "checkbox") {
        const section = header.parentElement
        section.classList.toggle("collapsed")
      }
    })
  })

  updateFileCounter()
}

/**
 * Updates the file counter display and the state of the download button.
 */
function updateFileCounter() {
  const total = document.querySelectorAll(".file-checkbox").length
  const selected = document.querySelectorAll(".file-checkbox:checked").length

  document.getElementById("selectedCount").textContent = selected
  document.getElementById("totalCount").textContent = total

  const downloadBtn = document.getElementById("downloadBtn")
  downloadBtn.disabled = selected === 0

  // Update section checkboxes based on their file checkboxes
  document.querySelectorAll(".section").forEach((section) => {
    const sectionCheckbox = section.querySelector(".section-checkbox")
    const fileCheckboxes = section.querySelectorAll(".file-checkbox")

    if (fileCheckboxes.length === 0) return

    const allChecked = Array.from(fileCheckboxes).every((checkbox) => checkbox.checked)
    const someChecked = Array.from(fileCheckboxes).some((checkbox) => checkbox.checked)

    sectionCheckbox.checked = allChecked
    sectionCheckbox.indeterminate = someChecked && !allChecked
  })
}

/**
 * Displays an empty state message when no files are found.
 * @param {string} message - Optional custom message to display
 */
function displayEmptyState(message) {
  const fileList = document.querySelector(".file-list")
  fileList.innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
        <polyline points="13 2 13 9 20 9"></polyline>
      </svg>
      <p>${message || "No files found on this page"}</p>
      <p class="hint">Navigate to a LearnWeb course page to see and download available files</p>
    </div>
  `
}

/**
 * Sanitizes a course name for use in a folder name.
 * @param {string} name - The original course name.
 * @returns {string} - The sanitized course name.
 */
function sanitizeCourseName(name) {
  return name
    .trim()
    .replace(/[<>:"/\\|?*]+/g, "_")
    .replace(/[\s]+/g, "_")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "_")
    .substring(0, 50) // Limit length to avoid very long folder names
}


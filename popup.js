document.addEventListener("DOMContentLoaded", () => {

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "downloads_completed") {
      window.close();
    } else if (message.action === "sections_data") {
      if (message.sections && message.sections.length > 0) {
        displayFileLinks(message.sections, message.courseName); // Pass courseName here
      } else {
        displayEmptyState();
      }
    }
  });

  // Query the active tab and execute the script to extract file links
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  
    if (!tabs || !tabs[0] || !tabs[0].id) {
      console.error("No active tab found or tab ID is missing."); // Log an error if no tab is found
      displayEmptyState("Could not access the current tab. Please try again.");
      return;
    }
    
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: extractFileLinks,
      },
      (results) => {
        if (chrome.runtime.lastError) {
          console.error("Script execution error:", chrome.runtime.lastError); // Log any script execution errors
          displayEmptyState("Could not extract files from this page: " + chrome.runtime.lastError.message);
          return;
        }
  
        if (results && results[0] && results[0].result) {
          displayFileLinks(results[0].result.sections, results[0].result.courseName);
        } else {
          console.warn("No results found or results are empty."); // Log a warning if no results are found
          displayEmptyState();
        }
      }
    );
  });

  // Event listener for the "Select All" button
  document.getElementById("selectAllBtn").addEventListener("click", () => {
    const checkboxes = document.querySelectorAll(".file-checkbox");
    const allChecked = Array.from(checkboxes).every((checkbox) => checkbox.checked);
    checkboxes.forEach((checkbox) => {
      checkbox.checked = !allChecked;
    });
    updateFileCounter();
  });

  // Event listener for the "Download" button
  document.getElementById("downloadBtn").addEventListener("click", () => {
    const downloadBtn = document.getElementById("downloadBtn");
    const originalBtnText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Preparing...
    `;
    downloadBtn.disabled = true;

    const selectedFiles = [];
    document.querySelectorAll(".file-checkbox:checked").forEach((checkbox) => {
      selectedFiles.push({
        url: checkbox.dataset.url,
        filename: checkbox.dataset.filename,
        section: checkbox.dataset.section || "General",
      });
    });

    const uniqueSections = new Set();
    selectedFiles.forEach((file) => {
      uniqueSections.add(file.section);
    });
    const totalSections = uniqueSections.size;

    Name = document.getElementById("courseName").textContent;

    try {
      chrome.runtime.sendMessage(
        {
          action: "download_files",
          files: selectedFiles,
          courseName: Name,
          totalSections: totalSections,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Message sending error:", chrome.runtime.lastError);
            showErrorMessage("Communication error: " + chrome.runtime.lastError.message);
            downloadBtn.innerHTML = originalBtnText;
            downloadBtn.disabled = false;
            return;
          }

          if (response && response.success) {
            const downloadInfo = document.createElement("div");
            downloadInfo.className = "download-info";
            downloadInfo.innerHTML = `
              <div class="success-message">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <div>
                  <p>Download started!</p>
                  <p class="text-sm text-muted-foreground">Files will be saved to: <span class="font-medium">${response.folderName}</span></p>
                  <p class="text-sm text-muted-foreground">Popup will close automatically when downloads complete</p>
                </div>
              </div>
            `;

            const fileList = document.querySelector(".file-list");
            fileList.innerHTML = "";
            fileList.appendChild(downloadInfo);

            downloadBtn.innerHTML = `
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 13l4 4L19 7"></path>
              </svg>
              <span>Downloading...</span>
            `;

            document.getElementById("selectAllBtn").disabled = true;
          } else {
            showErrorMessage(response && response.error ? response.error : "Unknown error occurred");
            downloadBtn.innerHTML = originalBtnText;
            downloadBtn.disabled = false;
          }
        }
      );
    } catch (error) {
      console.error("Error sending message:", error);
      showErrorMessage("Failed to start download: " + error.message);
      downloadBtn.innerHTML = originalBtnText;
      downloadBtn.disabled = false;
    }
  });
});

/**
 * Shows an error message to the user
 * @param {string} message - The error message to display
 */
function showErrorMessage(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <p>${message}</p>
  `;

  const fileList = document.querySelector(".file-list");
  if (fileList) {
    fileList.insertBefore(errorDiv, fileList.firstChild);
    setTimeout(() => {
      if (errorDiv.parentNode === fileList) {
        fileList.removeChild(errorDiv);
      }
    }, 5000);
  } else {
    alert(message);
  }
}

/**
 * Extracts file links from the current page.
 * @returns {Object} An object containing an array of section objects with title and files properties, and a courseName string.
 */
function extractFileLinks() {
  try {
    const sections = [];
    const sectionHeaders = document.querySelectorAll(".course-section-header");

    const breadcrumbElements = document.querySelectorAll("ol.breadcrumb li.breadcrumb-item");
    const breadcrumbDate = Array.from(breadcrumbElements).map(element => element.innerText.trim());
  
    let pageTitleElement = "";
    let courseSemsterDate = "";
    let semester = "";

    console.log("breadcrumbDate", breadcrumbDate);
    
    if (breadcrumbDate) {
      courseSemsterDate = breadcrumbDate[2];
      console.log("courseInfoText", courseSemsterDate);
      console.log("breadcrumbDate[3]", breadcrumbDate[3]);
      if (breadcrumbDate[3]) {
      // Get the course name from breadcrumbDate[3]
      pageTitleElement = breadcrumbDate[3];
      
      // Clean up: remove year/number patterns
      pageTitleElement = pageTitleElement.replace(/[-_]?\d+_?\d*$/g, '');
      
      // Check for semester type in courseInfoText
      const semesterRegex = /(WiSe|SoSe)/i;
      const semesterMatch = courseSemsterDate.split(semesterRegex);
      
      // Add semester type suffix based on match
      if (semesterMatch) {
        const semesterType = semesterMatch[1].toUpperCase();
        if (semesterType === 'SOSE') {
          const year = semesterMatch[2].length === 4 ? semesterMatch[2].substring(2) : semesterMatch[2];
          semester = `${semesterType} ${year}`;
        } else if (semesterType === 'WISE') {
          console.log("semesterMatch[2]", semesterMatch[2]);
            const yearStr = semesterMatch[2];
            const firstYear = yearStr.includes('/') ? 
            yearStr.split('/')[0].slice(-2) : 
            (yearStr.length === 4 ? yearStr.substring(2) : yearStr);
          console.log("firstYear", firstYear);
          const secondYear = (parseInt(firstYear) + 1).toString().padStart(2, '0').slice(-2);
          console.log("secondYear", secondYear);
          semester = `${semesterType} ${firstYear}/${secondYear}`;
        }
      }
      }
    }
    
    if (semester) {
      pageTitleElement += ` - ${semester}`;
    }

    let courseName = "LearnWebCourse";
    if (pageTitleElement) {
      // Use the full page title as the course name
      courseName = pageTitleElement.trim();
    }

    if (sectionHeaders.length === 0) {
      return { sections: [], courseName: courseName };
    }

    sectionHeaders.forEach((section) => {
      const titleElement = section.querySelector("h3 a");
      if (!titleElement) return;

      const sectionTitle = titleElement.innerText.trim();
      const fileLinks = [];

      if (!section.nextElementSibling) return;

      const resourceLinks = section.nextElementSibling.querySelectorAll('a[href*="mod/resource/view.php?id="]');
      resourceLinks.forEach((link) => {
        fileLinks.push({
          url: link.href,
          filename: link.innerText.trim() + ".pdf",
          section: sectionTitle,
        });
      });

      if (fileLinks.length > 0) {
        sections.push({ title: sectionTitle, files: fileLinks });
      }
    });

    return { sections: sections, courseName: courseName };
  } catch (error) {
    console.error("Error extracting file links:", error);
    return { sections: [], courseName: "LearnWebCourse" };
  }
}

/**
 * Displays the extracted file links in the popup.
 * @param {Array} sections - Array of section objects with title and files properties.
 */
function displayFileLinks(sections, Name) {
  const fileList = document.querySelector(".file-list");
  fileList.innerHTML = "";

  if (!Array.isArray(sections) || sections.length === 0) {
    displayEmptyState();
    return;
  }

  document.getElementById("courseName").textContent = `${Name}`;

  sections.forEach((section) => {
    const sectionDiv = document.createElement("div");
    sectionDiv.className = "section collapsed";

    const sectionHeader = document.createElement("div");
    sectionHeader.className = "section-header";

    const sectionCheckbox = document.createElement("input");
    sectionCheckbox.type = "checkbox";
    sectionCheckbox.className = "section-checkbox";
    sectionCheckbox.addEventListener("change", () => {
      const checkboxes = sectionDiv.querySelectorAll(".file-checkbox");
      checkboxes.forEach((checkbox) => {
        checkbox.checked = sectionCheckbox.checked;
      });
      updateFileCounter();
    });

    const sectionTitle = document.createElement("h3");
    sectionTitle.innerText = section.title;

    sectionHeader.appendChild(sectionCheckbox);
    sectionHeader.appendChild(sectionTitle);
    sectionDiv.appendChild(sectionHeader);

    section.files.forEach((file) => {
      const fileItem = document.createElement("div");
      fileItem.className = "file-item";

      const checkboxWrapper = document.createElement("div");
      checkboxWrapper.className = "checkbox-wrapper";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "file-checkbox";
      checkbox.dataset.url = file.url;
      checkbox.dataset.filename = file.filename;
      checkbox.dataset.section = section.title;
      checkbox.addEventListener("change", updateFileCounter);

      checkboxWrapper.appendChild(checkbox);

      const fileIcon = document.createElement("div");
      fileIcon.className = "file-icon";
      fileIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
          <polyline points="13 2 13 9 20 9"></polyline>
        </svg>
      `;

      const fileName = document.createElement("div");
      fileName.className = "file-name";
      fileName.textContent = file.filename;

      fileItem.appendChild(checkboxWrapper);
      fileItem.appendChild(fileIcon);
      fileItem.appendChild(fileName);
      sectionDiv.appendChild(fileItem);
    });
    fileList.appendChild(sectionDiv);
  });

  document.querySelectorAll(".section-header").forEach((header) => {
    header.addEventListener("click", (e) => {
      if (e.target.type !== "checkbox") {
        const section = header.parentElement;
        section.classList.toggle("collapsed");
      }
    });
  });

  updateFileCounter();
}

/**
 * Updates the file counter display and the state of the download button.
 */
function updateFileCounter() {
  const total = document.querySelectorAll(".file-checkbox").length;
  const selected = document.querySelectorAll(".file-checkbox:checked").length;

  document.getElementById("selectedCount").textContent = selected;
  document.getElementById("totalCount").textContent = total;
  

  const downloadBtn = document.getElementById("downloadBtn");
  downloadBtn.disabled = selected === 0;

  document.querySelectorAll(".section").forEach((section) => {
    const sectionCheckbox = section.querySelector(".section-checkbox");
    const fileCheckboxes = section.querySelectorAll(".file-checkbox");

    if (fileCheckboxes.length === 0) return;

    const allChecked = Array.from(fileCheckboxes).every((checkbox) => checkbox.checked);
    const someChecked = Array.from(fileCheckboxes).some((checkbox) => checkbox.checked);

    sectionCheckbox.checked = allChecked;
    sectionCheckbox.indeterminate = someChecked && !allChecked;
  });
}

/**
 * Displays an empty state message when no files are found.
 * @param {string} message - Optional custom message to display
 */
function displayEmptyState(message) {
  const fileList = document.querySelector(".file-list");
  fileList.innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
        <polyline points="13 2 13 9 20 9"></polyline>
      </svg>
      <p>${message || "No files found on this page"}</p>
      <p class="hint">Navigate to a LearnWeb course page to see and download available files</p>
    </div>
  `;
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
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "_");
}

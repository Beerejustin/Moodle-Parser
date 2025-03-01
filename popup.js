/**
 * Event listener for DOMContentLoaded to initialize the popup.
 */
document.addEventListener("DOMContentLoaded", () => {
    // Query the active tab and execute the extractFileLinks function
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: extractFileLinks
      }, (results) => {
        if (results && results[0] && results[0].result) {
          displayFileLinks(results[0].result);
        } else {
          displayEmptyState();
        }
      });
    });
  
    // Event listener for the "Select All" button
    document.getElementById("selectAllBtn").addEventListener("click", () => {
      const checkboxes = document.querySelectorAll('.file-checkbox');
      const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
      checkboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
      });
      updateFileCounter();
    });
  
    // Event listener for the "Download" button
    document.getElementById("downloadBtn").addEventListener("click", () => {
      const selectedFiles = [];
      document.querySelectorAll('.file-checkbox:checked').forEach(checkbox => {
        selectedFiles.push({
          url: checkbox.dataset.url,
          filename: checkbox.dataset.filename
        });
      });
      chrome.runtime.sendMessage({ action: "download_files", files: selectedFiles });
    });
  });
  
  /**
   * Extracts file links from the current page.
   * @returns {Array} Array of file link objects with url and filename properties.
   */
  function extractFileLinks() {
    const sections = [];
    document.querySelectorAll('.course-section-header').forEach(section => {
      const sectionTitle = section.querySelector('h3 a').innerText.trim();
      const fileLinks = [];
      section.nextElementSibling.querySelectorAll('a[href*="mod/resource/view.php?id="]').forEach(link => {
        fileLinks.push({
          url: link.href,
          filename: link.innerText.trim() + ".pdf"
        });
      });
      if (fileLinks.length > 0) {
        sections.push({ title: sectionTitle, files: fileLinks });
      }
    });
    return sections;
  }
  
  /**
   * Displays the extracted file links in the popup.
   * @param {Array} sections - Array of section objects with title and files properties.
   */
  function displayFileLinks(sections) {
    const fileList = document.querySelector(".file-list");
    const emptyState = document.querySelector(".empty-state");
    fileList.innerHTML = ""; // Clear any existing content
  
    if (sections.length === 0) {
      displayEmptyState();
      return;
    }
  
    sections.forEach(section => {
      const sectionDiv = document.createElement("div");
      sectionDiv.className = "section";
  
      const sectionHeader = document.createElement("div");
      sectionHeader.className = "section-header";
  
      const sectionCheckbox = document.createElement("input");
      sectionCheckbox.type = "checkbox";
      sectionCheckbox.className = "section-checkbox";
      sectionCheckbox.addEventListener("change", () => {
        const checkboxes = sectionDiv.querySelectorAll('.file-checkbox');
        checkboxes.forEach(checkbox => {
          checkbox.checked = sectionCheckbox.checked;
        });
        updateFileCounter();
      });
  
      const sectionTitle = document.createElement("h3");
      sectionTitle.innerText = section.title;
  
      sectionHeader.appendChild(sectionCheckbox);
      sectionHeader.appendChild(sectionTitle);
      sectionDiv.appendChild(sectionHeader);
  
      section.files.forEach(file => {
        const fileItem = document.createElement("div");
        fileItem.className = "file-item";
  
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "file-checkbox";
        checkbox.dataset.url = file.url;
        checkbox.dataset.filename = file.filename;
        checkbox.addEventListener("change", updateFileCounter);
  
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
  
        fileItem.appendChild(checkbox);
        fileItem.appendChild(fileIcon);
        fileItem.appendChild(fileName);
        sectionDiv.appendChild(fileItem);
      });
      fileList.appendChild(sectionDiv);
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
  }
  
  /**
   * Displays an empty state message when no files are found.
   */
  function displayEmptyState() {
    const fileList = document.querySelector(".file-list");
    fileList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
          <polyline points="13 2 13 9 20 9"></polyline>
        </svg>
        <p>No files found on this page</p>
        <p class="hint">Navigate to the Learnweb Resource page to see available files</p>
      </div>
    `;
  }
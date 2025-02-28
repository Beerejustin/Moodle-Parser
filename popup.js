document.addEventListener("DOMContentLoaded", () => {
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
  
    document.getElementById("selectAllBtn").addEventListener("click", () => {
      const checkboxes = document.querySelectorAll('.file-checkbox');
      const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
      checkboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
      });
      updateFileCounter();
    });
  
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
  
  function extractFileLinks() {
    const fileLinks = [];
    document.querySelectorAll('a[href*="mod/resource/view.php?id="]').forEach(link => {
      fileLinks.push({
        url: link.href,
        filename: link.innerText.trim() + ".pdf"
      });
    });
    return fileLinks;
  }
  
  function displayFileLinks(fileLinks) {
    const fileList = document.querySelector(".file-list");
    const emptyState = document.querySelector(".empty-state");
    fileList.innerHTML = ""; // Clear any existing content
  
    if (fileLinks.length === 0) {
      displayEmptyState();
      return;
    }
  
    fileLinks.forEach(file => {
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
      fileList.appendChild(fileItem);
    });
  
    updateFileCounter();
  }
  
  function updateFileCounter() {
    const total = document.querySelectorAll(".file-checkbox").length;
    const selected = document.querySelectorAll(".file-checkbox:checked").length;
  
    document.getElementById("selectedCount").textContent = selected;
    document.getElementById("totalCount").textContent = total;
  
    const downloadBtn = document.getElementById("downloadBtn");
    downloadBtn.disabled = selected === 0;
  }
  
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
document.addEventListener("DOMContentLoaded", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: extractFileLinks
      }, (results) => {
        if (results && results[0] && results[0].result) {
          displayFileLinks(results[0].result);
        }
      });
    });
  
    document.getElementById("selectAllBtn").addEventListener("click", () => {
      document.querySelectorAll('.fileCheckbox').forEach(checkbox => {
        checkbox.checked = true;
      });
    });
  
    document.getElementById("downloadBtn").addEventListener("click", () => {
      const selectedFiles = [];
      document.querySelectorAll('.fileCheckbox:checked').forEach(checkbox => {
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
    const fileList = document.getElementById("fileList");
    fileLinks.forEach(file => {
      const div = document.createElement("div");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "fileCheckbox";
      checkbox.dataset.url = file.url;
      checkbox.dataset.filename = file.filename;
      div.appendChild(checkbox);
      div.appendChild(document.createTextNode(file.filename));
      fileList.appendChild(div);
    });
  }
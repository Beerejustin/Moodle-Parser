document.addEventListener("DOMContentLoaded", () => {
    const fileLinks = [];
    
    document.querySelectorAll('a[href*="mod/resource/view.php?id="]').forEach(link => {
      fileLinks.push({
        url: link.href,
        filename: link.innerText.trim() + ".pdf" // Adjust for different file types
      });
    });
  
    // Send links to background script
    chrome.runtime.sendMessage({ action: "download_files", files: fileLinks });
  });
  
document.addEventListener("DOMContentLoaded", () => {
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
  
    // Send sections and their files to the popup
    chrome.runtime.sendMessage({ action: "sections_data", sections: sections });
  });
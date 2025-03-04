// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // Create a MutationObserver to watch for changes in the DOM
  const observer = new MutationObserver((mutations, obs) => {
    const pageTitleElement = document.querySelector("h1.page-title");
    if (pageTitleElement) {
      // Extract the course name from the page title
      const courseName = pageTitleElement.innerText.trim();

      const sections = [];
      document.querySelectorAll(".course-section-header").forEach((section) => {
        const titleElement = section.querySelector("h3 a");
        if (!titleElement) return;

        const sectionTitle = titleElement.innerText.trim();
        const fileLinks = [];

        const nextElement = section.nextElementSibling;
        if (!nextElement) return;

        nextElement.querySelectorAll('a[href*="mod/resource/view.php?id="]').forEach((link) => {
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

      // Send sections and the course name to the popup
      chrome.runtime.sendMessage({
        action: "sections_data",
        sections: sections,
        courseName: courseName,
      });

      // Disconnect the observer once the element is found
      obs.disconnect();
    }
  });

  // Start observing the document with the configured parameters
  observer.observe(document, { childList: true, subtree: true });
});

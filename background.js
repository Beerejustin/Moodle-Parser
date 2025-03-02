chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "download_files") {
      message.files.forEach(file => {
          const originalFilename = file.filename;
          const sanitizedFilename = sanitizeFilename(originalFilename);
          console.log(`Original filename: ${originalFilename}, Sanitized filename: ${sanitizedFilename}`);
          chrome.downloads.download({
              url: file.url,
              filename: "MoodleDownloads/" + sanitizedFilename,
              saveAs: false
          }, (downloadId) => {
              if (chrome.runtime.lastError) {
                  console.error(`Download failed for ${sanitizedFilename}:`, chrome.runtime.lastError);
              } else {
                  console.log("Download started, ID:", downloadId);
              }
          });
      });
  }
});

/**
* Sanitizes a filename by removing or replacing invalid characters.
* @param {string} filename - The original filename.
* @returns {string} - The sanitized filename.
*/
function sanitizeFilename(filename) {
  return filename
      .replace(/[<>:"\/\\|?*]+/g, '_') // Replace invalid characters with underscores
      .replace(/[\s]+/g, '_') // Replace spaces with underscores
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '_'); // Replace control characters with underscores
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "download_files") {
    try {
      // Extract course name from the first file's section or use default
      const mainFolderName = sanitizeFilename(message.courseName || "LearnWebCourse");
      // Group files by section
      const filesBySection = {}

      message.files.forEach((file) => {
        if (!filesBySection[file.section]) {
          filesBySection[file.section] = []
        }
        filesBySection[file.section].push(file)
      })

      // Track downloads to show completion notification
      let completedDownloads = 0
      const totalDownloads = message.files.length
      const downloadIds = []

      // Download each file in its section folder
      Object.keys(filesBySection).forEach((section) => {
        const sectionFolder = sanitizeFilename(section)

        filesBySection[section].forEach((file) => {
          const originalFilename = file.filename
          
          // Split filename and extension if exists
          let basename = originalFilename;
          let extension = "";
          
          const lastDotIndex = originalFilename.lastIndexOf('.');
          if (lastDotIndex > 0) {
            basename = originalFilename.substring(0, lastDotIndex);
            extension = originalFilename.substring(lastDotIndex);
          } else {
            // Add .pdf if no extension
            extension = ".pdf";
          }
          
          // Sanitize the base filename only
          const sanitizedBasename = sanitizeFilename(basename);
          
          // Recombine with extension
          let finalFilename = sanitizedBasename + extension;
          
          // Ensure extension is lowercase
          finalFilename = finalFilename.replace(/\.PDF$/i, '.pdf');

          console.log(`Original filename: ${originalFilename}`)
          console.log(`Sanitized filename: ${finalFilename}`)
          console.log(`Full path: ${mainFolderName}/${sectionFolder}/${finalFilename}`)

          // Try to download with full path
          tryDownload({
            url: file.url,
            path: `${mainFolderName}/${sectionFolder}/${finalFilename}`,
            fallbacks: [
              // First fallback: simplified path with same filename
              `${mainFolderName}/${finalFilename}`,
              // Second fallback: even simpler timestamp-based filename
              `${mainFolderName}/file_${Date.now()}.pdf`
            ],
            onSuccess: (id) => {
              downloadIds.push(id);
            },
            onAllFailed: () => {
              // Count failed downloads to avoid waiting forever
              completedDownloads++;
              console.error(`All download attempts failed for ${originalFilename}`);
            }
          });
        });
      });

      // Set up a listener for download completion
      chrome.downloads.onChanged.addListener(function downloadListener(delta) {
        if (downloadIds.includes(delta.id) && delta.state && delta.state.current === "complete") {
          completedDownloads++

          // If all downloads are complete, show notification and signal popup to close
          if (completedDownloads === totalDownloads) {
            chrome.downloads.onChanged.removeListener(downloadListener)

            chrome.notifications.create({
              type: "basic",
              iconUrl: "logo128.png",
              title: "Downloads Complete",
              message: `All ${totalDownloads} files have been downloaded to the "${mainFolderName}" folder.`,
            })
            
            // Signal the popup to close itself
            chrome.runtime.sendMessage({ action: "downloads_completed" })
          }
        }
      })

      // Send response with download information
      sendResponse({
        success: true,
        folderName: mainFolderName,
        totalFiles: message.files.length,
      })
    } catch (error) {
      console.error("Error in download_files handler:", error)
      sendResponse({ success: false, error: error.message })
    }
  } else {
    // For unhandled message types, send a response to avoid port closure
    sendResponse({ success: false, error: "Unknown message action" })
  }

  // Return true to indicate we'll send a response asynchronously
  return true
})

/**
 * Attempts to download a file with multiple fallback paths if initial attempts fail
 * @param {Object} options - Download options
 * @param {string} options.url - File URL to download
 * @param {string} options.path - Primary download path
 * @param {Array<string>} options.fallbacks - Fallback paths to try if primary fails
 * @param {Function} options.onSuccess - Callback when download succeeds
 * @param {Function} options.onAllFailed - Callback when all attempts fail
 */
function tryDownload(options) {
  const { url, path, fallbacks = [], onSuccess, onAllFailed } = options;
  
  chrome.downloads.download(
    {
      url: url,
      filename: path,
      saveAs: false,
    },
    (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error(`Download failed for ${path}:`, chrome.runtime.lastError);
        
        // If we have fallbacks, try the next one
        if (fallbacks.length > 0) {
          const nextPath = fallbacks.shift();
          console.log(`Trying fallback path: ${nextPath}`);
          
          tryDownload({
            url,
            path: nextPath,
            fallbacks,
            onSuccess,
            onAllFailed
          });
        } else {
          // No more fallbacks, all attempts failed
          if (onAllFailed) onAllFailed();
        }
      } else if (downloadId) {
        console.log("Download started, ID:", downloadId, "Path:", path);
        if (onSuccess) onSuccess(downloadId);
      } else {
        // downloadId is falsy but no error - unlikely but handle it
        if (fallbacks.length > 0) {
          const nextPath = fallbacks.shift();
          tryDownload({ url, path: nextPath, fallbacks, onSuccess, onAllFailed });
        } else {
          if (onAllFailed) onAllFailed();
        }
      }
    }
  );
}

/**
 * Sanitizes a filename by removing or replacing invalid characters.
 * @param {string} filename - The original filename.
 * @returns {string} - The sanitized filename.
 */
function sanitizeFilename(filename) {
  if (!filename) return "unnamed";
  
  try {
    // First, normalize Unicode characters
    const normalized = filename.normalize('NFD');
    
    const sanitized = normalized
      // Replace special characters with ASCII equivalents - expand to cover more special chars
      .replace(/[äÄ]/g, 'ae')
      .replace(/[öÖ]/g, 'oe')
      .replace(/[üÜ]/g, 'ue')
      .replace(/[ß]/g, 'ss')
      // Replace invalid characters with underscores
      .replace(/[<>:"/\\|?*]+/g, "_") 
      // Replace spaces with underscores
      .replace(/[\s]+/g, "_")
      // Replace dots, commas, and semicolons with underscores
      .replace(/[.,;]+/g, "_")
      // Replace control characters with underscores
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "_")
      // Replace plus signs with underscores
      .replace(/[+]+/g, "_")
      // Replace multiple underscores with a single underscore
      .replace(/_+/g, "_")
      // Remove leading or trailing underscores
      .replace(/^_|_$/g, "")
      // Remove any other non-ASCII characters completely
      .replace(/[^\x00-\x7F]/g, "");
    
    // Limit filename length to avoid path too long errors (reduced from 50)
    const maxLength = 40;
    const truncated = sanitized.length > maxLength ? 
      sanitized.substring(0, maxLength) : sanitized;
    
    return truncated || "unnamed";
  } catch (error) {
    console.error("Error sanitizing filename:", error);
    return `unnamed_${Date.now()}`;
  }
}
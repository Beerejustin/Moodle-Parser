chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "download_files") {
    try {
      // Extract course name from the first file's section or use default
      const mainFolderName = message.courseName || "LearnWebCourse";
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
          const sanitizedFilename = sanitizeFilename(originalFilename)

          console.log(`Original filename: ${originalFilename}`)
          console.log(`Sanitized filename: ${sanitizedFilename}`)

          chrome.downloads.download(
            {
              url: file.url,
              filename: `${mainFolderName}/${sectionFolder}/${sanitizedFilename}`,
              saveAs: false,
            },
            (downloadId) => {
              if (chrome.runtime.lastError) {
                console.error(`Download failed for ${sanitizedFilename}:`, chrome.runtime.lastError)
              } else if (downloadId) {
                console.log("Download started, ID:", downloadId)
                downloadIds.push(downloadId)
              }
            },
          )
        })
      })

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
 * Sanitizes a filename by removing or replacing invalid characters.
 * @param {string} filename - The original filename.
 * @returns {string} - The sanitized filename.
 */
function sanitizeFilename(filename) {
  const sanitized = filename
    .replace(/[<>:"/\\|?*]+/g, "_") // Replace invalid characters with underscores
    .replace(/[\s]+/g, "_") // Replace spaces with underscores
    .replace(/[.,]+/g, "_") // Replace dots and commas with underscores
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "_") // Replace control characters with underscores
    .replace(/[+]+/g, "_") // Replace plus signs with underscores
    .replace(/_+/g, "_") // Replace multiple underscores with a single underscore
    .replace(/^_|_$/g, ""); // Remove leading or trailing underscores

  console.log(`Sanitized filename: ${sanitized}`);
  return sanitized;
}
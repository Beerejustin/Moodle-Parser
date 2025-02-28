chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "download_files") {
      message.files.forEach(file => {
        chrome.downloads.download({
          url: file.url,
          filename: "MoodleDownloads/" + file.filename,
          saveAs: false
        });
      });
    }
  });
  
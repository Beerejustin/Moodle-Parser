# LearnWeb File Downloader

This Browser extension allows users to better download files from a LearnWeb course page. It provides a user-friendly interface to select and download files in bulk, organized by sections.

## Features

- **All in one File Extraction**: Extracts all downloadable files from the current LearnWeb course page.
- **Bulk Download**: Allows users to select multiple files or entire sections for download.
- **Organized by Sections**: Files are grouped by their respective sections for easy navigation.
- **User-Friendly Interface**: Simple and intuitive popup interface with checkboxes for selection.
- **Dark Mode Support**: Automatically adapts to the system's dark mode settings.

## Installation

1. Clone this repository or download the ZIP file.

    ```sh
    git clone https://github.com/Beerejustin/Moodle-Parser.git
    ```

2. Open your browser and navigate to [chrome://extensions/](http://_vscodecontentref_/1).

3. Enable "Developer mode".

4. Click "Load unpacked" and select the directory where you cloned or extracted the repository.

## Usage

1. Navigate to a LearnWeb course page.

2. Click on the LearnWeb File Downloader extension icon in the browser's toolbar and pin it.

3. The popup will display all available files organized by sections.

4. Select the files or sections you want to download.

5. Click the "Download" button to start the download process.

## Files

- **background.js**: Handles the download functionality.
- **content.js**: Extracts file links from the LearnWeb page.
- **manifest.json**: Defines the extension's metadata and permissions.
- **popup.html**: The HTML structure of the extension's popup interface.
- **popup.css**: Styles for the popup interface.
- **popup.js**: Manages the popup's functionality, including file selection and download initiation.

## Permissions

- **downloads**: Required to download files.
- **activeTab**: Required to interact with the current LearnWeb page.
- **scripting**: Required to execute scripts on the LearnWeb page.
- **storage**: Required to store user preferences (if any).
- **host_permissions**: Limited to `https://www.uni-muenster.de/LearnWeb/learnweb2/*` to ensure it only runs on LearnWeb pages.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgments

Thanks to the LearnWeb platform for providing a structured course environment.

Inspired by the need for a more efficient way to download course materials.
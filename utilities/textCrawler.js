/**
 * MASTER TEXT CRAWLER - v1.0
 * Recursively scans a Drive folder and all subfolders,
 * finds every .txt file, and appends all text into one master file.
 * Ideal for creating a unified mirror archive of text-only content.
 */

/**
 * Crawls all .txt files in a folder hierarchy and combines them into a single master file.
 * @param {string} rootFolderId - The ID of the top-level folder to crawl (defaults to ROOT_ID constant)
 * @param {string} outputFileName - Optional custom output filename
 * @returns {GoogleAppsScript.Drive.File} The created master file
 */
function crawlAllTxtFiles(rootFolderId, outputFileName) {
  const ROOT_ID = rootFolderId || '1WGuCy9eABxftFlqOIggsGpDwgP41cEf6'; // replace with your top-level folder ID
  const OUTPUT_NAME = outputFileName || `Text_Mirror_Full_${new Date().toISOString().slice(0, 10)}.txt`;
  const folder = DriveApp.getFolderById(ROOT_ID);
  let masterContent = '';
  let fileCount = 0;

  function crawl(currentFolder) {
    const files = currentFolder.getFilesByType(MimeType.PLAIN_TEXT);
    while (files.hasNext()) {
      const file = files.next();
      const text = file.getBlob().getDataAsString();
      masterContent += `\n\n──────────────────────────────\n${file.getName()}\n──────────────────────────────\n${text}`;
      fileCount++;
    }

    const subfolders = currentFolder.getFolders();
    while (subfolders.hasNext()) {
      crawl(subfolders.next());
    }
  }

  crawl(folder);

  const outputFile = folder.createFile(OUTPUT_NAME, masterContent, MimeType.PLAIN_TEXT);
  Logger.log(`Created master file: ${outputFile.getName()} in ${folder.getName()} (${fileCount} files merged)`);

  return outputFile;
}

/**
 * Wrapper function for running from Apps Script UI with default settings.
 * Edit the ROOT_ID below to set your default folder.
 */
function runTextCrawler() {
  const DEFAULT_FOLDER_ID = '1WGuCy9eABxftFlqOIggsGpDwgP41cEf6'; // Set your default folder ID here
  crawlAllTxtFiles(DEFAULT_FOLDER_ID);
}

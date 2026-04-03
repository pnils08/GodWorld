function testOpen() {
const ss = SpreadsheetApp.openById('1MVjJAPWr5pDzivMj04nHsHD8hwO5UlU5AIZBHSZ9Nss');
Logger.log('Opened: ' + ss.getName());
}
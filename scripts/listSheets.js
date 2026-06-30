const sheets = require('../lib/sheets');
require('../lib/env');

async function main() {
  const sheetList = await sheets.listSheets();
  console.log(sheetList);
}
main().catch(console.error);

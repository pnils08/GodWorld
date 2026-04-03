function buildNodeRegistry() {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheet = ss.getSheetByName("Federation_Nodes") || ss.insertSheet("Federation_Nodes");
sheet.clearContents();

// Header row
sheet.appendRow(["Node Name", "Role", "Status", "Last Sync", "Heartbeat", "Linked Project"]);

// Define the nodes manually or via an array pull from your Access manifest
const nodes = [
["Riley_Access", "Administrative Control / Scheduler", "Active", new Date(), "✓", "https://script.google.com/..."],
["Riley_System_Log", "Core Event Logger", "Active", new Date(), "✓", "https://script.google.com/..."],
["Population_Ledger", "Citizen Registry", "Pending", "", "⚠", "https://script.google.com/..."],
["Civic_Ledger", "Administrative Bridge", "Active", new Date(), "✓", "https://script.google.com/..."],
["Wild_Binder", "Ledger Formatter & Self-Healing Core", "Active", new Date(), "✓", "https://script.google.com/..."],
["Wild_Media_Newswire", "Media Distribution Node", "Active", new Date(), "✓", "https://script.google.com/..."],
["Slayer_Syndicate", "Cultural / Media Analysis", "Active", new Date(), "✓", "https://script.google.com/..."]
];

// Write the node data to the sheet
sheet.getRange(2, 1, nodes.length, nodes[0].length).setValues(nodes);

// Optional: Add some visual formatting
sheet.getRange("A1:F1").setFontWeight("bold").setBackground("#333333").setFontColor("#ffffff");
sheet.autoResizeColumns(1, 6);
}

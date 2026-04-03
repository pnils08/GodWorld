/**
* Master sequence for Riley’s Population Ledger
* Executes lineage, relationship, and event audit in correct order.
*/
function runPopulationAuditCycle() {
try {
Logger.log('🧬 Phase 2 – Population Audit Cycle started…');

// 1️⃣ Update lineage base
updateLineageLedger();
Utilities.sleep(5000); // allow sheet write sync

// 2️⃣ Link families after lineage is refreshed
updateFamilyLinks();
Utilities.sleep(5000);

// 3️⃣ Detect and log population events (births, marriages, deaths)
detectPopulationEvents();

// 4️⃣ Confirmation log
Logger.log('✅ Population Audit Cycle completed successfully.');
} catch (err) {
Logger.log(`❌ Population Audit Cycle error: ${err.message}`);
}
}

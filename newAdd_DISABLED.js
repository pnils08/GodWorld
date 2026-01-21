//
// newAdd.gs — Safe clean rebuild
// Purpose: placeholder file to prevent auto-run errors from undefined calls

function addSimulationEntitySafe() {
try {
Logger.log("Simulation Entity handler temporarily disabled.");
} catch (e) {
Logger.log("Error bypassed: " + e);
}
}
//
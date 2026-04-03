function setupHeartbeat() {
ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
ScriptApp.newTrigger('reportNodeStatus')
.timeBased()
.everyDays(1)
.atHour(2)
.create();
reportNodeStatus(); // run immediately once
}

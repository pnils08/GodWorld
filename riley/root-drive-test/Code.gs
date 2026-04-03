function listStructure() {
const root = DriveApp.getFolderById("1vOPo9Y26FpanhmQIdsbG1TbTvGX9YYQ_");
Logger.log("Root: " + root.getName());
const level1 = root.getFolders();
while (level1.hasNext()) {
const f1 = level1.next();
Logger.log(" - " + f1.getName());
const level2 = f1.getFolders();
while (level2.hasNext()) {
const f2 = level2.next();
Logger.log(" → " + f1.getName() + "/" + f2.getName());
const level3 = f2.getFolders();
while (level3.hasNext()) {
const f3 = level3.next();
Logger.log(" ↳ " + f1.getName() + "/" + f2.getName() + "/" + f3.getName());
}
}
}
}
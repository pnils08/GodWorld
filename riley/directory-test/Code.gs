function testFolders() {
const ids = {
GW4_MasterVault: "1vOPo9Y26FpanhmQIdsbG1TbTvGX9YYQ_",
Core: "1OKmAOff8bYCtiI0v1uG6m8v3urNrGZXV",
Steward: "1fB5W8cpmwzlXM4wJmFoD3cYZH15WzjhT",
Directives: "1MooEPoLtoe_U6PyBayl3FRn0wUVrQzDf",
Verification: "1jHw1TBsjLExtR8DaCFDIAtryibMXm0KF",
Reports: "1vOPo9Y26FpanhmQIdsbG1TbTvGX9YYQ_"
};

for (const [name, id] of Object.entries(ids)) {
try {
const f = DriveApp.getFolderById(id);
Logger.log(`✅ ${name}: ${f.getName()} (${f.getUrl()})`);
} catch (e) {
Logger.log(`❌ ${name}: ${e}`);
}
}
}
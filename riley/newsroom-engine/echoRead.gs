function echoRead(articleTitle) {
const files = DriveApp.searchFiles("title contains 'Universe_Mirror_Text' and mimeType='text/plain'");
if (!files.hasNext()) return "No Universe Mirror Text found.";

const file = files.next();
const text = file.getBlob().getDataAsString();
const pattern = new RegExp(articleTitle + "([\\s\\S]*?)(?=\\n[A-Z][a-z]+\\s—|$)", "i");
const match = text.match(pattern);
return match ? match[1].trim() : "Article preview not found.";
}
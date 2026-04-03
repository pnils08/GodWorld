function markAsRead(title) {
PropertiesService.getScriptProperties().setProperty(title, 'Read');
syncReaderQueue();
}


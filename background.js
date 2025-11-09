// Handle installation
chrome.runtime.onInstalled.addListener(function() {
  console.log('Extension installed');
  // Set default state
  chrome.storage.local.set({isRunning: false});
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'fetchData') {
    // Example API call - replace with your actual API endpoint
    fetch(request.url)
      .then(response => response.json())
      .then(data => {
        // Send the data back to the content script
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'dataFetched',
          data: data
        });
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
    return true; // Required to use sendResponse asynchronously
  }
});

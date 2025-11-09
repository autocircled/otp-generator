let isInteracting = false;
let interactionInterval;

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'startInteraction') {
    startInteraction();
  } else if (request.action === 'stopInteraction') {
    stopInteraction();
  } else if (request.action === 'dataFetched') {
    handleFetchedData(request.data);
  }
});

function startInteraction() {
  if (isInteracting) return;
  
  isInteracting = true;
  console.log('Starting interaction...');
  
  // Example: Interact with the page every 5 seconds
  interactionInterval = setInterval(() => {
    // Example: Click on a button with specific text
    clickButtonWithText('Click me');
    
    // Example: Fetch data from an API
    fetchDataFromAPI('https://api.example.com/data');
    
  }, 5000);
}

function stopInteraction() {
  if (!isInteracting) return;
  
  clearInterval(interactionInterval);
  isInteracting = false;
  console.log('Stopped interaction');
}

function clickButtonWithText(buttonText) {
  // Find all buttons on the page
  const buttons = document.getElementsByTagName('button');
  
  // Look for a button with the specified text
  for (let button of buttons) {
    if (button.textContent.trim() === buttonText) {
      button.click();
      console.log('Clicked button:', buttonText);
      return true;
    }
  }
  
  // If no button found, try other selectors
  const elements = document.querySelectorAll('a, input[type="button"], input[type="submit"]');
  for (let el of elements) {
    if (el.textContent && el.textContent.trim() === buttonText) {
      el.click();
      console.log('Clicked element with text:', buttonText);
      return true;
    }
  }
  
  console.log('Button not found:', buttonText);
  return false;
}

function fetchDataFromAPI(apiUrl) {
  // Send a message to the background script to fetch data
  chrome.runtime.sendMessage({
    action: 'fetchData',
    url: apiUrl
  });
}

function handleFetchedData(data) {
  console.log('Data received from API:', data);
  
  // Example: Update the page with the fetched data
  // This is just an example - modify according to your needs
  const resultDiv = document.createElement('div');
  resultDiv.style.position = 'fixed';
  resultDiv.style.bottom = '10px';
  resultDiv.style.right = '10px';
  resultDiv.style.padding = '10px';
  resultDiv.style.background = '#f0f0f0';
  resultDiv.style.border = '1px solid #ccc';
  resultDiv.style.zIndex = '9999';
  resultDiv.textContent = 'Data: ' + JSON.stringify(data).substring(0, 100) + '...';
  
  document.body.appendChild(resultDiv);
  
  // Remove the message after 5 seconds
  setTimeout(() => {
    resultDiv.remove();
  }, 5000);
}

// Load the saved state when the content script starts
chrome.storage.local.get(['isRunning'], function(result) {
  if (result.isRunning) {
    startInteraction();
  }
});

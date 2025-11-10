let isInteracting = false;
let interactionInterval;
let formSubmitted = false;
let counter = 0;
const phoneNOArray = ['+959769494838', '+959783806043', '+959750128934', '+959750996184', '+959780060465', '+959767747618', '+959785568238', '+959780214060', '+959790989491', '+959777333238'];

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log(request);
  if (request.action === 'startInteraction') {
    checkForExistingModal();
    setupModalCloser();
    startInteraction();
  } else if (request.action === 'stopInteraction') {
    stopInteraction();
  } else if (request.action === 'dataFetched') {
    handleFetchedData(request.data);
  } else if (request.action === 'loadData') {
    loadData();
  }
});

function loadData() {
  console.log('Loading data...');
}

function startInteraction() {
  console.log('isInteracting', isInteracting);
  if (isInteracting) return;
  
  isInteracting = true;
  console.log('Starting interaction...');
  const randomDelay = Math.floor(Math.random() * 10) + 30;
    console.log('Waiting for:', randomDelay, 'seconds');
  // Example: Interact with the page every 30 - 40 seconds
  interactionInterval = setTimeout(() => {
    // If form was already submitted and modal hasn't been closed yet, skip
    if (formSubmitted) {
      console.log('Waiting for modal to be closed...');
      return;
    }

    

    // Example: Click on a button with specific text
    // clickButtonWithText('Click me');
    
    // Example: Fetch phone number
    // fetchDataFromAPI('https://api.example.com/data');
    const ph_no = phoneNOArray[counter];
    counter++;
    const phoneInput = document.querySelector('input#contact-information-phone');
    const saveButton = Array.from(document.querySelectorAll('button[type="submit"]'))
      .find(button => button.textContent.trim() === 'Save');

    if (phoneInput && saveButton) {
      console.log('Form detected! Auto-filling...');
      console.log('Phone number:', ph_no, counter);
      console.log('Save button:', saveButton);
      
      phoneInput.value = ph_no;
      phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Optional: Add slight delay for any form validation
      setTimeout(() => {
        if (saveButton && !saveButton.disabled) {
          saveButton.click();
          console.log('Save button clicked!');
          formSubmitted = true; // Mark form as submitted
        } else if (saveButton && saveButton.disabled) {
          console.log('Save button is disabled, cannot click');
        } else {
          console.log('Save button not found');
        }
        formSubmitted = true; // Mark form as submitted
      }, 5000);
    
    } else {
      console.log("Form elements not found");
    }
  }, randomDelay * 1000);
}


function setupModalCloser() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        // console.log(node);
        if (node.nodeType === 1) { // Element node
          const closeButton = node.querySelector && node.querySelector('.bds-c-modal__close-button');
          if (closeButton) {
            setTimeout(() => {
              console.log('Modal appeared, attempting to close...');
              closeButton.click();
              console.log('Modal closed automatically');
  
              // Reset the flag to allow form fillup again
              setTimeout(() => {
                formSubmitted = false;
                isInteracting = false;
                console.log('Ready for next form submission');
                startInteraction();
              }, 10000);
            }, 5000);
          }
        }
      });
    });
  });

  // Observe all existing portal elements
  const portalElements = document.querySelectorAll('.bds-c-portal');
  portalElements.forEach(portal => {
    observer.observe(portal, {
      childList: true,
      subtree: true
    });
  });

  const portalObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.classList?.contains('bds-c-portal')) {
          console.log('New portal element detected, observing it...');
          observer.observe(node, {
            childList: true,
            subtree: true
          });
        }
      });
    });
  });

  portalObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  return { modalObserver: observer, portalObserver };
}

function checkForExistingModal() {
  const existingModal = document.querySelector('.bds-c-modal--is-open');
  if (existingModal) {
    console.log('Existing modal found, closing...');
    const closeButton = existingModal.querySelector('.bds-c-modal__close-button');
    if (closeButton) {
      closeButton.click();
      formSubmitted = false;
    }
  }
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

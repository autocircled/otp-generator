let isInteracting = false;
let interactionInterval;
let formSubmitted = false;

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request) {
  if (request.action === 'startInteraction') {
    checkForExistingModal();
    setupModalCloser();
    startInteraction();
  } else if (request.action === 'stopInteraction') {
    stopInteraction();
  } else if (request.action === 'dataFetched') {
    handleFetchedData(request.data);
  } else if (request.action === 'loadData') {
    chrome.storage.local.get(['apiKey'], function(result) {
      const API_KEY = result.apiKey;
      const apiUrl = `https://smsgen.net/api/init/${API_KEY}`;
      fetchDataFromAPI(apiUrl)
    });
  }
});

function startInteraction() {
  if (isInteracting) return;
  
  isInteracting = true;
  console.log('Starting interaction...');
  const randomDelay = Math.floor(Math.random() * 10) + 25;
    console.log('Waiting for:', randomDelay, 'seconds');
  // Interact with the page every 25 - 35 seconds
  interactionInterval = setTimeout(() => {
    // If form was already submitted and modal hasn't been closed yet, skip
    if (formSubmitted) {
      console.log('Waiting for modal to be closed...');
      return;
    }

    // Fetch phone number
    chrome.storage.local.get(['apiKey', 'country', 'operator'], function(result) {
      const API_KEY = result.apiKey;
      const country_id = result.country;
      const operator_id = result.operator;
      fetch_phone_number(API_KEY, country_id, operator_id);
    });
  }, randomDelay * 1000);
}

function fetch_phone_number(API_KEY, country_id, operator_id) {
  let ph_no;
  fetch(`https://smsgen.net/api/get-number/${API_KEY}?country_id=${country_id}&operator_id=${operator_id}`)
  .then(response => response.json())
  .then(data => {
    ph_no = data.data.phone_number;
    const phoneInput = document.querySelector('input#contact-information-phone');
    const saveButton = Array.from(document.querySelectorAll('button[type="submit"]'))
      .find(button => button.textContent.trim() === 'Save');

    if (phoneInput && saveButton) {
      console.log('Auto-filling By:', ph_no);
      
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
  });
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
  console.log("fetching data from api", apiUrl);
  // Send a message to the background script to fetch data
  chrome.runtime.sendMessage({
    action: 'fetchData',
    url: apiUrl
  });
}

function handleFetchedData(apiData) {
  console.log('Data received from API:', apiData);
  const countries = apiData.data.countries;
  const operators = apiData.data.operators;
  
  // Store countries and operators in local storage
  chrome.storage.local.set({ 
    countries: countries,
    operators: operators
  }, function() {
    console.log('Data stored successfully');
    // After storing, update the dropdowns
    updateCountryDropdown();
  });

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
  resultDiv.textContent = 'Data: ' + JSON.stringify(apiData).substring(0, 100) + '...';
  
  document.body.appendChild(resultDiv);
  
  // Remove the message after 5 seconds
  setTimeout(() => {
    resultDiv.remove();
  }, 5000);
}

function updateCountryDropdown() {
  chrome.storage.local.get(['countries'], function(result) {
    const countries = result.countries || [];
    const countrySelect = document.getElementById('country');
    
    // Clear existing options
    countrySelect.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a country';
    countrySelect.appendChild(defaultOption);
    
    // Add country options
    countries.forEach(country => {
      const option = document.createElement('option');
      option.value = country.id;
      option.textContent = `${country.name} (${country.phone_code})`;
      countrySelect.appendChild(option);
    });
    
    // Initialize Select2 after updating options
    $(countrySelect).select2();
  });
}
// Load the saved state when the content script starts
chrome.storage.local.get(['isRunning'], function(result) {
  if (result.isRunning) {
    startInteraction();
  }
});

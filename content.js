let isInteracting = false;
let interactionInterval;
let formSubmitted = false;

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request) {
  if (request.action === 'startInteraction') {
    setupWebsiteSpecificLogic();
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

async function clickEditButton() {
  // Find the personal details section first
  const personalDetails = document.querySelector('[data-testid="personal-details"]');
  if (!personalDetails) {
    return false;
  }
  
  // Find all buttons and filter for the one with exact 'Edit' text
  const buttons = Array.from(personalDetails.querySelectorAll('button.bds-c-btn'));
  const editButton = buttons.find(btn => {
    const label = btn.querySelector('.bds-c-btn__idle-content__label span');
    return label && label.textContent.trim() === 'Edit';
  });
  
  if (editButton) {
    console.log('Clicking Edit button in personal details...');
    editButton.click();
    await new Promise(resolve => setTimeout(resolve, 5000));
    return true;
  }

  return false;
}

function getCurrentWebsite() {
  // Returns the main domain without subdomains (e.g., 'example' from 'www.example.com')
  const hostname = window.location.hostname;
  // Remove 'www.' if present and get the main domain
  const domain = hostname.replace('www.', '');
  return domain;
}

function startInteraction() {
  if (isInteracting) return;
  isInteracting = true;

  chrome.storage.local.get(['apiKey', 'country', 'operator'], function(result) {
    const API_KEY = result.apiKey;
    const country_id = result.country;
    const operator_id = result.operator;
    
    interactionInterval = setTimeout(() => {
      // If form was already submitted and modal hasn't been closed yet, skip
      if (formSubmitted) {
        console.log('Waiting for modal to be closed...');
        return;
      }

      fetch_phone_number(API_KEY, country_id, operator_id);
    }, 5000);
  });  
}

function setupWebsiteSpecificLogic() {
  const currentWebsite = getCurrentWebsite();
    console.log(`Starting interaction on: ${currentWebsite}`);
    
    // Apply website-specific logic
    if (currentWebsite.includes('foodpanda') || currentWebsite.includes('foodora')) {
      checkForExistingModal();
      setupModalCloser();
    } else {
      console.log(`No specific handler for ${currentWebsite}`);
      // Add other website handlers here as needed
    }
}
  

async function fetch_phone_number(API_KEY, country_id, operator_id, retryCount = 0) {  
  try {
    const response = await fetch(`http://localhost:3099/api/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: API_KEY,
        country_id: country_id,
        operator_id: operator_id,
      }),
    });
    
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    let ph_no = data.phone_number;
    
    if (!ph_no) {
      return setTimeout(() => {
        fetch_phone_number(API_KEY, country_id, operator_id, retryCount + 1);
      }, 10000);
    }
    const currentWebsite = getCurrentWebsite();
    console.log(`Starting interaction on: ${currentWebsite}`);
    
    // Apply website-specific logic
    if (currentWebsite.includes('foodpanda') || currentWebsite.includes('foodora')) {
      await foodpanda(ph_no);
    } else {
      console.log(`No specific handler for ${currentWebsite}`);
      // Add other website handlers here as needed
    }

  } catch (error) {
    console.error('Error in fetch_phone_number:', error);
    return setTimeout(() => {
      fetch_phone_number(API_KEY, country_id, operator_id, retryCount + 1);
    }, 10000);
  }
}

async function foodpanda(ph_no) {
  // First try to click the Edit button
  await clickEditButton();

  const phoneInput = document.querySelector('input#contact-information-phone');
  const saveButton = Array.from(document.querySelectorAll('button[type="submit"]'))
    .find(button => button.textContent.trim() === 'Save');

  if (phoneInput && saveButton) {
    console.log('Auto-filling By:', ph_no);
    
    phoneInput.value = ph_no;
    phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Wait for form validation
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (saveButton && !saveButton.disabled) {
      saveButton.click();
      console.log('Save button clicked!');
      formSubmitted = true;
    } else if (saveButton && saveButton.disabled) {
      console.log('Save button is disabled, cannot click');
    } else {
      console.log('Save button not found');
    }
  } else {
    console.log("Form elements not found");
  }
}

function setupModalCloser() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          const closeButton = node.querySelector && node.querySelector('.bds-c-modal__close-button');
          if (closeButton) {
            chrome.storage.local.get(['delay'], function(result) {
              const delay = result.delay;
              setTimeout(() => {
                console.log('Modal appeared, attempting to close...');
                closeButton.click();
                console.log('Modal closed automatically');
    
                // Reset the flag to allow form fillup again
                formSubmitted = false;
                isInteracting = false;
                console.log('Ready for next form submission');
                startInteraction();
              }, delay * 1000);
            });
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

  // Observe for error banner and reload if found
  const errorBannerObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (!mutation.addedNodes) return;
      
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the node or any of its children is the error banner
          const errorBanner = node.matches('div[role="banner"].error-message') ? node : 
                            node.querySelector('div[role="banner"].error-message');
          
          if (errorBanner) {
            console.log('Error banner detected, starting new session...');
            // window.location.reload();
            setTimeout(() => {
              formSubmitted = false;
              isInteracting = false;
              console.log('Ready for next form submission');
              startInteraction();
            }, 5000);
          }
        }
      }
    });
  });

  // Start observing the document body for error banners
  errorBannerObserver.observe(document.body, {
    childList: true,
    subtree: true
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

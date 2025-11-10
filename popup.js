$(document).ready(function() {
  const otpWrapper = document.querySelector('.otp-wrapper');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDiv = document.getElementById('status');
  const countrySelect = document.getElementById('country');
  const operatorSelect = document.getElementById('operator');
  let isRunning = false;

  // Initialize Select2 with better configuration
  
  $(countrySelect).select2({
    placeholder: 'Select a country',
    allowClear: true,
    width: '100%',
    dropdownAutoWidth: true,
    dropdownParent: $(document.body) // Ensure proper z-index handling
  });

  $(operatorSelect).select2({
    placeholder: 'Select an operator',
    disabled: true,
    allowClear: true,
    // minimumResultsForSearch: Infinity, // Disable search for small lists
    width: '100%',
    dropdownAutoWidth: true,
    dropdownParent: $(document.body) // Ensure proper z-index handling
  });

  // Load data when popup opens
  loadData();

  function loadData() {
    chrome.storage.local.get(['countries', 'operators'], function(result) {
      if (result.countries && result.operators) {
        updateCountryDropdown(result.countries);
      } else {
        // If no data in storage, fetch it
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'loadData'
          });
        });
      }
    });
  }

  // Function to update country dropdown
  function updateCountryDropdown(countries) {
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
    $(countrySelect).on('change', function() {
      console.log('Change event was triggered!');
      console.log('Selected value:', $(this).val());
      updateOperatorDropdown($(this).val());
    });
    // Reinitialize Select2
    $(countrySelect).trigger('change');
  }

  // Function to update operator dropdown
  function updateOperatorDropdown(countryId) {
    console.log("tryingt to update operator dropdown")
    chrome.storage.local.get(['operators'], function(result) {
      const operators = result.operators || [];
      const countryOperators = operators.filter(op => op.country_id == countryId);
      
      // Clear existing options
      operatorSelect.innerHTML = '';
      
      // Add default option
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Select an operator';
      operatorSelect.appendChild(defaultOption);
      
      // Add operator options
      countryOperators.forEach(operator => {
        const option = document.createElement('option');
        option.value = operator.id;
        option.textContent = operator.name;
        operatorSelect.appendChild(option);
      });
      
      // Enable/disable operator select
      operatorSelect.disabled = countryOperators.length === 0;
      $(operatorSelect).on('change', function() {
        console.log('Change event was triggered!');
        console.log('Selected value:', $(this).val());
        updateUI();
      });
      $(operatorSelect).trigger('change');
    });
  }

  // Listen for data updates from background
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'dataFetched') {
      updateCountryDropdown(request.data.data.countries);
      // You can also update operators if needed
      chrome.storage.local.set({
        countries: request.data.data.countries,
        operators: request.data.data.operators
      });
    }
  });

  // Load the current state
  chrome.storage.local.get(['apiKey', 'isRunning', 'country', 'operator'], function(result) {
    apiKey = result.apiKey || '';
    isRunning = result.isRunning || false;
    if(!apiKey){
      otpWrapper.style.display = 'none';
      return;
    }
    // Set the country if it exists in storage
    if (result.country) {
      $(countrySelect).val(result.country).trigger('change');
      
      // After a small delay to allow the country change to process,
      // set the operator if it exists in storage
      setTimeout(() => {
        if (result.operator) {
          $(operatorSelect).val(result.operator).trigger('change');
        }
        updateUI();
      }, 100);
    } else {
      updateUI();
    }
  });

  $(startBtn).on('click', function() {
    const country = $(countrySelect).val();
    const operator = $(operatorSelect).val();
    console.log("country", country);
    console.log("operator", operator);
    
    if (!country) {
      statusDiv.textContent = 'Please select a country';
      statusDiv.style.color = 'red';
      return;
    }
    
    if (!operator) {
      statusDiv.textContent = 'Please select an operator';
      statusDiv.style.color = 'red';
      return;
    }
    
    console.log('Selected Country:', country);
    console.log('Selected Operator:', operator);
    
    isRunning = true;
    chrome.storage.local.set({
      isRunning: true,
      country: country,
      operator: operator
    });
    
    updateUI();
    statusDiv.textContent = 'Started with ' + 
      countrySelect.options[countrySelect.selectedIndex].text + ' - ' + 
      operatorSelect.options[operatorSelect.selectedIndex].text;
    statusDiv.style.color = 'green';
    
    // Send message to content script to start interaction
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'startInteraction'
      });
    });
  });

  $(stopBtn).on('click', function() {
    isRunning = false;
    chrome.storage.local.set({isRunning: false});
    updateUI();
    
    // Send message to content script to stop interaction
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'stopInteraction'});
    });
  });

  function updateUI() {
    // Enable/disable start button based on selection
    const country = $(countrySelect).val();
    const operator = $(operatorSelect).val();
    startBtn.disabled = !country || !operator || isRunning;
    stopBtn.disabled = !isRunning;
    if (isRunning) {
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      statusDiv.textContent = 'Running...';
      statusDiv.style.color = 'green';
    } else {
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      statusDiv.textContent = 'Stopped';
      statusDiv.style.color = 'red';
    }
  }
});

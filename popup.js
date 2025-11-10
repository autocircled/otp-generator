$(document).ready(function() {
  const otpWrapper = document.querySelector('.otp-wrapper');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDiv = document.getElementById('status');
  const countrySelect = document.getElementById('country');
  const operatorSelect = document.getElementById('operator');
  let isRunning = false;

  // Operator data based on country
  const operatorsByCountry = {
    'us': ['AT&T', 'Verizon', 'T-Mobile', 'Sprint'],
    'uk': ['O2', 'Vodafone', 'EE', 'Three'],
    'ca': ['Rogers', 'Bell', 'Telus', 'Freedom'],
    'au': ['Telstra', 'Optus', 'Vodafone AU'],
    'in': ['Airtel', 'Vodafone Idea', 'Jio', 'BSNL']
  };

  // Initialize Select2 with better configuration
  $(document).ready(function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      console.log(tabs);
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'loadData',
      });
    });
    // Initialize country select
    $(countrySelect).select2({
      placeholder: 'Select a country',
      allowClear: true,
      // minimumResultsForSearch: Infinity, // Disable search for small lists
      width: '100%',
      dropdownAutoWidth: true,
      dropdownParent: $(document.body) // Ensure proper z-index handling
    });

    // Initialize operator select
    $(operatorSelect).select2({
      placeholder: 'Select an operator',
      disabled: true,
      allowClear: true,
      minimumResultsForSearch: Infinity, // Disable search for small lists
      width: '100%',
      dropdownAutoWidth: true,
      dropdownParent: $(document.body) // Ensure proper z-index handling
    });
  });

  // Update operators when country changes
  $(countrySelect).on('change', function() {
    const country = this.value;
    
    // Save the country selection
    chrome.storage.local.set({ country: country });
    
    // Clear and disable operator dropdown
    $(operatorSelect).empty().append('<option value=""></option>').val('').trigger('change');
    $(operatorSelect).prop('disabled', !country);
    
    if (country && operatorsByCountry[country]) {
      // Add new options
      const options = operatorsByCountry[country].map(operator => ({
        id: operator.toLowerCase().replace(/\s+/g, '-'),
        text: operator
      }));
      
      $(operatorSelect).select2({
        data: [{id: '', text: 'Select Operator'}, ...options],
        placeholder: 'Select an operator',
        allowClear: true
      });
    }
    
    // Update UI state
    updateUI();
  });

  // Handle operator selection change
  $(operatorSelect).on('change', function() {
    const operator = this.value;
    // Save the operator selection
    if (operator) {
      chrome.storage.local.set({ operator: operator });
    }
    updateUI();
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

  startBtn.addEventListener('click', function() {
    const country = countrySelect.value;
    const operator = operatorSelect.value;
    
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
        action: 'startInteraction',
        country: country,
        operator: operator
      });
    });
  });

  stopBtn.addEventListener('click', function() {
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

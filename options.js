// Saves options to chrome.storage
function saveOptions() {
    const apiKey = document.getElementById('apiKey').value.trim();
    
    chrome.storage.local.set({ apiKey: apiKey }, function() {
        // Update status to let user know options were saved
        const status = document.getElementById('status');
        status.textContent = 'Options saved successfully!';
        status.className = 'success';
        status.style.display = 'block';
        
        // Clear status after 2 seconds
        setTimeout(function() {
            status.style.display = 'none';
        }, 2000);
    });
}

// Restores the previously saved API key
function restoreOptions() {
    chrome.storage.local.get(['apiKey'], function(result) {
        if (result.apiKey) {
            document.getElementById('apiKey').value = result.apiKey;
        }
    });
}

// Add event listeners when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);

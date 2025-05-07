// Configuration
const CONFIG = {
    // Maximum file size in bytes (10MB)
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    // Allowed file types
    ALLOWED_FILE_TYPES: ['.pdf', '.txt'],
    // n8n webhook URL with security token
    WEBHOOK_URL: 'https://ths-n8n-serv-u36821.vm.elestio.app/webhook-test/pdf-to-audio-upload',
    // Site origin for security checking
    ALLOWED_ORIGIN: 'tall-h.github.io',
    // Security token - simple protection against random usage
    SECURITY_TOKEN: 'jsx_' + btoa(navigator.userAgent.substring(0, 10) + new Date().getDay()).substring(0, 12),
    // Rate at which to update progress (ms)
    PROGRESS_UPDATE_INTERVAL: 100
};

// DOM Elements
const elements = {
    form: document.getElementById('uploadForm'),
    fileInput: document.getElementById('documentFile'),
    fileName: document.getElementById('fileName'),
    emailInput: document.getElementById('emailAddress'),
    submitButton: document.getElementById('submitButton'),
    progressContainer: document.getElementById('progressContainer'),
    progressBarFill: document.getElementById('progressBarFill'),
    progressPercentage: document.getElementById('progressPercentage'),
    feedbackArea: document.getElementById('feedbackArea'),
    fileError: document.getElementById('fileError'),
    emailError: document.getElementById('emailError')
};

// Initialize the application
function init() {
    // Add event listeners
    elements.form.addEventListener('submit', handleFormSubmit);
    elements.fileInput.addEventListener('change', handleFileChange);
    elements.emailInput.addEventListener('input', validateEmail);
    
    // Verify the origin to prevent misuse
    verifyOrigin();
}

// Verify that the site is being used from the correct origin
function verifyOrigin() {
    // This is a simple check that can be bypassed, but it helps prevent casual misuse
    if (!window.location.hostname.includes(CONFIG.ALLOWED_ORIGIN) && 
        !window.location.hostname.includes('localhost') && 
        !window.location.hostname.includes('127.0.0.1')) {
        
        // If running from an unauthorized domain, disable the form
        console.warn('Running from unauthorized domain');
        elements.submitButton.disabled = true;
        showFeedback('error', 'This form can only be used from the official website.');
    }
}

// Handle file input change
function handleFileChange(event) {
    const file = event.target.files[0];
    
    // Reset error message
    elements.fileError.textContent = '';
    
    if (file) {
        // Display file name
        elements.fileName.textContent = file.name;
        
        // Validate file type and size
        validateFile(file);
    } else {
        elements.fileName.textContent = 'No file chosen';
    }
}

// Validate the selected file
function validateFile(file) {
    // Check file size
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        elements.fileError.textContent = `File is too large. Maximum size is ${CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB.`;
        elements.fileInput.value = '';
        elements.fileName.textContent = 'No file chosen';
        return false;
    }
    
    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!CONFIG.ALLOWED_FILE_TYPES.includes(fileExtension)) {
        elements.fileError.textContent = `Invalid file type. Allowed types: ${CONFIG.ALLOWED_FILE_TYPES.join(', ')}`;
        elements.fileInput.value = '';
        elements.fileName.textContent = 'No file chosen';
        return false;
    }
    
    return true;
}

// Validate email input
function validateEmail() {
    const email = elements.emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (email === '') {
        elements.emailError.textContent = '';
        return false;
    }
    
    if (!emailRegex.test(email)) {
        elements.emailError.textContent = 'Please enter a valid email address.';
        return false;
    }
    
    elements.emailError.textContent = '';
    return true;
}

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Validate form inputs
    const file = elements.fileInput.files[0];
    if (!file || !validateFile(file) || !validateEmail()) {
        return;
    }
    
    // Prepare UI for submission
    setLoadingState(true);
    showFeedback('', '');
    
    // Create FormData object
    const formData = new FormData(elements.form);
    
    // Add security token to prevent unauthorized use
    formData.append('securityToken', CONFIG.SECURITY_TOKEN);
    formData.append('referrer', document.referrer || 'direct');
    
    try {
        // Start upload with progress tracking
        await uploadWithProgress(formData);
    } catch (error) {
        console.error('Error during upload:', error);
        showFeedback('error', 'An error occurred during upload. Please try again later.');
    } finally {
        setLoadingState(false);
    }
}

// Upload file with progress tracking
async function uploadWithProgress(formData) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Show progress container
        elements.progressContainer.hidden = false;
        
        // Set up progress tracking
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                updateProgress(percentComplete);
            }
        });
        
        // Handle response
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    console.log('Server response:', response);
                    showFeedback('success', 'Document successfully uploaded! You will receive the audio file in your email shortly.');
                    elements.form.reset();
                    elements.fileName.textContent = 'No file chosen';
                    resolve(response);
                } catch (error) {
                    console.log('Response was not JSON, but request was successful');
                    showFeedback('success', 'Document successfully uploaded! You will receive the audio file in your email shortly.');
                    elements.form.reset();
                    elements.fileName.textContent = 'No file chosen';
                    resolve({});
                }
            } else {
                let errorMessage = `Upload failed: ${xhr.status} ${xhr.statusText}`;
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    if (errorResponse && errorResponse.message) {
                        errorMessage = `Error: ${errorResponse.message}`;
                    }
                } catch (e) {
                    // Response was not JSON
                }
                showFeedback('error', errorMessage);
                reject(new Error(errorMessage));
            }
            
            // Hide progress container
            setTimeout(() => {
                elements.progressContainer.hidden = true;
                updateProgress(0);
            }, 1000);
        });
        
        // Handle network errors
        xhr.addEventListener('error', () => {
            showFeedback('error', 'A network error occurred. Please check your connection and try again.');
            elements.progressContainer.hidden = true;
            updateProgress(0);
            reject(new Error('Network error'));
        });
        
        // Handle timeouts
        xhr.addEventListener('timeout', () => {
            showFeedback('error', 'The upload timed out. Please try again later.');
            elements.progressContainer.hidden = true;
            updateProgress(0);
            reject(new Error('Timeout'));
        });
        
        // Open and send request
        xhr.open('POST', CONFIG.WEBHOOK_URL, true);
        xhr.timeout = 60000; // 60 seconds timeout
        
        // Add custom header for additional security
        xhr.setRequestHeader('X-JSX-Auth', CONFIG.SECURITY_TOKEN);
        
        xhr.send(formData);
    });
}

// Update progress bar
function updateProgress(percentComplete) {
    elements.progressBarFill.style.width = `${percentComplete}%`;
    elements.progressPercentage.textContent = `${percentComplete}%`;
}

// Set UI loading state
function setLoadingState(isLoading) {
    elements.submitButton.disabled = isLoading;
    
    if (isLoading) {
        elements.submitButton.classList.add('loading');
    } else {
        elements.submitButton.classList.remove('loading');
    }
}

// Show feedback message
function showFeedback(type, message) {
    if (!message) {
        elements.feedbackArea.hidden = true;
        return;
    }
    
    elements.feedbackArea.hidden = false;
    elements.feedbackArea.textContent = message;
    elements.feedbackArea.className = 'feedback-message';
    
    if (type) {
        elements.feedbackArea.classList.add(type);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
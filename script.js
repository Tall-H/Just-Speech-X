// Configuration
const CONFIG = {
    // Maximum file size in bytes (10MB)
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    // Allowed file types
    ALLOWED_FILE_TYPES: ['.pdf', '.txt'],
    // n8n webhook URL
    WEBHOOK_URL: 'https://ths-n8n-serv-u36821.vm.elestio.app/webhook-test/pdf-to-audio-upload',
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
    
    // Debug mode - log webhook URL to console
    console.log('Using webhook URL:', CONFIG.WEBHOOK_URL);
}

// Handle file input change
function handleFileChange(event) {
    const file = event.target.files[0];
    
    // Reset error message
    elements.fileError.textContent = '';
    
    if (file) {
        // Display file name
        elements.fileName.textContent = file.name;
        console.log('Selected file:', file.name, 'Size:', file.size, 'Type:', file.type);
        
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
    console.log('Form data prepared:', elements.emailInput.value);
    
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
                console.log('Upload progress:', percentComplete + '%');
            }
        });
        
        // Handle response
        xhr.addEventListener('load', () => {
            console.log('Response received:', xhr.status, xhr.statusText);
            console.log('Response headers:', xhr.getAllResponseHeaders());
            
            try {
                console.log('Response text:', xhr.responseText);
            } catch (e) {
                console.log('Could not log response text');
            }
            
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    console.log('Server response (parsed):', response);
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
                    console.error('Full error response:', xhr.responseText);
                    const errorResponse = JSON.parse(xhr.responseText);
                    if (errorResponse && errorResponse.message) {
                        errorMessage = `Error: ${errorResponse.message}`;
                    }
                } catch (e) {
                    // Response was not JSON
                    console.error('Error response was not JSON:', xhr.responseText);
                    errorMessage = `Upload failed: ${xhr.status} ${xhr.statusText}. Server response: ${xhr.responseText.substring(0, 100)}...`;
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
            console.error('Network error occurred');
            showFeedback('error', 'A network error occurred. Please check your connection and try again.');
            elements.progressContainer.hidden = true;
            updateProgress(0);
            reject(new Error('Network error'));
        });
        
        // Handle timeouts
        xhr.addEventListener('timeout', () => {
            console.error('Request timed out');
            showFeedback('error', 'The upload timed out. Please try again later.');
            elements.progressContainer.hidden = true;
            updateProgress(0);
            reject(new Error('Timeout'));
        });
        
        // Open and send request
        console.log('Opening connection to webhook URL:', CONFIG.WEBHOOK_URL);
        xhr.open('POST', CONFIG.WEBHOOK_URL, true);
        
        // Debug log all form data
        console.log('FormData contents:');
        for (let pair of formData.entries()) {
            console.log(pair[0] + ': ' + (pair[1] instanceof File ? `File (${pair[1].name}, ${pair[1].size} bytes)` : pair[1]));
        }
        
        xhr.timeout = 60000; // 60 seconds timeout
        xhr.send(formData);
        console.log('Request sent');
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
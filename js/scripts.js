// WanderMatch Frontend Scripts

document.addEventListener('DOMContentLoaded', function() {
    console.log("Document loaded, initializing survey form");

    const surveyForm = document.getElementById('surveyForm');
    if (!surveyForm) {
        console.error("Survey form not found in the document!");
        return;
    }

    const alertContainer = document.getElementById('alertContainer') || createAlertContainer();

    // Create loading overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Submitting your answers...</p>
    `;
    document.body.appendChild(loadingOverlay);
    loadingOverlay.style.display = 'none';

    // Create alert container if it doesn't exist
    function createAlertContainer() {
        console.log("Creating alert container");
        const container = document.createElement('div');
        container.id = 'alertContainer';
        container.className = 'mb-4';

        // Insert before the form or at the beginning of the body
        if (surveyForm) {
            surveyForm.parentNode.insertBefore(container, surveyForm);
        } else {
            document.body.insertBefore(container, document.body.firstChild);
        }

        return container;
    }

    // Set up destination autofill
    setupDestinationAutofill();

    // Handle form submission
    surveyForm.addEventListener('submit', function(event) {
        console.log("Form submission started");
        event.preventDefault();

        // Clear previous alerts
        alertContainer.innerHTML = '';

        try {
            // Show loading overlay
            loadingOverlay.style.display = 'flex';

            // Auto-fill destination_city with destination if empty
            const destinationField = document.querySelector('[name="destination"]');
            const destinationCityField = document.querySelector('[name="destination_city"]');
            if (destinationField && destinationCityField && !destinationCityField.value.trim() && destinationField.value.trim()) {
                destinationCityField.value = destinationField.value;
                console.log("Auto-filled destination_city with destination value");
            }

            // Collect form data (including empty fields - server will handle defaults)
            const formData = {};
            const formElements = surveyForm.elements;

            for (let i = 0; i < formElements.length; i++) {
                const element = formElements[i];
                if (element.name && element.name !== '' && element.type !== 'submit') {
                    // Include all fields, both filled and empty
                    formData[element.name] = element.value.trim();
                }
            }

            // Add timestamp
            formData.timestamp = new Date().toISOString();

            console.log('Submitting form data:', formData);

            // Submit the form data to Netlify Function instead of local server
            fetch('/.netlify/functions/user-survey', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            })
            .then(response => {
                console.log('Response status:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('Success data:', data);

                // Hide loading overlay
                loadingOverlay.style.display = 'none';

                if (data.status === 'error') {
                    // Show error message if server returns error status
                    showAlert('danger', data.message || 'Form submission failed');
                } else {
                    // Store the user ID in localStorage for future use
                    if (data.userId) {
                        localStorage.setItem('wanderMatchUserId', data.userId);
                    }

                    // Show success message and redirect
                    showAlert('success', 'Form submitted successfully! Default values used for any empty fields.');

                    // Redirect to thank you page after a short delay
                    setTimeout(() => {
                        window.location.href = '/thank_you.html';
                    }, 1500);
                }
            })
            .catch(error => {
                console.error('Error:', error);

                // Hide loading overlay
                loadingOverlay.style.display = 'none';

                // Show error message
                showAlert('danger', error.message || 'An error occurred while submitting the form');
            });
        } catch (error) {
            console.error('Error in form submission:', error);
            loadingOverlay.style.display = 'none';
            showAlert('danger', 'An unexpected error occurred: ' + error.message);
        }
    });

    // Show an alert message
    function showAlert(type, message) {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        alertContainer.innerHTML = alertHtml;
    }

    // Setup destination field autofill
    function setupDestinationAutofill() {
        console.log("Setting up destination autofill");
        const destinationField = document.querySelector('[name="destination"]');
        const destinationCityField = document.querySelector('[name="destination_city"]');

        if (destinationField && destinationCityField) {
            console.log("Found destination fields, setting up listeners");

            // When destination changes, update destination_city if it's empty
            destinationField.addEventListener('input', function() {
                if (!destinationCityField.value.trim()) {
                    destinationCityField.value = this.value.trim();
                }
            });

            // Initial fill if destination is already set
            if (destinationField.value.trim() && !destinationCityField.value.trim()) {
                destinationCityField.value = destinationField.value.trim();
            }
        } else {
            console.warn("Could not find destination fields for autofill");
        }
    }
});

function mapFormFieldNames() {
    // Get all form elements
    const form = document.getElementById('questionnaireForm');
    if (!form) return;

    // Mapping of form field IDs to expected server field names
    const fieldMapping = {
        'name': 'name',
        'age': 'age',
        'gender': 'gender',
        'nationality': 'nationality',
        'destination': 'destination',
        'cultural_symbol': 'cultural_symbol',
        'bucket_list': 'bucket_list',
        'healthcare': 'healthcare',
        'budget': 'budget',
        'payment_preference': 'payment_preference',
        'insurance': 'insurance',
        'insurance_issues': 'insurance_issues',
        'travel_season': 'travel_season',
        'stay_duration': 'stay_duration',
        'interests': 'interests',
        'personality_type': 'personality_type',
        'communication_style': 'communication_style',
        'travel_style': 'travel_style',
        'accommodation_preference': 'accommodation_preference',
        'origin_city': 'origin_city',
        'destination_city': 'destination_city'
    };

    // Update name attributes to match the server's expected field names
    Object.entries(fieldMapping).forEach(([formId, serverName]) => {
        const element = form.querySelector(`#${formId}`);
        if (element) {
            element.setAttribute('name', serverName);
        }
    });
}

function showLoadingOverlay(message = 'Processing...') {
    // Remove existing overlay if any
    hideLoadingOverlay();

    // Create loading overlay
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.classList.add('loading-overlay');

    const spinner = document.createElement('div');
    spinner.classList.add('spinner');

    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.classList.add('mt-3', 'text-center');

    overlay.appendChild(spinner);
    overlay.appendChild(messageEl);
    document.body.appendChild(overlay);
    document.body.classList.add('overflow-hidden');
}

function hideLoadingOverlay() {
    const existingOverlay = document.getElementById('loadingOverlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    document.body.classList.remove('overflow-hidden');
}

function showErrorMessage(message) {
    // Create alert container if it doesn't exist
    let alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alertContainer';
        alertContainer.className = 'alert-container';
        document.body.appendChild(alertContainer);
    }

    // Create alert
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show';
    alert.role = 'alert';

    // Add message
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Add to container
    alertContainer.appendChild(alert);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => {
            alert.remove();
        }, 500);
    }, 5000);
}

function showSuccessMessage(message) {
    // Create alert container if it doesn't exist
    let alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alertContainer';
        alertContainer.className = 'alert-container';
        document.body.appendChild(alertContainer);
    }

    // Create alert
    const alert = document.createElement('div');
    alert.className = 'alert alert-success alert-dismissible fade show';
    alert.role = 'alert';

    // Add message
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Add to container
    alertContainer.appendChild(alert);
}

// Check if we're on the thank you page and need to load results
if (window.location.pathname.includes('thank_you')) {
    document.addEventListener('DOMContentLoaded', function() {
        const userId = localStorage.getItem('wanderMatchUserId');
        if (!userId) {
            showErrorMessage('User ID not found. Please fill out the survey first.');
            return;
        }

        // Load matching results
        loadMatchingResults(userId);
    });
}

// Function to load matching results on thank you page
function loadMatchingResults(userId) {
    const resultsContainer = document.getElementById('matchingResults');
    if (!resultsContainer) return;

    showLoadingOverlay('Finding your perfect travel matches...');

    fetch('/.netlify/functions/match-users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: userId })
    })
    .then(response => response.json())
    .then(data => {
        hideLoadingOverlay();

        if (data.status === 'error') {
            showErrorMessage(data.message || 'Failed to load matching results');
            return;
        }

        // Display matches
        displayMatches(data.matches, resultsContainer);

        // Show travel advice button
        const adviceBtn = document.getElementById('getAdviceBtn');
        if (adviceBtn) {
            adviceBtn.style.display = 'block';
            adviceBtn.addEventListener('click', () => showAdviceForm(userId));
        }
    })
    .catch(error => {
        hideLoadingOverlay();
        showErrorMessage('Error loading matches: ' + error.message);
    });
}

// Function to display matches
function displayMatches(matches, container) {
    if (!matches || matches.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No matches found. Try adjusting your preferences.</div>';
        return;
    }

    let html = '<h3>Your Travel Matches</h3><div class="matches-grid">';

    matches.forEach(match => {
        html += `
            <div class="match-card">
                <h4>${match.name || 'Anonymous Traveler'}</h4>
                <div class="similarity-score">Match score: ${Math.round(match.similarity * 100)}%</div>
                <p class="match-details">
                    <span class="match-detail"><i class="bi bi-person"></i> ${match.age_group || 'Any age'}</span>
                    <span class="match-detail"><i class="bi bi-globe"></i> ${match.nationality || 'International'}</span>
                </p>
                <p class="match-interests">${match.interests || 'Various interests'}</p>
                <p class="match-dream">Dream destination: ${match.preferred_residence || 'Anywhere'}</p>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Function to show travel advice form
function showAdviceForm(userId) {
    const resultsContainer = document.getElementById('matchingResults');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `
        <h3>Get Travel Recommendations</h3>
        <form id="adviceForm" class="advice-form">
            <div class="mb-3">
                <label for="destination" class="form-label">Where do you want to go?</label>
                <input type="text" class="form-control" id="destination" name="destination" required>
            </div>
            <div class="mb-3">
                <label for="duration" class="form-label">How many days?</label>
                <input type="number" class="form-control" id="duration" name="duration" min="1" max="30" value="7" required>
            </div>
            <div class="mb-3">
                <label for="interests" class="form-label">What are you interested in?</label>
                <select class="form-select" id="interests" name="interests" required>
                    <option value="">Select an interest</option>
                    <option value="nature">Nature & Outdoors</option>
                    <option value="culture">Culture & History</option>
                    <option value="food">Food & Cuisine</option>
                    <option value="adventure">Adventure & Activities</option>
                    <option value="relaxation">Relaxation & Wellness</option>
                </select>
            </div>
            <div class="mb-3">
                <label for="budget" class="form-label">Your budget</label>
                <select class="form-select" id="budget" name="budget" required>
                    <option value="">Select a budget range</option>
                    <option value="budget">Budget (Under $100/day)</option>
                    <option value="moderate">Moderate ($100-$250/day)</option>
                    <option value="luxury">Luxury ($250+/day)</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary">Get Advice</button>
        </form>
    `;

    // Add event listener to the form
    document.getElementById('adviceForm').addEventListener('submit', function(e) {
        e.preventDefault();
        getAdvice(userId);
    });
}

// Function to get travel advice
function getAdvice(userId) {
    const form = document.getElementById('adviceForm');
    const formData = new FormData(form);
    const adviceData = Object.fromEntries(formData.entries());

    // Add the user ID
    adviceData.userId = userId;

    showLoadingOverlay('Generating travel recommendations...');

    fetch('/.netlify/functions/travel-advice', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(adviceData)
    })
    .then(response => response.json())
    .then(data => {
        hideLoadingOverlay();

        if (data.status === 'error') {
            showErrorMessage(data.message || 'Failed to generate travel advice');
            return;
        }

        // Display advice
        const resultsContainer = document.getElementById('matchingResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <h3>Your Travel Recommendations</h3>
                <div class="advice-container">
                    ${data.advice.replace(/\n/g, '<br>')}
                </div>
                <div class="mt-4">
                    <button id="generateBlogBtn" class="btn btn-success">Generate Travel Blog</button>
                    <button id="backToMatchesBtn" class="btn btn-outline-primary ms-2">Back to Matches</button>
                </div>
            `;

            // Add event listeners to buttons
            document.getElementById('generateBlogBtn').addEventListener('click', () => showBlogForm(userId, adviceData.destination));
            document.getElementById('backToMatchesBtn').addEventListener('click', () => loadMatchingResults(userId));
        }
    })
    .catch(error => {
        hideLoadingOverlay();
        showErrorMessage('Error generating advice: ' + error.message);
    });
}

// Function to show blog generation form
function showBlogForm(userId, destination) {
    const resultsContainer = document.getElementById('matchingResults');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = `
        <h3>Generate Travel Blog</h3>
        <form id="blogForm" class="blog-form">
            <div class="mb-3">
                <label for="blogDestination" class="form-label">Destination</label>
                <input type="text" class="form-control" id="blogDestination" name="destination" value="${destination || ''}" required>
            </div>
            <div class="mb-3">
                <label for="activities" class="form-label">Activities (comma separated)</label>
                <textarea class="form-control" id="activities" name="activities" rows="3" required
                    placeholder="hiking, visiting museums, trying local food"></textarea>
            </div>
            <div class="mb-3">
                <label for="style" class="form-label">Blog Style</label>
                <select class="form-select" id="style" name="style" required>
                    <option value="">Select a style</option>
                    <option value="casual">Casual & Conversational</option>
                    <option value="informative">Informative & Detailed</option>
                    <option value="literary">Literary & Descriptive</option>
                    <option value="humorous">Humorous & Light-hearted</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary">Generate Blog</button>
            <button type="button" id="cancelBlogBtn" class="btn btn-outline-secondary ms-2">Cancel</button>
        </form>
    `;

    // Add event listeners
    document.getElementById('blogForm').addEventListener('submit', function(e) {
        e.preventDefault();
        generateBlog(userId);
    });

    document.getElementById('cancelBlogBtn').addEventListener('click', function() {
        loadMatchingResults(userId);
    });
}

// Function to generate blog
function generateBlog(userId) {
    const form = document.getElementById('blogForm');
    const formData = new FormData(form);
    const blogData = Object.fromEntries(formData.entries());

    // Add the user ID
    blogData.userId = userId;

    showLoadingOverlay('Generating your travel blog...');

    fetch('/.netlify/functions/generate-blog', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(blogData)
    })
    .then(response => response.json())
    .then(data => {
        hideLoadingOverlay();

        if (data.status === 'error') {
            showErrorMessage(data.message || 'Failed to generate blog');
            return;
        }

        // Open the blog in a new window
        const blogWindow = window.open('', '_blank');
        blogWindow.document.write(data.blogHtml);
        blogWindow.document.close();

        // Show success message
        showSuccessMessage('Blog generated successfully! It has been opened in a new tab.');

        // Return to matches after a delay
        setTimeout(() => {
            loadMatchingResults(userId);
        }, 3000);
    })
    .catch(error => {
        hideLoadingOverlay();
        showErrorMessage('Error generating blog: ' + error.message);
    });
}
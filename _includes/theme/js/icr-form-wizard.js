let currentStep = 0;
const steps = document.querySelectorAll(".step");
const stepIndicators = document.querySelectorAll(".usa-step-indicator__segment");
const currentStepNumber = document.getElementById("current-step-number");
const currentStepText = document.getElementById("current-step-text");
const fileInput = document.getElementById('attachments');
const fileListDiv = document.getElementById('file-list');
let uploadedFiles = [];
let documentBlobUrl = null; 
const burdenEstimates = [];

function showStep(step) {
    steps.forEach((element,index) => {
        element.style.display=index===step? "block":"none";
    });

    stepIndicators.forEach((element,index) => {
        if(index<step) {
            element.classList.add("usa-step-indicator__segment--complete");
            element.classList.remove("usa-step-indicator__segment--current");
        } else if(index===step) {
            element.classList.add("usa-step-indicator__segment--current");
            element.classList.remove("usa-step-indicator__segment--complete");
        } else {
            element.classList.remove("usa-step-indicator__segment--complete","usa-step-indicator__segment--current");
        }
    });

    const currentStepElement=steps[step];
    const stepTitle=currentStepElement.dataset.stepTitle||"Details of information collection";

    currentStepNumber.textContent=step+1;
    currentStepText.textContent=stepTitle;
}

function validateStep(step) {
    let isValid = true;
    const stepElement = steps[step];
    const inputs = stepElement.querySelectorAll("input, textarea, select");
    let firstInvalidField = null;
    const burdenEstimates = [];


    // Remove previous error messages
    function cleanupErrors(input, parentContainer) {
        const existingError = parentContainer.querySelector(".error-message");
        if (existingError) existingError.remove();

        parentContainer.classList.remove("usa-input--error");
        input.classList.remove("usa-input--error");
    }

    // Helper to add error messages
    function showErrorMessage(input, message) {
        const parentContainer = input.closest(".usa-fieldset") || input.parentElement;
        cleanupErrors(input, parentContainer);

        const errorElement = document.createElement("div");
        errorElement.className = "error-message usa-error-message";
        errorElement.textContent = message;

        parentContainer.classList.add("usa-input--error");
        parentContainer.appendChild(errorElement);

        if (!firstInvalidField) {
            firstInvalidField = input; // Set the first invalid field
        }
    }

    // Helper to validate radio and checkbox groups
    function validateGroup(groupInputs, parentContainer, message) {
        const isChecked = Array.from(groupInputs).some((el) => el.checked);

        if (!isChecked) {
            showErrorMessage(groupInputs[0], message);
            return false;
        }
        return true;
    }

    inputs.forEach((input) => {
        const parentContainer = input.closest(".usa-fieldset") || input.parentElement;
        cleanupErrors(input, parentContainer);

        // Required fields (text, textarea, select)
        if (input.hasAttribute("required") && !input.value.trim()) {
            if (input.name === "incentiveDescription") {
                showErrorMessage(input, "Please describe the incentive.");
            } else {
                showErrorMessage(input, "This field is required.");
            }
            isValid = false;
        }
    });

    // Validate radio and checkbox groups
    const radioGroups = [...new Set(Array.from(inputs).filter(input => input.type === "radio").map(input => input.name))];
    radioGroups.forEach((name) => {
        const groupInputs = stepElement.querySelectorAll(`input[name="${name}"]`);
        if (groupInputs.length) {
            const parentContainer = groupInputs[0].closest(".usa-fieldset") || groupInputs[0].parentElement;
            if (!validateGroup(groupInputs, parentContainer, "Please select an option.")) {
                isValid = false;
            }
        }
    });

    const checkboxGroups = [...new Set(Array.from(inputs).filter(input => input.type === "checkbox").map(input => input.name))];
    checkboxGroups.forEach((name) => {
        const groupInputs = stepElement.querySelectorAll(`input[name="${name}"]`);
        if (groupInputs.length) {
            const parentContainer = groupInputs[0].closest(".usa-fieldset") || groupInputs[0].parentElement;
            if (!validateGroup(groupInputs, parentContainer, "Please select at least one option.")) {
                isValid = false;
            }
        }
    });

    document.querySelectorAll('input[name="incentiveOptions"]').forEach((radio) => {
        radio.addEventListener("change", (e) => {
            const textarea = document.getElementById("incentiveDescription");
            
            if (e.target.value === "Yes") {
                textarea.setAttribute("required", "true");
            } else {
                textarea.removeAttribute("required");
            }
        });
    });

    // Special validation logic for Step 3: Burden estimates
    if (step === 2) { // Assuming step 3 is at index 2
        const categories = stepElement.querySelectorAll('input[name="category"]:checked');
        if (!categories.length) {
            const container = stepElement.querySelector(".usa-fieldset");
            showErrorMessage(container, "Please select at least one category.");
            isValid = false;
        } else {
            categories.forEach((category) => {
                const numberField = stepElement.querySelector(`#numberOfRespondents-${category.value}`);
                const timeField = stepElement.querySelector(`#participationTime-${category.value}`);
                if (!numberField.value.trim() || isNaN(numberField.value) || Number(numberField.value) <= 0) {
                    showErrorMessage(numberField, "Please enter a valid number of respondents.");
                    isValid = false;
                }
                if (!timeField.value.trim() || isNaN(timeField.value) || Number(timeField.value) <= 0) {
                    showErrorMessage(timeField, "Please enter a valid participation time.");
                    isValid = false;
                }
            });
        }
    }

    // Scroll to the first invalid field, if any
    if (!isValid && firstInvalidField) {
        firstInvalidField.scrollIntoView({ behavior: "smooth", block: "center" });
        firstInvalidField.focus(); // Optionally, focus the invalid field
    }

    return isValid;
}

function toggleCategoryInputs(category, isChecked) {
    const container = document.getElementById(`${category}-inputs`);
    if (isChecked) {
        container.style.display = "block";
    } else {
        container.style.display = "none";
        // Reset the values when unchecked
        delete burdenEstimates[category];
    }
}

function updateBurdenEstimate(category) {
    const numberOfRespondents = parseFloat(document.querySelector(`#numberOfRespondents-${category}`).value) || 0;
    const participationTime = parseFloat(document.querySelector(`#participationTime-${category}`).value) || 0;

    const annualBurdenHours = (numberOfRespondents * participationTime) / 60;
    
    // Round to exactly 2 decimal places
    const roundedBurdenHours = Number(Math.round(annualBurdenHours + 'e2') + 'e-2');

    // Update the burden estimates object
    burdenEstimates[category] = {
        categoryOfRespondents: category,
        numberOfRespondents,
        participationTime,
        annualBurdenHours: roundedBurdenHours
    };
}

document.querySelectorAll(".category-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
        const category = e.target.value;
        toggleCategoryInputs(category, e.target.checked);
    });
});

document.querySelectorAll(".dynamic-input").forEach((input) => {
    input.addEventListener("input", (e) => {
        const category = e.target.dataset.category;
        updateBurdenEstimate(category);
    });
});

function nextStep() {
    validateStep(currentStep);

    if (validateStep(currentStep)) {
        if (currentStep < steps.length - 1) {
            currentStep++;
            showStep(currentStep);
        }
    }
}

function previousStep() {
    if(currentStep>0) {
        currentStep--;
        showStep(currentStep);
    }
}

// Show the first step on page load
document.addEventListener("DOMContentLoaded",() => {
    showStep(currentStep);
});

// Handle file input change
if (fileInput) {
    fileInput.addEventListener('change', (event) => {
        const newFiles = Array.from(event.target.files);
        uploadedFiles = uploadedFiles.concat(newFiles);
        updateFileList();
    });
}

// Update the file list in the UI
function updateFileList() {
    fileListDiv.innerHTML = '';

    uploadedFiles.forEach((file, index) => {
        const fileEntry = document.createElement('div');
        const fileNameSpan = document.createElement('span');
        const removeButton = document.createElement('button');

        fileEntry.className = 'file-entry';
        fileNameSpan.textContent = file.name;
        fileEntry.appendChild(fileNameSpan);

        
        removeButton.type = 'button';
        removeButton.textContent = 'Remove';
        removeButton.onclick = () => removeFile(index);
        
        fileEntry.appendChild(removeButton);
        fileListDiv.appendChild(fileEntry);
    });

    updateFileInput();
}

// Remove a file and update the list
function removeFile(index) {
    uploadedFiles.splice(index, 1); // Remove the file from the array
    updateFileList();
}

// Sync the file input's FileList with uploadedFiles
function updateFileInput() {
    const dataTransfer = new DataTransfer();

    uploadedFiles.forEach((file) => {
        dataTransfer.items.add(file);
    });

    // Update the file input with the new files
    fileInput.files = dataTransfer.files;
}

function submitForm() {
    const form = document.getElementById('wizardForm');
    const formData = new FormData(form);

    // Clear existing burden estimates before adding new ones
    burdenEstimates.length = 0;

    // Utility function to handle checkmarks using Unicode character
    const setBooleanValue = (value, targetValue) => (value === targetValue ? 'X' : ' ');

    // Extract checked checkboxes
    const checkboxes = Array.from(form.querySelectorAll('input[name="checkboxes"]:checked')).map(cb => cb.value);

    // Extract selected radio button values
    const radioSelection = form.querySelector('input[name="radioSelection"]:checked')?.value || '';
    const surveyResults = form.querySelector('input[name="surveyResults"]:checked')?.value || '';
    const incentiveOptions = form.querySelector('input[name="incentiveOptions"]:checked')?.value || '';

    // Populate burdenEstimates
    const categories = document.querySelectorAll('input[name="category"]:checked');
    let hasValidBurdenEstimates = false;

    categories.forEach((category) => {
        const categoryName = category.value;
        const numberField = document.querySelector(`#numberOfRespondents-${categoryName}`);
        const timeField = document.querySelector(`#participationTime-${categoryName}`);

        if (numberField && timeField && numberField.value && timeField.value) {
            const numberOfRespondents = Number(numberField.value);
            const participationTime = Number(timeField.value);

            if (numberOfRespondents > 0 && participationTime > 0) {
                const annualBurdenHours = (numberOfRespondents * participationTime) / 60;
                burdenEstimates.push({
                    categoryOfRespondents: categoryName,
                    numberOfRespondents,
                    participationTime,
                    annualBurdenHours: Math.round(annualBurdenHours * 100) / 100 // Round to 2 decimals
                });
                hasValidBurdenEstimates = true;
            }
        }
    });

    if (!hasValidBurdenEstimates) {
        alert("Please fill out the Burden Estimates step completely.");
        return;
    }

    // Calculate totals
    const totalNumberOfRespondents = burdenEstimates.reduce((sum, row) => sum + row.numberOfRespondents, 0);
    const totalParticipationTime = burdenEstimates.reduce((sum, row) => sum + row.participationTime, 0);
    const totalAnnualBurdenHours = Number(Math.round((burdenEstimates.reduce((sum, row) => sum + row.annualBurdenHours, 0)) + 'e2') + 'e-2');

    const payload = {
        title: formData.get('title'),
        purpose: formData.get('purpose'),
        customerResearch: setBooleanValue(radioSelection, 'Customer research (interview, focus groups, surveys)'),
        customerFeedback: setBooleanValue(radioSelection, 'Customer feedback survey'),
        usabilityTesting: setBooleanValue(radioSelection, 'Usability testing of products or services'),
        surveyResultsYes: setBooleanValue(surveyResults, 'Yes'),
        surveyResultsNo: setBooleanValue(surveyResults, 'No'),
        notASurvey: setBooleanValue(surveyResults, 'Not a survey'),
        webBased: setBooleanValue(checkboxes.includes('Web-based or social media'), true),
        telephone: setBooleanValue(checkboxes.includes('Telephone'), true),
        inPerson: setBooleanValue(checkboxes.includes('In-person'), true),
        mail: setBooleanValue(checkboxes.includes('Mail'), true),
        other: setBooleanValue(checkboxes.includes('Other'), true),
        collectInfoFrom: formData.get('collectInfoFrom'),
        respondentProvideInfo: formData.get('respondentProvideInfo'),
        activityLookLike: formData.get('activityLookLike'),
        questionList: formData.get('questionList'),
        activityTiming: formData.get('activityTiming'),
        incentiveYes: setBooleanValue(incentiveOptions, 'Yes'),
        incentiveNo: setBooleanValue(incentiveOptions, 'No'),
        incentiveDescription: formData.get('incentiveDescription'),
        burdenEstimates,
        totalNumberOfRespondents,
        totalParticipationTime,
        totalAnnualBurdenHours,
        name: formData.get('name'),
        email: formData.get('email'),
    };

    console.log('Payload before sending:', JSON.stringify(payload, null, 2));

    // Add loading state to submit button
    const submitButton = document.querySelector('button[onclick="submitForm()"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Generating Document...';

    fetch('https://pra-app-intelligent-quokka-qi.app.cloud.gov/generate-word', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
    .then(async (response) => {
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate document');
        }
  
        if (!data.success || !data.fileUrl) {
            throw new Error('Invalid server response: missing fileUrl');
        }
  
        const previewIframe = document.querySelector('iframe[data-dynamic-src]');
        if (previewIframe) {
            // Create a promise that resolves when iframe loads
            const iframeLoadPromise = new Promise((resolve, reject) => {
                previewIframe.onload = () => resolve();
                previewIframe.onerror = () => reject(new Error('Failed to load preview'));
                
                // Set a timeout in case loading takes too long
                setTimeout(() => reject(new Error('Preview loading timed out')), 90000);
            });
    
            // Set the iframe source
            previewIframe.src = `https://docs.google.com/gview?url=${encodeURIComponent(data.fileUrl)}&embedded=true`;
    
            // Wait for iframe to load before proceeding
            try {
                await iframeLoadPromise;
                
                const downloadLink = document.getElementById('downloadLink');
                downloadLink.href = data.fileUrl;
                downloadLink.textContent = 'Download Completed Document';
                
                // Only move to next step after successful iframe load
                nextStep();
            } catch (error) {
                throw new Error(`Failed to load preview: ${error.message}`);
            }
        }
    })
    .catch((error) => {
        console.error('Error generating document:', error);
        alert(`Error: ${error.message}. Please click the "Back" button and try submitting the form again or contact support if the problem persists.`);
    })
    .finally(() => {
        // Reset button state
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    });
}

function sendEmail() {
    const form = document.getElementById('wizardForm');    
    const userName = form.elements['name'].value;
    const emailSubject = `${userName} - ICR Package (A-11 Section 280) for Pre-review`;
    const emailBody = `Dear Todd,
    
${userName} is seeking Fast Track (A-11 Section 280) PRA clearance for our upcoming user research. Our completed ICR package is attached to this email for your pre-review. Please let us know if you have any questions, and we will look forward to your feedback.
    
Thank you.`;

    const mailtoLink = document.getElementById("mailtoLink");
    mailtoLink.href = `mailto:Todd.W.Rubin2@omb.eop.gov?cc=tts-research@gsa.gov&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;    
}
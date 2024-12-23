let currentStep = 0;
const steps = document.querySelectorAll(".step");
const stepIndicators = document.querySelectorAll(".usa-step-indicator__segment");
const currentStepNumber = document.getElementById("current-step-number");
const currentStepText = document.getElementById("current-step-text");
const fileInput = document.getElementById('attachments');
const fileListDiv = document.getElementById('file-list');
let uploadedFiles = [];
let documentBlobUrl = null; 
let burdenEstimates = []; // Array to store the rows

function addBurdenRow() {
    const rowId = `burdenRow-${burdenEstimates.length}`;
    burdenEstimates.push({
        id: rowId,
        categoryOfRespondents: '',
        numberOfRespondents: '',
        participationTime: '',
        annualBurdenHours: ''
    });

    const container = document.getElementById('burdenRowsContainer');
    const row = document.createElement('div');
    row.id = rowId;
    row.className = 'burden-row';
    row.innerHTML = `
        <fieldset class="usa-fieldset">
            <legend class="usa-legend">Category of respondents <span class="usa-hint">*</span></legend>
            <label class="usa-label" for="categoryOfRespondents">Identify who you expect the respondents to be in terms of the following categories: (1) Individuals or Households; (2) Private Sector; (3) State, local, or tribal governments; or (4) Federal Government.</label>
            <input class="usa-input" type="text" 
onchange="updateBurdenRow('${rowId}', 'categoryOfRespondents', this.value)" required>

        </fieldset>

        <fieldset class="usa-fieldset">
            <legend class="usa-legend">Number of respondents <span class="usa-hint">*</span></legend>
            <label class="usa-label" for="numberOfRespondents">Provide the total number of respondents involved in a data collection process.</label>
            <input class="usa-input" type="number" 
onchange="updateBurdenRow('${rowId}', 'numberOfRespondents', this.value)" required>
        </fieldset>

        <fieldset class="usa-fieldset">
            <legend class="usa-legend">Participation time <span class="usa-hint">*</span></legend>
            <label class="usa-label" for="participationTime">Provide an estimate of the amount of time required for a respondent to participate (e.g. fill out a survey or participate in a focus group).</label>
            <input class="usa-input" type="number" 
onchange="updateBurdenRow('${rowId}', 'participationTime', this.value)" required>
        </fieldset>

        <fieldset class="usa-fieldset">
            <legend class="usa-legend">Annual burden hours <span class="usa-hint">*</span></legend>
            <label class="usa-label" for="annualBurdenHours">This is calculated by multiplying the number of responses and participation time and dividing by 60.</label>
            <input class="usa-input" type="number" 
onchange="updateBurdenRow('${rowId}', 'annualBurdenHours', this.value)" required>
        </fieldset>
        <p class="text-right"><button type="button" class="usa-button usa-button--secondary" onclick="removeBurdenRow('${rowId}')">Remove</button></p>
        
        <hr class="margin-bottom-3">
    `;
    container.appendChild(row);
}

function removeBurdenRow(rowId) {
    burdenEstimates = burdenEstimates.filter(row => row.id !== rowId);
    const rowElement = document.getElementById(rowId);
    rowElement.parentNode.removeChild(rowElement);
}

function updateBurdenRow(rowId, field, value) {
    const row = burdenEstimates.find(row => row.id === rowId);
    if (row) {
        row[field] = isNaN(value) ? value : parseFloat(value);
    }
}

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
    let isValid = true; // Track overall step validation
    const stepElement = steps[step]; // Current step container
    const inputs = stepElement.querySelectorAll("input, textarea, select");

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

    return isValid;
}

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
    // Initialize the burdenRowsContainer with a default row
    if (burdenEstimates.length === 0) {
        addBurdenRow(); // Add a default row when the page loads
    }

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
        fileEntry.className = 'file-entry';
        fileEntry.innerHTML = `
        <span>${file.name}</span>
        <button type="button" onclick="removeFile(${index})">Remove</button>
        `;
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

    // Calculate totals
    const totals = burdenEstimates.reduce(
        (acc, row) => {
            acc.totalNumberOfRespondents += Number(row.numberOfRespondents || 0);
            acc.totalParticipationTime += Number(row.participationTime || 0);
            acc.totalAnnualBurdenHours += Number(row.annualBurdenHours || 0);
            return acc;
        },
        {
            totalNumberOfRespondents: 0,
            totalParticipationTime: 0,
            totalAnnualBurdenHours: 0,
        }
    );

    const payload = {
        title: formData.get('title'),
        purpose: formData.get('purpose'),
        radioSelection: formData.get('radioSelection'),
        surveyResults: formData.get('surveyResults'),
        checkboxes: formData.getAll('checkboxes'),
        collectInfoFrom: formData.get('collectInfoFrom'),
        respondentProvideInfo: formData.get('respondentProvideInfo'),
        activityLookLike: formData.get('activityLookLike'),
        questionList: formData.get('questionList'),
        activityTiming: formData.get('activityTiming'),
        incentiveOptions: formData.get('incentiveOptions'),
        incentiveDescription: formData.get('incentiveDescription'),
        burdenEstimates: burdenEstimates.map(row => ({
            categoryOfRespondents: row.categoryOfRespondents,
            numberOfRespondents: row.numberOfRespondents,
            participationTime: row.participationTime,
            annualBurdenHours: row.annualBurdenHours,
        })),
        totalNumberOfRespondents: totals.totalNumberOfRespondents,
        totalParticipationTime: totals.totalParticipationTime,
        totalAnnualBurdenHours: totals.totalAnnualBurdenHours,
        name: formData.get('name'),
        email: formData.get('email'),
    };

    if (burdenEstimates.length === 0) {
        alert('Please add at least one burden estimate row before submitting.');
        return;
    }

    // Add burdenEstimates data
    formData.append('burdenEstimates', JSON.stringify(burdenEstimates));

    fetch('/.netlify/functions/generateWord', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.arrayBuffer();
        })
        .then(buffer => {
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });

            documentBlobUrl = URL.createObjectURL(blob);
            const downloadLink = document.getElementById("downloadLink");
            downloadLink.href = documentBlobUrl;
            downloadLink.textContent = "Download Completed Document";

            const previewIframe = document.querySelector("iframe[data-dynamic-src]");

            if (previewIframe) {
                previewIframe.src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentBlobUrl)}`;
        
                // Add a loading message
                previewIframe.insertAdjacentHTML('beforebegin', 
                    '<div id="preview-loading" class="usa-alert usa-alert--info">' +
                    '<div class="usa-alert__body">' +
                    '<p class="usa-alert__text">Loading preview...</p>' +
                    '</div>' +
                    '</div>'
                );

                // Remove loading message once iframe loads
                previewIframe.onload = () => {
                    const loadingDiv = document.getElementById('preview-loading');
                    if (loadingDiv) loadingDiv.remove();
                };
            }

            // Move to the review step
            nextStep();
        })
        .catch(error => {
            console.error('Error:', error);
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
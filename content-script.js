// Participating in market research requires filling out a lot of surveys.
// Even though these companies have all your info, for some reason they want
// you to fill them in over and over for every survey...
// This expedites the process by autocompleting portions of the survey.
//
// Supports: Fieldwork.com, UserInterviews.com
// Features:
// - Automatically fills in the survey with information provided by user
// TODO: Support other survey platforms like surveymonkey
// TODO: Post on the beery money subreddit
// Controls: 
// - [Tab] to progress survey
// - [1-9] to select different options

const pageUrl = new URL(window.location.href);
var surveySource = 'Unknown';
if (pageUrl.hostname.includes('opinari.fieldwork.com')) {
  surveySource = 'Fieldwork';
} else if (pageUrl.hostname.includes('userinterviews.com')) {
  surveySource = 'UserInterviews';
} else if (pageUrl.hostname.includes('surveymonkey.com')) {
  surveySource = 'SurveyMonkey';
}

// TODO: Handle "Survey Responses" page better.
// TODO: Add a prompt to tell users to set-up in the options page.

// Label can be an array
// Value can be an array
const answerData = {
  'first_name': {
    label: "First Name",
    value: "Jane",
  },
  'last_name': {
    label: "Last Name",
    value: "Doe",
  },
  'gender': {
    label: "Gender",
    value: "Female",
  },
  'age': {
    label: "Age",
    value: "42",
  },
  'dob': {
    label: "date of birth",
    value: "01/01/1978",
  },
  'phone_number': {
    label: "Phone Number",
    value: "8675309"
  },
  'email': {
    label: "Email",
    value: "meowmeow@meowmix.com"
  },
  'city': {
    label: "City",
    value: "Cloud 9",
  },
  'state': {
    label: "State",
    value: "California",
  },
  'zip': {
    label: "Zip Code",
    value: "91776",
  },
  'ethnicity': {
    label: ["ethnic", "ethnicity", "How would you best describe yourself?"],
    value: ["Cat", "Tabby Cat"],
  },
  'employment_status': {
    label: "employment status",
    value: "Unemployed",
  },
  'education': {
    label: "education",
    value: "Elementary",
  },
  'marital_status': {
    label: "martial status",
    value: "Single",
  },
  'time_zone': {
    label: "time zone",
    value: "PST",
  },
  'valid_ssn': {
    label: ["valid Social Security Number", "valid US SSN", "valid SSN"],
    value: "Yes",
  },
  'assistive_technologies': {
    label: "adaptive or assistive technologies",
    value: "No",
  },
  'physical_disability': {
    label: 'physical disability',
    value: "No",
  },
  'recent_studies': {
    label: ["participated in a focus group"],
    value: "3 months",
  }
};

// Load answers from local storage
chrome.storage.local.get(null, (result) => {
  for (const [key, value] of Object.entries(result)) {
    answerData[key].value = value.split(",");
  }

  // Prompt users to set up data in options
  if (Object.keys(result).length == 0) {
    chrome.runtime.sendMessage({"action": "openOptionsPage"});
  }

  // console.log(JSON.stringify(answerData, null, 4));
});


// Hook into the survey's keydown to enable keyboard shortcuts
document.addEventListener("keydown", onKeyDown, true);

// Detect when the survey advances
async function registerSurveyContentListener() {
  await waitForElementAndObserveChanges(() => {
    // The element to observe
    return document.getElementsByClassName('cb-survey-content')[0];
    // return document.getElementsByTagName('form')[0];
  }, (element) => {
    // Sometimes questions will change the survey, but not actually advance it.
    // Circumvent this by detecting if user has progressed the survey first.
    if (hasSurveyProgressed) {
      onSurveyLoad();
    }
  });
}

document.onreadystatechange = () => {
  if (document.readyState == "complete") {
    if (surveySource == "Fieldwork") {
      registerSurveyContentListener();
    } else {
      onSurveyLoad();
    }
  }
};

// Detect when user advances the page
var hasSurveyProgressed = true;
document.body.addEventListener('click', (event) => {
  var nextBtn = getNextButton();
  if (nextBtn == null) {
    return;
  }

  if (nextBtn.contains(event.target)) {
    hasSurveyProgressed = true;
  }
});

// Detect when user uses mouse to answer unfilled questions
document.body.addEventListener('click', (event) => {
  if (unansweredQuestions.length == 0) {
    return;
  }

  for (var i = 0; i < unansweredQuestions.length; i++) {
    var questionIdx = unansweredQuestions[i];
    if (questions[questionIdx].container.contains(event.target)) {
      answerUnansweredQuestion(questionIdx);
      break;
    }
  }
});

var selectedQuestionIndex = -1;
var unansweredQuestions = [];
var questions = [];

function getNextButton() {
  if (surveySource == "Fieldwork") {
    return document.getElementsByClassName("btn-next")[0];
  } else if (surveySource == "UserInterviews") {
    return document.getElementsByClassName("btn-primary")[0];
  } else if (surveySource == "SurveyMonkey") {
    return document.getElementsByClassName("next-button")[0];
  }
}

function onKeyDown(e) {
  var keyCode = e.keyCode;
  switch(keyCode) {
    case 9: // Tab key
      if (unansweredQuestions.length > 0) {
        selectNextQuestion();
      } else {
        var nextBtn = getNextButton();
        if (nextBtn != null) {
          nextBtn.click();
        }
      }
      // Space might be used for selecting/unselecting elements which could mess with this
      e.preventDefault();
      break;
  }

  // If user presses 1-9, quick-select the corresponding radio button for the selected question
  if (keyCode >= 49 && keyCode <= 57 && selectedQuestionIndex >= 0) {
    var radioIndex = keyCode - 49;
    if (questions[selectedQuestionIndex].inputElement != null) {
      handleKeypressSelection(questions[selectedQuestionIndex].inputElement, radioIndex);
    }
  }
}

function handleKeypressSelection(containerElement, index) {
  switch(containerElement.nodeName) {
    case 'MAT-RADIO-GROUP': // [Fieldwork] Radio Buttons
      const radioButtons = containerElement.getElementsByClassName('mat-radio-button');
      if (index >= 0 && index < radioButtons.length) {
        radioButtons[index].getElementsByClassName("mat-radio-container")[0].click();
        selectNextQuestion();
      }
      break;
    case 'DIV':
      if (containerElement.classList.contains('checkboxes-group')) { // [Fieldwork] Checkboxes
        const checkboxes = containerElement.getElementsByTagName('mat-checkbox');
        if (index >= 0 && index < checkboxes.length) {
          checkboxes[index].getElementsByClassName("mat-checkbox-inner-container")[0].click();
        }
      } else if (containerElement.classList.contains('RadioButtonGroup')) { // [UserInterviews] Radio Buttons
        const radioButtons = containerElement.getElementsByClassName('FormControlLabel');
        if (index >= 0 && index < radioButtons.length) {
          radioButtons[index].getElementsByClassName("FormControlLabel__control")[0].click();
          selectNextQuestion();
        }
      } else if (containerElement.classList.contains('CheckboxButtonGroup')) { // [UserInterviews] Radio Buttons
        const checkboxes = containerElement.getElementsByClassName('FormControlLabel');
        if (index >= 0 && index < checkboxes.length) {
          checkboxes[index].getElementsByClassName("FormControlLabel__control")[0].click();
        }
      }
      break;
    case 'FIELDSET':
       if (containerElement.getAttribute('data-radio-button-group') == '') { // [SurveyMonkey] Radio Buttons
        const radioButtons = containerElement.getElementsByClassName('radio-button-container');
        if (index >= 0 && index < radioButtons.length) {
          radioButtons[index].getElementsByClassName("radio-button-display")[0].click();
          selectNextQuestion();
        }
      }
    default:
      break;
  }
}

function onSurveyLoad() {
  autofill();
  hasSurveyProgressed = false;
  console.log("Survey contents changed!");
}

// We want to observe changes on an element, but the element is not loaded yet.
// This method will attempt to register an observer on this element after waiting
// for it to load.
function waitForElementAndObserveChanges(getElementFn, onChangeCallback) {
  return new Promise(async (resolve) => {
    var delayMs = 500;
    var element = null;
    while (element == null) {
      element = await getElementAfterDelay(delayMs, getElementFn);
      if (element == null) {
        delayMs = delayMs;
      }
    }

    // This will trigger whenever the element's children content change.
    var config = {childList: true};
    var observer = new MutationObserver(onChangeCallback);

    observer.observe(element, config);

    // Trigger an initial call
    onChangeCallback(element);

    resolve();
  });
}

function getElementAfterDelay(delayMs, getElementFn) {
  return new Promise(resolve => {
    setTimeout(function() {
      resolve(getElementFn());
    }, delayMs);
  });
}

function autofill() {
  // Reset some state
  selectedQuestionIndex = -1;
  unansweredQuestions = [];

  questions = parseQuestions();
  autofillQuestions(questions);
}

function selectQuestion(questionIndex) {
  selectedQuestionIndex = questionIndex;
}

function selectNextQuestion() {
  if (unansweredQuestions.length > 0) {
    selectQuestion(unansweredQuestions[0]);
    questions[selectedQuestionIndex].container.scrollIntoView();
  }
}

function answerUnansweredQuestion(index) {
  questions[index].container.style.backgroundColor = null;
  arrayRemoveByValue(unansweredQuestions, index);
  selectedQuestionIndex = -1;
}

function arrayRemoveByValue(array, value) {
  const index = array.indexOf(value);
  if (index !== -1) {
    array.splice(index, 1);
  }
}

function getInputElement(containerElement) {
  if (surveySource == "Fieldwork") {
    // Check for an input field
    const field = containerElement.getElementsByClassName("mat-form-field-infix")[0];
    if (field != null) {
      return field.firstChild;
    } 
    // Check for a radio group
    const radioGroup = containerElement.getElementsByTagName("mat-radio-group")[0];
    if (radioGroup != null) {
      return radioGroup;
    }
    // Check for a checkbox group
    const checkboxGroup = containerElement.getElementsByClassName("checkboxes-group")[0];
    if (checkboxGroup != null) {
      return checkboxGroup;
    }
  }

  else if (surveySource == "UserInterviews") {
    // Check for an input field
    const field = containerElement.getElementsByClassName("input-group")[0];
    if (field != null) {
      return field.firstChild;
    }
    // Check for a radio group
    const radioGroup = containerElement.getElementsByClassName("RadioButtonGroup")[0];
    if (radioGroup != null) {
      return radioGroup;
    }
    // Check for a checkbox group
    const checkboxGroup = containerElement.getElementsByClassName("CheckboxButtonGroup")[0];
    if (checkboxGroup != null) {
      return checkboxGroup;
    }
  }

  else if (surveySource == "SurveyMonkey") {
    // Check for an input field
    const field = containerElement.getElementsByClassName("open-ended-single")[0];
    if (field != null) {
      return field.firstChild;
    }
    // Check for a radio group
    const radioGroup = containerElement.querySelectorAll('[data-radio-button-group=""]')[0];
    if (radioGroup != null) {
      return radioGroup;
    }
  }

  return null;
}

function getQuestionTitle(containerElement) {
  if (surveySource == "Fieldwork") {
    const label = containerElement.getElementsByClassName("cb-question-item-title")[0];
    if (label != null) {
      return label.textContent.trim();
    }
  }

  else if (surveySource == "UserInterviews") {
    const label = containerElement.querySelectorAll(".InputLabel, .InputLegend")[0];
    if (label != null) {
      return label.textContent.trim();
    }
  }

  else if (surveySource == "SurveyMonkey") {
    const label = containerElement.getElementsByClassName('question-title-container')[0];
    if (label != null) {
      return label.textContent.trim();
    }
  }

  return "Unknown";
}

function getQuestionWrappers() {
  if (surveySource == "Fieldwork") {
    return document.getElementsByClassName('cb-question-item-wrapper-outer');
  } else if (surveySource == "UserInterviews") {
    var questions = [];
    // Initial signup page is a bit different
    const signupCard = document.getElementsByClassName('ApplySignUp__Card')[0];
    if (signupCard != null) {
      questions = signupCard.getElementsByClassName('FormGroup');
    }
    // Format for rest of survey
    const surveyForm = document.getElementsByClassName('SurveyForm__form')[0];
    if (surveyForm != null) {
      questions = [...questions, ...surveyForm.getElementsByClassName('FormGroup')];
    }
    return questions;
  } else if (surveySource == "SurveyMonkey") {
    return document.getElementsByClassName('question-row');
  }

  return [];
}

function parseQuestions() {
  var questionWrappers = getQuestionWrappers();
  var questions = [];
  for (var i = 0; i < questionWrappers.length; i++) {
    questions.push({
      title: getQuestionTitle(questionWrappers[i]),
      container: questionWrappers[i],
      inputElement: getInputElement(questionWrappers[i]),
    });
  }
  return questions;
}

const wordInString = (s, word) => new RegExp('\\b' + word + '\\b', 'i').test(s);
// Value is an array of values, or a single value.
// Returns true if the label matches any of the values, or value.
function matchValue(value, label) {
  for (const str of value) {
    // label.includes(str.trim().toLowerCase())
    // if (label.includes(str.trim().toLowerCase())) {
    if (wordInString(label, str.trim().toLowerCase())) {
      return true;
    }
  }
  return false;
}

function autofillQuestion(element, _value) {
  // Error message that is returned if question could not be autofilled.
  var questionError = null;

  // TODO: Sanitize _value input?
  // - Make sure it is either a string or a non-empty array of strings.

  // Value may be a single value, or several values.
  // If single value, turn it into an array for simplicity.
  var value = _value;
  if (!Array.isArray(_value)) {
    value = [_value];
  }
  
  switch(element.nodeName) {
    case 'INPUT': // Standard HTML5 <input> tag
      element.value = value[0]; // When there are multiple values, this will use the first one.
      element.dispatchEvent(new Event('input', { 'bubbles': true }));
      break;
    case 'MAT-RADIO-GROUP': // [Fieldwork] Radio Buttons
      const radioButtons = element.getElementsByClassName('mat-radio-button');
      var valueSelected = false;
      for (const radioButton of radioButtons) {
        const buttonLabel = radioButton.textContent.trim().toLowerCase();
        if (matchValue(value, buttonLabel)) {
          radioButton.getElementsByClassName("mat-radio-container")[0].click();
          valueSelected = true;
          break;
        }
      }
      if (!valueSelected) {
        questionError = `Error: No radio button found with value=[${value}]`;
      }
      break;
    case 'MAT-SELECT': // [Fieldwork] Combo Box
      // Click on the thing to bring up the options first
      element.click();
      // Need a delay to wait for the click to go through
      setTimeout(function() {
        const options = document.getElementsByTagName('mat-option');
        var optionFound = false;
        for (const option of options) {
          const optionLabel = option.textContent.trim().toLowerCase();
          if (matchValue(value, optionLabel)) {
            optionFound = true;
            option.click();
            break;
          }
        }
        if (!optionFound) {
          questionError = `Error: No radio button found with value=[${value}]`;
        }
      }, 200);
      break;
    case 'DIV':
      if (element.classList.contains('RadioButtonGroup')) { // [UserInterviews] Radio Buttons
        const radioButtons = element.getElementsByClassName('FormControlLabel');
        var valueSelected = false;
        for (const radioButton of radioButtons) {
          const buttonLabel = radioButton.textContent.trim().toLowerCase();
          if (matchValue(value, buttonLabel)) {
            radioButton.getElementsByClassName("FormControlLabel__control")[0].click();
            valueSelected = true;
            break;
          }
        }
        if (!valueSelected) {
          questionError = `Error: No radio button found with value=[${value}]`;
        }
      } else if (element.classList.contains('CheckboxButtonGroup')) { // [UserInterviews] Checkboxes
        const radioButtons = element.getElementsByClassName('FormControlLabel');
        var valueSelected = false;
        for (const radioButton of radioButtons) {
          const buttonLabel = radioButton.textContent.trim().toLowerCase();
          if (matchValue(value, buttonLabel)) {
            radioButton.getElementsByClassName("FormControlLabel__control")[0].click();
            valueSelected = true;
            break;
          }
        }
        if (!valueSelected) {
          questionError = `Error: No radio button found with value=[${value}]`;
        }
      } else {
        questionError = `Error: Unsupported input type with tagName=[${element.nodeName}]`;
      }
      break;
    case 'FIELDSET':
      if (element.getAttribute("data-radio-button-group") == '') { // [SurveyMonkey] Radio Buttons
        const radioButtons = element.getElementsByClassName('radio-button-container');
        var valueSelected = false;
        for (const radioButton of radioButtons) {
          const buttonLabel = radioButton.textContent.trim().toLowerCase();
          if (matchValue(value, buttonLabel)) {
            radioButton.getElementsByClassName("radio-button-display")[0].click();
            valueSelected = true;
            break;
          }
        }
        if (!valueSelected) {
          questionError = `Error: No radio button found with value=[${value}]`;
        }
      } else {
        questionError = `Error: Unsupported input type with tagName=[${element.nodeName}]`;
      }
    default:
      questionError = `Error: Unsupported input type with tagName=[${element.nodeName}]`;
      break;
  }

  return questionError;
}

function autofillQuestions(questions) {
  for (var i = 0; i < questions.length; i++) {
    var questionAutofilled = false;

    // Check all the potential answers for autofilling
    for (const [key, data] of Object.entries(answerData)) {
      if (data.value == null || questions[i].inputElement == null) {
        continue;
      }

      // We allow either a string or array of strings for the labels
      var labels = data.label;
      if (!Array.isArray(labels)) {
        labels = [labels];
      }

      // TODO: Faster if we key a dictionary on label and map to answerData.
      if (matchValue(labels, questions[i].title.toLowerCase())) {
        const error = autofillQuestion(questions[i].inputElement, data.value);
        if (error != null) {
          console.log(error);
        } else {
          console.log(`Question autofilled: ${questions[i].title}`);
          questionAutofilled = true;
        }
      }
    }

    if (!questionAutofilled) {
      console.log(`Question unanswered: ${questions[i].title}`);
      // Could not autofill this question.
      // If there isn't a question already selected, select this one
      if (selectedQuestionIndex < 0) {
        selectQuestion(i);
      }
      unansweredQuestions.push(i);
      questions[i].container.style.backgroundColor = "#FF313131";
    }
  }
}
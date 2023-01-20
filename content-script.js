// Participating in market research requires filling out a lot of surveys.
// Even though these companies have all your info, for some reason they want
// you to fill them in over and over for every survey...
// This expedites the process by autocompleting portions of the survey.
//
// Supports: Fieldwork
// Features:
// - Automatically fills in the survey with information provided by user
// TODO: Support other survey platforms like surveymonkey
// TODO: Add configuration file for autofill answers
// TODO: Post on the beery money subreddit
// Controls: 
// - Space to progress survey
// - 1, 2, 3, 4, 5 to select different options

// Hook into the survey's keydown to enable keyboard shortcuts
document.addEventListener("keydown", onKeyDown, true);

// Detect when the survey advances
document.onreadystatechange = () => {
  if (document.readyState == "complete") {
    observeSurveyChanges();
  }
};

// Detect when user advances the page
var hasSurveyProgressed = true;
document.body.addEventListener('click', (event) => {
  var nextBtn = document.getElementsByClassName("btn-next")[0];
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

function onKeyDown(e) {
  var keyCode = e.keyCode;
  switch(keyCode) {
    case 32: // Space key
      if (unansweredQuestions.length > 0) {
        selectNextQuestion();
      } else {
        var nextBtn = document.getElementsByClassName("btn-next")[0];
        if (nextBtn != null) {
          nextBtn.click();
        }
      }
      // Space might be used for selecting/unselecting elements which could mess with this
      e.preventDefault();
      break;
  }

  // If user presses 1-5, quick-select the corresponding radio button for the selected question
  if (keyCode >= 49 && keyCode <= 53 && selectedQuestionIndex >= 0) {
    var radioIndex = keyCode - 49;
    var radioButtons = questions[selectedQuestionIndex].inputElement;
    var radioButton = radioButtons[radioIndex];
    if (radioButton != null) {
      radioButton.getElementsByClassName("mat-radio-container")[0].click();
      selectNextQuestion();
    }
  }
}

function onSurveyLoad() {
  autofill();
  hasSurveyProgressed = false;
  console.log("Survey contents changed!");
}

async function observeSurveyChanges() {
  // Survey is not loaded immediately after the DOM is loaded.
  // Use exponential backoff to attempt to load it.
  var tries = 5;
  var attempts = 0;
  var delayMs = 400;
  var surveyContents = null;
  while (surveyContents == null && attempts < tries) {
    surveyContents = await getSurveyContents(delayMs);
    if (surveyContents == null) {
      attempts += 1;
      delayMs = delayMs * 2;
    }
  }
  if (surveyContents == null) {
    console.log("Error: Failed to observe survey content. Is the survey properly loaded?");
    return;
  }

  // This will trigger whenever the survey changes to a new page.
  var config = {childList: true};
  var observer = new MutationObserver(() => {
    // Sometimes questions will change the survey, but not actually advance it.
    // Circumvent this by detecting if user has progressed the survey first.
    if (hasSurveyProgressed) {
      onSurveyLoad();
    }
  });

  observer.observe(surveyContents, config);

  // Trigger an initial load
  onSurveyLoad();
}

function getSurveyContents(delayMs) {
  return new Promise(resolve => {
    setTimeout(function() {
      var surveyContents = document.getElementsByClassName("cb-survey-content")[0];
      resolve(surveyContents);
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

function selectNextQuestion() {
  if (unansweredQuestions.length > 0) {
    selectedQuestionIndex = unansweredQuestions[0];
    questions[selectedQuestionIndex].container.scrollIntoView();
  }
}

function answerUnansweredQuestion(index) {
  console.log(index);
  console.log(questions);
  questions[index].container.style.backgroundColor = null;
  arrayRemoveByValue(unansweredQuestions, index);
  selectedQuestionIndex = -1;
}

function arrayRemoveByValue(array, value) {
  var index = array.indexOf(value);
  if (index !== -1) {
    array.splice(index, 1);
  }
}

function inputSetValue(element, value) {
  element.value = value;
  element.dispatchEvent(new Event('input', { 'bubbles': true }));
}

function selectRadioValue(radioButtons, value) {
  var valueSelected = false;
  for (var i = 0; i < radioButtons.length; i++) {
    var buttonValue = radioButtons[i].getElementsByClassName("mat-radio-label-content")[0].textContent.trim();
    if (buttonValue == value) {
      radioButtons[i].getElementsByClassName("mat-radio-container")[0].click();
      valueSelected = true;
      break;
    }
  }
  if (!valueSelected) {
    console.log(`Error: No radio button found with value=[${value}]`);
  }
}

function parseQuestions() {
  var questionWrappers = document.getElementsByClassName('cb-question-item-wrapper-outer');
  var questions = [];
  for (var i = 0; i < questionWrappers.length; i++) {
    var inputElement = null;
    var field = questionWrappers[i].getElementsByClassName("mat-form-field-infix")[0];
    if (field != null) {
      inputElement = field.firstChild;
    } else {
      inputElement = questionWrappers[i].getElementsByTagName("mat-radio-button");
    }
    questions.push({
      title: questionWrappers[i].getElementsByClassName("cb-question-item-title")[0].textContent.trim(),
      container: questionWrappers[i],
      inputElement,
    });
  }
  return questions;
}

function autofillQuestions(questions) {
  for (var i = 0; i < questions.length; i++) {
    if (questions[i].title == terms) {
      console.log(`Autofilling... Terms / Conditions`);
    } else {
      console.log(`Autofilling... ${questions[i].title}`);
    }
    switch(questions[i].title) {
      case terms:
        selectRadioValue(questions[i].inputElement, "I understand");
        break;
      case "First Name":
        inputSetValue(questions[i].inputElement, "[First Name]");
        break;
      case "Last Name":
        inputSetValue(questions[i].inputElement, "[Last Name]");
        break;
      case "Phone Number":
        inputSetValue(questions[i].inputElement, "[Phone Number]");
        break;
      case "City":
        inputSetValue(questions[i].inputElement, "[City]");
        break;
      case "State":
        questions[i].inputElement.click();
        setTimeout(function() {
          document.getElementById("mat-option-47").click(); // [State]
        }, 200);
        break;
      case "Zip Code":
        inputSetValue(questions[i].inputElement, "[Zip]");
        break;
      case "Email Address":
        inputSetValue(questions[i].inputElement, "[Email]");
        break;
      case "What is your age?":
        inputSetValue(questions[i].inputElement, "[Age]");
        break;
      case "What gender do you identify as?":
        inputSetValue(questions[i].inputElement, "[Gender]");
        break;
      case "How would you best describe your ethnicity?":
        selectRadioValue(questions[i].inputElement, "East Asian");
        break;
      case "How would you best describe yourself?":
        selectRadioValue(questions[i].inputElement, "Asian");
        break;
      case "When was the last time you participated in a focus group, usability test, or other type of market research?":
        selectRadioValue(questions[i].inputElement, "Within the past 3 months");
        break;
      default: // Could not autofill this question
        // If there isn't a question already selected, select this one
        if (selectedQuestionIndex < 0) {
          selectedQuestionIndex = i;
        }
        unansweredQuestions.push(i);
        questions[i].container.style.backgroundColor = "#FF313131";
        break;
    }
  }
}

var terms = `Your voluntary participation in Market research with Fieldwork constitutes an independent contractor relationship, not an employment relationship.
Your information is safe with us. Fieldwork, Inc. will not sell, distribute, or otherwise release personally identifiable information it collects to a third party unless it is a necessary component of research you have agreed to participate in.  This means, if you speak with one of our recruiters and are qualified for a specific project at a specific date and time AND you have agreed to participate, we may share information with our client.  In this case, we have a data protection agreement in place with the recipient of your data to ensure they adhere to information security standards as well. 
Additionally, you will be required to complete a Non-Disclosure Agreement within 24 hours of your invitation to participate.  This will arrive by email once you are qualified and confirmed.
 
By continuing, you agree to these terms.`;
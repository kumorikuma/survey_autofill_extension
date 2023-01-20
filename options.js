// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const formElement = document.getElementById('main_form');
const spinnerElement = document.getElementById('loading_spinner');
const inputElements = formElement.getElementsByTagName("input");

const firstNameElement = document.getElementById('first_name');
const lastNameElement = document.getElementById('last_name');
const genderElement = document.getElementById('gender');
const ageElement = document.getElementById('age');
const phoneNumberElement = document.getElementById('phone_number');
const emailElement = document.getElementById('email');
const cityElement = document.getElementById('city');
const stateElement = document.getElementById('state');
const zipElement = document.getElementById('zip');
const ethnicityElement = document.getElementById('ethnicity');

formElement.style.visibility = 'hidden';

document.getElementById('main_form').onsubmit = (e) => {
  e.preventDefault();

  const data = {};
  for (const inputElement of inputElements) {
    if (inputElement.value == '') {
      continue;
    }
    data[inputElement.id] = inputElement.value;
  }

  console.log(data);

  spinnerElement.style.visibility = 'visible';
  chrome.storage.local.set(data, () => {
    spinnerElement.style.visibility = 'hidden';
  });
};

chrome.storage.local.get(null, (result) => {
  console.log(JSON.stringify(result, null, 4));
  for (const inputElement of inputElements) {
    if (inputElement.id in result) {
      inputElement.value = result[inputElement.id];
    }
  }

  // Display the form and hide the loader
  formElement.style.visibility = 'visible';
  spinnerElement.style.visibility = 'hidden';
});

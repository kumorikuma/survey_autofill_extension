// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

let isRunning = false;
const runBtn = document.getElementById("runScript");

function updateRunButton(isRunning) {
    if (isRunning) {
        runBtn.innerHTML = "Whoa stop refreshing!";
    } else {
        runBtn.innerHTML = "Let's buy this shit!";
    }
}

chrome.storage.local.get(['isRunning'], function(result) {
    isRunning = result.isRunning;
    runBtn.disabled = false;
    updateRunButton(isRunning);
});

runBtn.onclick = function(element) {
    if (!isRunning) {
        isRunning = true;
        runBtn.innerHTML = "Whoa stop refreshing!";
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            const activeTabId = tabs[0].id;
            chrome.runtime.sendMessage({event: "setActiveTab", tabId: activeTabId});
            chrome.tabs.executeScript(activeTabId, {
                file: 'addToCart.js'
            });
        });
    } else {
        isRunning = false;
        runBtn.innerHTML = "Let's buy this shit!";
        chrome.runtime.sendMessage({event: "stop"});
    }
};
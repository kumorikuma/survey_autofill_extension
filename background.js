chrome.runtime.onInstalled.addListener(function() {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [
            	new chrome.declarativeContent.PageStateMatcher({
                	pageUrl: { hostEquals: 'participate.fieldwork.com' },
            	}),
                new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: { hostEquals: 'surveymonkey.com' },
                }),                
            	new chrome.declarativeContent.PageStateMatcher({
                	pageUrl: { hostEquals: 'userinterviews.com' },
            	})],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }]);
    });
});

chrome.runtime.onMessage.addListener(function(message) {
    switch (message.action) {
        case "openOptionsPage":
            openOptionsPage();
            break;
        default:
            break;
    }
});

function openOptionsPage() {
    chrome.runtime.openOptionsPage();
}
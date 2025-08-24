chrome.action.onClicked.addListener((tab) => {
    // This is a workaround to make the popup a bit more reliable
    // The command is already opening the popup, but this ensures a clean start
    // for all scripts.
    console.log("Action button clicked or command triggered.");
});
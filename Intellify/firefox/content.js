// content.js - UPDATED
// This script runs on every page
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scroll') {
        const toolCode = request.tool_code;
        let elementToScrollTo = null;
        let message = 'Could not find the requested element.';

        try {
            if (toolCode.tool_name === 'scroll_to_text' && toolCode.text) {
                const text = toolCode.text.toLowerCase();
                // We're now querying a more specific set of elements to avoid scrolling to the body
                const allElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, li, span, div');
                for (let i = 0; i < allElements.length; i++) {
                    const el = allElements[i];
                    if (el.textContent && el.textContent.toLowerCase().includes(text)) {
                        elementToScrollTo = el;
                        message = `Scrolled to the text containing "${toolCode.text}".`;
                        break;
                    }
                }
            } else if (toolCode.tool_name === 'scroll_to_selector' && toolCode.selector) {
                elementToScrollTo = document.querySelector(toolCode.selector);
                if (elementToScrollTo) {
                    message = `Scrolled to the element with selector "${toolCode.selector}".`;
                }
            }
        } catch (e) {
            message = 'An error occurred while trying to scroll.';
            console.error('Scrolling error:', e);
        }

        if (elementToScrollTo) {
            elementToScrollTo.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        sendResponse({ message: message });
        return true; // Indicates asynchronous response
    }
});
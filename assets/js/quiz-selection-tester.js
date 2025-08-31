'use strict';
/**
 * Quiz Selection Tester - Production Mode
 * 
 * In production: clicking an answer directly marks and checks it
 * Check button is completely hidden
 */

(function($) {
    
    // Configuration
    const config = {
        debug: false,  // Set to false for production
        showAlerts: false,
        logToConsole: false,  // Disable logging in production
        autoTriggerCheck: true,  // Always on in production
        checkButtonOpacity: 0,  // Completely invisible in production
        productionMode: true  // Production mode flag
    };
    
    /**
     * Hide check buttons completely in production
     */
    function hideCheckButtons() {
        // In production, completely hide check buttons
        const checkButtonStyles = config.productionMode ? {
            'display': 'none',
            'visibility': 'hidden',
            'opacity': '0',
            'position': 'absolute',
            'pointer-events': 'none',
            'z-index': '-9999',
            'width': '0',
            'height': '0',
            'overflow': 'hidden'
        } : {
            'opacity': config.checkButtonOpacity,
            'pointer-events': 'none',
            'position': 'absolute',
            'z-index': '-1',
            'visibility': 'visible'
        };
        
        // Apply to existing buttons
        $('input.wpProQuiz_button[name="check"]').css(checkButtonStyles);
        
        // Watch for new buttons
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    $(mutation.addedNodes).find('input.wpProQuiz_button[name="check"]').css(checkButtonStyles);
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    /**
     * Initialize the selection handler
     */
    function initSelectionHandler() {
        if (!config.productionMode) {
            console.log('[SelectionTester] Initializing with auto-check feature...');
        }
        
        // Hide check buttons
        hideCheckButtons();
        
        // Handle answer clicks - simplified for production
        $(document).on('click', '.wpProQuiz_questionListItem', function(e) {
            // Let the main plugin handle the click-to-check behavior
            // Just ensure the check button is hidden
            const $question = $(this).closest('.wpProQuiz_listItem');
            const $checkButton = $question.find('input.wpProQuiz_button[name="check"]');
            
            if ($checkButton.length) {
                $checkButton.css({
                    'display': 'none',
                    'visibility': 'hidden',
                    'position': 'absolute',
                    'pointer-events': 'none'
                });
            }
        });
        
        // Block direct check button clicks
        $(document).on('click', 'input.wpProQuiz_button[name="check"]', function(e) {
            if (!e.isTrigger && config.productionMode) {
                e.preventDefault();
                e.stopImmediatePropagation();
                return false;
            }
        });
    }
    
    /**
     * Utility function to check current state of all radios in a question
     */
    window.checkQuestionState = function(questionIndex) {
        const $question = $('.wpProQuiz_listItem').eq(questionIndex);
        if (!$question.length) {
            console.error('Question not found at index:', questionIndex);
            return;
        }
        
        console.log('[SelectionTester] Question state:');
        console.log('- Locked:', $question.hasClass('lilac-locked'));
        
        $question.find('input[type="radio"]').each(function(i) {
            const $radio = $(this);
            console.log(`- Radio ${i}:`, {
                value: $radio.val(),
                checked: $radio.prop('checked'),
                disabled: $radio.prop('disabled'),
                text: $radio.closest('label').text().trim().substring(0, 50) + '...'
            });
        });
    };
    
    /**
     * Utility to simulate selection
     */
    window.simulateSelection = function(questionIndex, answerIndex) {
        const $question = $('.wpProQuiz_listItem').eq(questionIndex);
        const $radio = $question.find('input[type="radio"]').eq(answerIndex);
        
        if (!$radio.length) {
            console.error('Radio not found');
            return;
        }
        
        if ($radio.prop('disabled')) {
            console.warn('Radio is disabled, cannot select');
            return;
        }
        
        $radio.click();
        console.log('[SelectionTester] Simulated click on radio:', answerIndex);
    };
    
    // Initialize when document is ready
    $(document).ready(function() {
        // Wait for main plugin
        setTimeout(initSelectionHandler, 500);
        
        // Only show debug indicator if not in production
        if (config.debug && !config.productionMode) {
            $('<div>')
                .text('Selection Tester Active (Debug Mode)')
                .css({
                    'position': 'fixed',
                    'bottom': '10px',
                    'right': '10px',
                    'background': '#ff9800',
                    'color': 'white',
                    'padding': '5px 10px',
                    'border-radius': '4px',
                    'font-size': '12px',
                    'z-index': '9999'
                })
                .appendTo('body');
        }
    });
    
})(jQuery); 
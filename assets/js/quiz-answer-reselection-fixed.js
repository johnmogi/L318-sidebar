/**
 * LearnDash Quiz - Answer Reselection
 * 
 * Enables users to reselect and submit answers after incorrect submission
 * Part of the Enforce Hint feature for the Lilac Quiz Sidebar plugin
 */
(function($) {
    'use strict';
    
    // Configuration
    const config = {
        debug: false,                // Set to false to disable debug messages
        enforceHintDelay: 300,       // Delay in ms after checking answer before handling result
        observerDelay: 1000,         // Delay before setting up MutationObserver
        tooltipText: 'טעית! להמשך חובה לקחת רמז!',  // Hebrew text: You're wrong! You must take a hint to continue!
        answerDetection: true        // Enable answer detection
    };
    
    // Store for question data
    const questionData = {};
    
    // Debug logger with consistent formatting
    const log = {
        info: function(message, data) {
            if (config.debug) {
                const prefix = '%c[HINT] ';
                const style = 'color: #007700;';
                if (data) {
                    console.log(prefix + message, style, data);
                } else {
                    console.log(prefix + message, style);
                }
            }
        },
        error: function(message, data) {
            const prefix = '%c[HINT ERROR] ';
            const style = 'color: #c62828;';
            if (data) {
                console.error(prefix + message, style, data);
            } else {
                console.error(prefix + message, style);
            }
        }
    };
    
    // Initialize on document ready
    $(document).ready(function() {
        initQuizAnswerReselection();
    });
    
    // Also initialize after a short delay to catch dynamically loaded content
    setTimeout(function() {
        initQuizAnswerReselection();
    }, config.observerDelay);
    
    /**
     * Initialize the quiz answer reselection functionality
     */
    function initQuizAnswerReselection() {
        log.info('Initializing hint enforcement module');
        
        // Remove any debug containers that may interfere
        removeDebugContainers();
        
        // Make sure inputs are always enabled
        enableAllInputs();
        
        // Set up event handlers
        setupEventHandlers();
        
        // Perform initial setup for questions
        $('.wpProQuiz_listItem').each(setupQuestion);
        
        // Set up MutationObserver to watch for DOM changes
        setupObserver();
    }
    
    /**
     * Set up event handlers for quiz navigation and answer checking
     */
    function setupEventHandlers() {
        log.info('Setting up event handlers');
        
        // When hint button is clicked, record that hint was viewed
        $(document).on('click', '.wpProQuiz_TipButton, .wpProQuiz_hint', function() {
            const $question = $(this).closest('.wpProQuiz_listItem');
            $question.data('hint-viewed', true);
            $question.attr('data-hint-viewed', 'true');
            log.info('Hint button clicked, recorded as viewed');
            
            // Remove highlight and tooltip since hint was viewed
            removeHintHighlight($question);
        });
        
        // Detect when answer is checked and LearnDash displays correct/incorrect
        $(document).on('DOMNodeInserted', '.wpProQuiz_incorrect, .wpProQuiz_correct', function(e) {
            const $feedback = $(this);
            const $question = $feedback.closest('.wpProQuiz_listItem');
            const isCorrect = $feedback.hasClass('wpProQuiz_correct');
            
            log.info('Answer feedback received: ' + (isCorrect ? 'correct' : 'incorrect'));
            
            // Wait a short delay to allow LearnDash to complete its processing
            setTimeout(function() {
                handleAnswerResult($question, isCorrect);
            }, config.enforceHintDelay);
        });
        
        // When user changes answer selection
        $(document).on('change', '.wpProQuiz_questionInput', function() {
            const $input = $(this);
            const $question = $input.closest('.wpProQuiz_listItem');
            
            // If this question previously had an incorrect answer, show check button
            if ($question.find('.wpProQuiz_incorrect').is(':visible')) {
                // Hide the feedback message but keep hint visible if shown
                $question.find('.wpProQuiz_incorrect, .wpProQuiz_correct').hide();
                
                // Make sure the check button is visible
                $question.find('.wpProQuiz_button[name="check"]').show()
                    .css('display', 'inline-block')
                    .prop('disabled', false);
                
                // Hide tooltip if it exists
                $question.find('.hint-tooltip').remove();
            }
        });
        
        // Prevent proceeding with Next button if answer is incorrect
        $(document).on('click', '.wpProQuiz_button[name="next"]', function(e) {
            const $question = $(this).closest('.wpProQuiz_listItem');
            
            if ($question.find('.wpProQuiz_incorrect').is(':visible')) {
                e.preventDefault();
                e.stopPropagation();
                
                // Show tooltip to take hint
                highlightHintButton($question);
                return false;
            }
        });
    }
    
    /**
     * Setup an individual question
     */
    function setupQuestion(index, element) {
        const $question = element ? $(element) : $(this);
        
        // Ensure inputs are always enabled
        enableInputsForQuestion($question);
        
        // Store hint status
        $question.attr('data-has-hint', $question.find('.wpProQuiz_hint, .wpProQuiz_TipButton').length > 0 ? 'true' : 'false');
        $question.attr('data-hint-viewed', 'false');
        
        // Make hint button more visible from the start
        const $hintBtn = $question.find('.wpProQuiz_TipButton, .wpProQuiz_hint').first();
        if ($hintBtn.length) {
            $hintBtn.css({
                'visibility': 'visible',
                'display': 'inline-block',
                'background-color': '#e0e0e0',
                'color': '#333',
                'font-weight': 'bold',
                'opacity': '1'
            });
        }
        
        // Check if question is already answered
        setTimeout(function() {
            if ($question.find('.wpProQuiz_incorrect').is(':visible')) {
                handleAnswerResult($question, false);
            } else if ($question.find('.wpProQuiz_correct').is(':visible')) {
                handleAnswerResult($question, true);
            }
        }, config.enforceHintDelay);
    }
    
    /**
     * Handle the answer result (correct or incorrect)
     */
    function handleAnswerResult($question, isCorrect) {
        // Get hint status
        const hintViewed = $question.data('hint-viewed') === true || $question.attr('data-hint-viewed') === 'true';
        const hasHint = $question.attr('data-has-hint') === 'true';
        
        // If the answer is incorrect
        if (isCorrect === false) {
            log.info('Incorrect answer detected, enforcing hint view');
            
            // Hide the Next button
            $question.find('.wpProQuiz_button[name="next"]').hide()
                .css('display', 'none')
                .attr('style', 'display: none !important; visibility: hidden !important;');
            
            // Make sure the check button is visible for re-submission with !important overrides
            $question.find('.wpProQuiz_button[name="check"]')
                .css({
                    'display': 'inline-block !important',
                    'visibility': 'visible !important',
                    'opacity': '1 !important',
                    'pointer-events': 'auto !important',
                    'position': 'relative !important',
                    'z-index': '1000 !important',
                    'background-color': '#4CAF50 !important',
                    'color': 'white !important',
                    'border': '2px solid #2E7D32 !important',
                    'border-radius': '4px !important',
                    'padding': '8px 24px !important',
                    'cursor': 'pointer !important',
                    'font-size': '16px !important',
                    'font-weight': 'bold !important',
                    'margin': '0 0 0 10px !important',
                    'box-shadow': '0 2px 5px rgba(0,0,0,0.2) !important',
                    'float': 'left !important',
                    'line-height': 'normal !important',
                    'text-align': 'center !important',
                    'vertical-align': 'middle !important',
                    'white-space': 'nowrap !important',
                    'text-decoration': 'none !important',
                    'text-transform': 'none !important',
                    'min-width': '100px !important',
                    'box-sizing': 'border-box !important',
                    'transition': '0.3s !important'
                })
                .prop('disabled', false)
                .show();
            
            // Make sure inputs are enabled
            enableInputsForQuestion($question);
            
            // If there's a hint and it hasn't been viewed, highlight it
            if (hasHint && !hintViewed) {
                highlightHintButton($question);
            }
        } 
        // If the answer is correct, show the Next button
        else if (isCorrect === true) {
            log.info('Correct answer detected, showing Next button');
            
            $question.find('.wpProQuiz_button[name="next"]').show()
                .css('display', 'inline-block')
                .removeAttr('style');
                
            // Hide any tooltip
            $question.find('.hint-tooltip').remove();
        }
    }
    
    /**
     * Make sure inputs for a question are enabled and clickable
     */
    function enableInputsForQuestion($question) {
        $question.find('.wpProQuiz_questionInput').prop('disabled', false)
            .removeAttr('disabled')
            .css('pointer-events', 'auto');
        
        $question.find('.wpProQuiz_questionListItem label').css('pointer-events', 'auto');
    }
    
    /**
     * Enable all inputs in the quiz
     */
    function enableAllInputs() {
        $('.wpProQuiz_questionInput').prop('disabled', false)
            .removeAttr('disabled')
            .css('pointer-events', 'auto');
        
        $('.wpProQuiz_questionListItem label').css('pointer-events', 'auto');
    }
    
    /**
     * Highlight the hint button with tooltip
     */
    function highlightHintButton($question) {
        const $hintBtn = $question.find('.wpProQuiz_TipButton, .wpProQuiz_hint').first();
        
        if (!$hintBtn.length) {
            log.error('No hint button found for question', $question);
            return;
        }
        
        // Add highlighting
        $hintBtn.addClass('highlight')
            .css({
                'animation': 'pulse-button 1.5s infinite',
                'background-color': '#ffc107',
                'font-weight': 'bold',
                'border': '2px solid #ff9800',
                'box-shadow': '0 0 10px rgba(255, 193, 7, 0.5)',
                'position': 'relative',
                'z-index': '100'
            });
        
        // Add CSS for animation if not already added
        if (!$('#hint-animation-style').length) {
            $('<style id="hint-animation-style">@keyframes pulse-button {0% {transform: scale(1);} 50% {transform: scale(1.1);} 100% {transform: scale(1);}}</style>').appendTo('head');
        }
        
        // Remove any existing tooltips
        $question.find('.hint-tooltip').remove();
        
        // Add tooltip message
        const $tooltip = $('<div class="hint-tooltip">' + config.tooltipText + '</div>');
        $tooltip.insertAfter($hintBtn);
        
        // Style the tooltip
        $tooltip.css({
            'position': 'absolute',
            'background-color': '#ffc107',
            'color': '#333',
            'padding': '5px 10px',
            'border-radius': '4px',
            'font-size': '14px',
            'font-weight': 'bold',
            'z-index': '999',
            'margin-top': '5px',
            'box-shadow': '0 2px 5px rgba(0,0,0,0.2)',
            'max-width': '200px',
            'text-align': 'center'
        });
    }
    
    /**
     * Remove hint button highlight and tooltip
     */
    function removeHintHighlight($question) {
        const $hintBtn = $question.find('.wpProQuiz_TipButton, .wpProQuiz_hint').first();
        
        if ($hintBtn.length) {
            $hintBtn.removeClass('highlight')
                .css({
                    'animation': 'none',
                    'background-color': '',
                    'font-weight': '',
                    'border': '',
                    'box-shadow': '',
                    'position': '',
                    'z-index': ''
                });
        }
        
        // Remove tooltip
        $question.find('.hint-tooltip').remove();
    }
    
    /**
     * Remove any debug containers that might interfere with the quiz
     */
    function removeDebugContainers() {
        // Remove any debug containers that may exist from previous versions
        $('#media-debug-container, #quiz-debug-panel').remove();
    }
    
    /**
     * Set up a mutation observer to watch for dynamically added questions
     */
    function setupObserver() {
        // Check if MutationObserver is supported
        if (!window.MutationObserver) {
            log.error('MutationObserver not supported in this browser');
            return;
        }
        
        // Create an observer instance
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                // If nodes were added
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    // Check for any new quiz questions
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        
                        if (node.nodeType === 1) { // Element node
                            if ($(node).hasClass('wpProQuiz_listItem')) {
                                // Setup the new question
                                setupQuestion(0, node);
                            } else {
                                // Look for questions inside the added node
                                $(node).find('.wpProQuiz_listItem').each(setupQuestion);
                            }
                        }
                    }
                }
            });
        });
        
        // Start observing the entire document
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        log.info('MutationObserver setup complete');
    }
    
})(jQuery);

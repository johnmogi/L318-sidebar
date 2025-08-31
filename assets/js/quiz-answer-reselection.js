'use strict';
/**
 * LearnDash Quiz - Answer Reselection
 * 
 * Enables users to reselect and submit answers after incorrect submission
 * Part of the Enforce Hint feature for the Lilac Quiz Sidebar plugin
 * Version 1.2.1 - Enhanced Next button visibility
 */

// Check for jQuery
if (typeof jQuery === 'undefined') {
    console.error('Lilac Quiz: jQuery is not loaded!');
}

// Main plugin code
(function($) {
    //remove check button
    $(function() {
        $('input.wpProQuiz_QuestionButton[name="check"]').each(function() {
            this.setAttribute('style', 'position: absolute !important; opacity: 0.5 !important;');
        });
    });
    
    // Configuration
    const config = {
        debug: false,                  // Disable debug logging by default
        enforceHintDelay: 300,        // Delay before processing hint enforcement (ms)
        highlightNext: true,          // Whether to highlight the Next button
        highlightHintOnSelection: true, // Enable hint highlighting
        tooltipText: 'Incorrect - please try again',  // Simplified message
        answerDetection: true,       // Keep answer detection enabled
        forceHideNextButton: false,  // Show next button after any answer
        strictLogging: false,        // Keep detailed logging off
        enableAnswerValidation: true, // Enable basic validation without hints
        enableVisualDebugger: false  // Disable visual debugger by default
    };
    
    // Store for question data
    const questionData = {};
    
    // Logger - only log in development
    const log = {
        info: function() { if (config.strictLogging) console.log(...arguments); },
        answer: function() { if (config.strictLogging) console.log(...arguments); },
        error: function() { console.error(...arguments); },
        questionSummary: function() { if (config.strictLogging) console.log(...arguments); },
        warn: function() { console.warn(...arguments); }
    };
    
    /**
     * Extract question data from the DOM
     */
    function extractQuestionData() {
        log.info('Scanning for question data...');
        
        // Get all quiz questions
        $('.wpProQuiz_listItem').each(function(index) {
                                    const $question = $(this);
            const questionIndex = $question.index();
            const questionId = questionIndex + 1;
            
            // Store basic question information
            questionData[questionId] = {
                id: questionId,
                hasHint: $question.find('.wpProQuiz_TipButton, .wpProQuiz_hint').length > 0,
                correctAnswerFound: false
            };
        });
    }

    /**
     * Style all buttons in the quiz for consistent appearance
     */
    function styleAllButtons() {
        // Style all quiz buttons for consistency
        $('.wpProQuiz_button, .wpProQuiz_QuestionButton').each(function() {
            const $btn = $(this);
            const btnName = $btn.attr('name');
            
            // Common button styling
            $btn.css({
                'display': 'inline-block',
                'border': 'none',
                'border-radius': '4px',
                'padding': '8px 15px',
                'margin': '5px',
                'font-size': '16px',
                'font-weight': 'bold',
                'cursor': 'pointer',
                'box-shadow': '0 2px 4px rgba(0,0,0,0.2)',
                'transition': 'all 0.3s ease'
            });
            
            // Button-specific styling
            if (btnName === 'check') {
                $btn.css('background-color', '#28a745');
            } else if (btnName === 'next') {
                $btn.css('background-color', '#007bff');
            } else if (btnName === 'back') {
                $btn.css('background-color', '#6c757d');
            }
        });
    }

    /**
     * Show hint in a modal
     */
    function showHintModal($question) {
        const $hintContent = $question.find('.wpProQuiz_tipp');
        if ($hintContent.length) {
            // Create modal container if it doesn't exist
            if (!$('#lilac-hint-modal').length) {
                $('body').append(`
                    <div id="lilac-hint-modal" class="lilac-modal">
                        <div class="lilac-modal-content">
                            <span class="lilac-modal-close">&times;</span>
                            <div class="lilac-modal-body"></div>
                        </div>
                    </div>
                `);
                
                // Add modal styles if not already added
                if (!$('#lilac-modal-styles').length) {
                    $('<style id="lilac-modal-styles">')
                        .text(`
                            .lilac-modal {
                                display: none;
                                position: fixed;
                                z-index: 9999;
                                left: 0;
                                top: 0;
                                width: 100%;
                                height: 100%;
                                background-color: rgba(0,0,0,0.5);
                            }
                            .lilac-modal-content {
                                background-color: #fefefe;
                                margin: 15% auto;  /* Changed from 5% to 15% */
                                padding: 20px;
                                border: 1px solid #888;
                                width: 90%;
                                max-width: 800px;
                                max-height: 60vh;  /* Reduced from 80vh */
                                overflow-y: auto;
                                border-radius: 8px;
                                position: relative;
                            }
                            .lilac-modal-close {
                                color: #aaa;
                                float: right;
                                font-size: 28px;
                                font-weight: bold;
                                cursor: pointer;
                            }
                            .lilac-modal-close:hover {
                                color: black;
                            }
                            .lilac-modal-body {
                                margin-top: 20px;
                                direction: rtl;
                                text-align: right;
                            }
                            
                            /* Override LearnDash green border for correct incomplete answers */
                            .learndash-wrapper .wpProQuiz_content .wpProQuiz_questionListItem.wpProQuiz_answerCorrectIncomplete label {
                                border-color: inherit !important;
                            }
                        `)
                        .appendTo('head');
                }
            }
            
            // Show modal with hint content
            const $modal = $('#lilac-hint-modal');
            $modal.find('.lilac-modal-body').html($hintContent.html());
            $modal.fadeIn(200);
            
            // Handle close button
            $modal.find('.lilac-modal-close').off('click').on('click', function() {
                $modal.fadeOut(200);
            });
            
            // Close on outside click
            $(window).off('click.lilac-modal').on('click.lilac-modal', function(e) {
                if ($(e.target).is($modal)) {
                    $modal.fadeOut(200);
                }
            });
        }
    }

    /**
     * Handle the result of an answer submission
     */
    function handleAnswerResult($question, isCorrect, questionId) {
        // Remove any previous messages
        $question.find('.lilac-correct-answer-message').remove();

        if (isCorrect) {
            // Remove any locks when answer is correct
            $question.removeClass('lilac-locked');
            
            // Add success message with Next button
            const $successMessage = $('<div class="lilac-correct-answer-message" style="background-color: rgb(232, 245, 233); border: 1px solid rgb(76, 175, 80); border-radius: 4px; padding: 10px 15px; margin: 15px 0px; text-align: right; font-size: 16px; display: flex; align-items: center; justify-content: space-between; direction: rtl;">' +
                '<span style="font-weight:bold;color:#4CAF50;">✓ תשובה נכונה!</span>' +
                '<span>לחץ על הבא להמשיך</span>' +
                '<button type="button" class="lilac-force-next" style="display: inline-block; visibility: visible; background-color: rgb(46, 89, 217); color: white; font-weight: bold; border: 2px solid rgb(24, 53, 155); border-radius: 4px; padding: 8px 24px; cursor: pointer; font-size: 16px; margin-right: 10px; box-shadow: rgba(0, 0, 0, 0.2) 0px 3px 5px;">הבא</button>' +
                '</div>');
            
            // Insert above the native buttons
            const $firstBtn = $question.find('input.wpProQuiz_button').first();
            if ($firstBtn.length) {
                $successMessage.insertBefore($firstBtn);
            } else {
                $question.append($successMessage);
            }

            // Disable all inputs after correct answer
            $question.find('.wpProQuiz_questionInput').prop('disabled', true)
                .closest('.wpProQuiz_questionListItem')
                .css({
                    'pointer-events': 'none',
                    'cursor': 'not-allowed',
                    'opacity': '0.6'
                });

            // Show the Next button
            const $nextButton = $question.find('.wpProQuiz_button[name="next"]');
            $nextButton.css({
                'float': 'left',
                'margin': '0px 10px',
                'display': 'inline-block',
                'visibility': 'visible',
                'opacity': '1',
                'pointer-events': 'auto'
            }).prop('disabled', false);
            
        } else {
            // For incorrect answers, lock the question
            console.log('[LilacQuiz] Incorrect answer - locking question and showing hint prompt');
            
            // Apply lock
            $question.addClass('lilac-locked');
            
            // Disable answer selection
            $question.find('.wpProQuiz_questionInput').prop('disabled', true);
            $question.find('.wpProQuiz_questionListItem').css({
                'pointer-events': 'none',
                'cursor': 'not-allowed',
                'opacity': '0.7'
            });
            
            // Hide check button
            $question.find('.wpProQuiz_button[name="check"]').css({
                'display': 'none'
            });
            
            // Add hint message to existing response area or create new one
            let $responseArea = $question.find('.wpProQuiz_response');
            if (!$responseArea.length) {
                $responseArea = $('<div class="wpProQuiz_response"></div>');
                $question.find('.wpProQuiz_questionList').after($responseArea);
            }
            
            // Add our hint message
            const $hintMessage = $('<div class="lilac-hint-message" style="background-color: rgb(255, 243, 224); border: 1px solid rgb(255, 152, 0); border-radius: 4px; padding: 10px 15px; margin: 15px 0px; text-align: right; font-size: 16px; display: flex; align-items: center; justify-content: space-between; direction: rtl;">' +
                '<span style="font-weight:bold;color:#e74c3c;">❌ תשובה שגויה!</span>' +
                '<span>לחץ על רמז לקבלת עזרה</span>' +
                '<button type="button" class="lilac-force-hint" style="display: inline-block; visibility: visible; background-color: rgb(255, 152, 0); color: white; font-weight: bold; border: 2px solid rgb(230, 126, 34); border-radius: 4px; padding: 8px 24px; cursor: pointer; font-size: 16px; margin-right: 10px; box-shadow: rgba(0, 0, 0, 0.2) 0px 3px 5px;">רמז</button>' +
                '</div>');
            
            // Prepend our message to the response area
            $responseArea.prepend($hintMessage);
            
            // Make sure hint button is visible
            const $hintButton = $question.find('.wpProQuiz_button[name="tip"]');
            $hintButton.prop('disabled', false).css({
                'float': 'left',
                'display': 'inline-block',
                'margin': '5px',
                'visibility': 'visible',
                'opacity': '1',
                'pointer-events': 'auto',
                'cursor': 'pointer',
                'background-color': 'rgb(23, 162, 184)'
            });
        }
    }

    /**
     * Handle hint button clicks - simplified
     */
    function handleHintViewing($question) {
        console.log('[LilacQuiz] Hint clicked, showing modal and unlocking question');
        
        // Show the hint modal FIRST
        showHintModal($question);
        
        // Remove lock
        $question.removeClass('lilac-locked');
        
        // Remove hint message
        $question.find('.lilac-hint-message').remove();
        
        // Re-enable answer selection
        $question.find('.wpProQuiz_questionInput').prop('disabled', false);
        $question.find('.wpProQuiz_questionListItem').css({
            'pointer-events': 'auto',
            'cursor': 'pointer',
            'opacity': '1'
        });
        
        // Clear any previous selection to ensure fresh start
        $question.find('.wpProQuiz_questionInput').prop('checked', false);
    }

    /**
     * Set up event handlers for quiz interaction
     */
    function setupEventHandlers() {
        // Remove any existing handlers
        $(document).off('click.simplifiedCheck');

        // Handle check button clicks - let native quiz process first
        $(document).on('click.simplifiedCheck', 'input.wpProQuiz_button[name="check"]', function(e) {
            const $question = $(this).closest('.wpProQuiz_listItem');
            const $selected = $question.find('.wpProQuiz_questionInput:checked');

            if (!$selected.length) return;

            console.log('[LilacQuiz] Check button clicked, waiting for quiz calculation...');
            
            // Let the native quiz handle the check first
            // Then watch for the result
            watchForAnswerResult($question);
        });

        // Block interactions on locked questions
        $(document).on('click', 
            '.lilac-locked .wpProQuiz_questionListItem label, ' +
            '.lilac-locked .wpProQuiz_questionInput', 
        function(e) {
            console.log('🔒 [LilacQuiz] Blocked - must view hint first');
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
        });

        // Handle hint button clicks - both native and our custom button
        $(document).on('click', '.wpProQuiz_button[name="tip"], .wpProQuiz_TipButton, .lilac-force-hint', function(e) {
            e.preventDefault();
            const $question = $(this).closest('.wpProQuiz_listItem');
            
            // Check if clicking our custom hint button
            if ($(this).hasClass('lilac-force-hint')) {
                console.log('[LilacQuiz] Custom hint button clicked');
                
                // Unlock the question and show modal
                if ($question.hasClass('lilac-locked')) {
                    handleHintViewing($question);
                }
                
                // Don't trigger native button, we handle it ourselves
                return false;
            }
            
            // For native hint button, also show our modal if question is locked
            if ($question.hasClass('lilac-locked')) {
                handleHintViewing($question);
            }
        });

        // Handle answer selection (remove messages)
        $(document).on('change', '.wpProQuiz_questionInput', function() {
            const $question = $(this).closest('.wpProQuiz_listItem');
            $question.find('.lilac-correct-answer-message').remove();
        });

        // Handle next button in success message
        $(document).on('click', '.lilac-force-next', function(e) {
            e.preventDefault();
            const $question = $(this).closest('.wpProQuiz_listItem');
            $question.find('.wpProQuiz_button[name="next"]').trigger('click');
        });
    }

    /**
     * Watch for answer result after quiz calculation
     */
    function watchForAnswerResult($question) {
        let checkCount = 0;
        const maxChecks = 30; // Increased to 3 seconds
        
        const checkInterval = setInterval(function() {
            checkCount++;
            
            // First priority: Look for answer state classes
            const $selected = $question.find('.wpProQuiz_questionInput:checked');
            if ($selected.length) {
                const $wrapper = $selected.closest('.wpProQuiz_questionListItem');
                const classes = $wrapper.attr('class') || '';
                
                // Only log every 5th check to reduce console spam
                if (checkCount % 5 === 1) {
                    console.log('[LilacQuiz] Checking classes:', classes);
                }
                
                // Check if quiz has applied result classes
                if ($wrapper.hasClass('wpProQuiz_answerCorrect') || 
                    $wrapper.hasClass('wpProQuiz_answerCorrectIncomplete')) {
                    console.log('[LilacQuiz] Correct answer detected! Classes:', classes);
                    clearInterval(checkInterval);
                    handleAnswerResult($question, true);
                    return;
                } else if ($wrapper.hasClass('wpProQuiz_answerIncorrect')) {
                    console.log('[LilacQuiz] Incorrect answer detected! Classes:', classes);
                    clearInterval(checkInterval);
                    handleAnswerResult($question, false);
                    return;
                }
            }
            
            // Second priority: Check for native response area with content
            const $response = $question.find('.wpProQuiz_response');
            if ($response.length && $response.text().trim().length > 0) {
                // Response area has content, now check the answer classes one more time
                const $selected = $question.find('.wpProQuiz_questionInput:checked');
                if ($selected.length) {
                    const $wrapper = $selected.closest('.wpProQuiz_questionListItem');
                    
                    if ($wrapper.hasClass('wpProQuiz_answerIncorrect')) {
                        console.log('[LilacQuiz] Incorrect answer detected via response area');
                        clearInterval(checkInterval);
                        handleAnswerResult($question, false);
                        return;
                    } else if ($wrapper.hasClass('wpProQuiz_answerCorrect') || 
                              $wrapper.hasClass('wpProQuiz_answerCorrectIncomplete')) {
                        console.log('[LilacQuiz] Correct answer detected via response area');
                        clearInterval(checkInterval);
                        handleAnswerResult($question, true);
                        return;
                    }
                }
            }
            
            // Third priority: Check all answer items for the incorrect class
            const $incorrectAnswer = $question.find('.wpProQuiz_answerIncorrect');
            if ($incorrectAnswer.length) {
                console.log('[LilacQuiz] Found incorrect answer marker on element');
                clearInterval(checkInterval);
                handleAnswerResult($question, false);
                return;
            }
            
            if (checkCount >= maxChecks) {
                console.log('[LilacQuiz] Timeout waiting for answer result after 3 seconds');
                clearInterval(checkInterval);
                
                // As a fallback, check one more time for any answer indicators
                const $anyIncorrect = $question.find('.wpProQuiz_answerIncorrect');
                const $anyCorrect = $question.find('.wpProQuiz_answerCorrect, .wpProQuiz_answerCorrectIncomplete');
                
                if ($anyIncorrect.length) {
                    handleAnswerResult($question, false);
                } else if ($anyCorrect.length) {
                    handleAnswerResult($question, true);
                }
            }
        }, 100);
    }

    /**
     * Show the Next button for a question
     */
    function showNextButton($question) {
        const $nextButton = $question.find('.wpProQuiz_button[name="next"]');
        if ($nextButton.length) {
            $nextButton.show().css({
                    'display': 'inline-block',
                    'visibility': 'visible',
                    'opacity': '1',
                'pointer-events': 'auto'
            });
        }
    }

    /**
     * Initialize the quiz answer reselection functionality
     */
    function initQuizAnswerReselection() {
        log.info('Initializing quiz answer reselection');
        
        // Scan for all existing questions and extract data
        extractQuestionData();
        
        // Apply consistent styling to all buttons
        styleAllButtons();
        
        // Set up event handlers
        setupEventHandlers();
        
        // Add click-to-check behavior to answer items
        setupAnswerClickToCheck();
        
        // Check for any already-correct answers and handle them
        $('.wpProQuiz_listItem').each(function() {
            const $question = $(this);
            if ($question.find('.wpProQuiz_correct').is(':visible')) {
                log.info('Found correct answer already selected, forcing Next button visibility');
                showNextButton($question);
            }
        });
    }

    /**
     * Setup click-to-check behavior on answer items
     */
    function setupAnswerClickToCheck() {
        // Use event delegation for answer list items
        $(document).on('click', '.wpProQuiz_questionListItem', function(e) {
            const $listItem = $(this);
            const $question = $listItem.closest('.wpProQuiz_listItem');
            
            // Don't process if question is locked
            if ($question.hasClass('lilac-locked')) {
                return false;
            }
            
            // Don't process if clicking directly on the radio button (let it handle naturally)
            if ($(e.target).is('input[type="radio"]')) {
                return;
            }
            
            // Find the radio button in this list item
            const $radio = $listItem.find('input[type="radio"]');
            if ($radio.length && !$radio.prop('disabled')) {
                // Select the radio button
                $radio.prop('checked', true).trigger('change');
                
                // Small delay then trigger check
                setTimeout(function() {
                    const $checkButton = $question.find('input.wpProQuiz_button[name="check"]');
                    if ($checkButton.length && !$checkButton.prop('disabled')) {
                        console.log('[LilacQuiz] Auto-checking from answer click');
                        $checkButton.trigger('click');
                    }
                }, 100);
            }
        });
        
        // Add hover effect to show it's clickable
        $('<style>')
            .text(`
                .wpProQuiz_questionListItem:not(.lilac-locked .wpProQuiz_questionListItem) {
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                .wpProQuiz_questionListItem:not(.lilac-locked .wpProQuiz_questionListItem):hover {
                    background-color: rgba(0, 0, 0, 0.05);
                }
            `)
            .appendTo('head');
    }

    /**
     * Set up a mutation observer to watch for dynamically added questions
     */
    function setupObserver() {
        log.info('MutationObserver setup complete');
        
        // Create a mutation observer to watch for dynamically added elements
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Convert added nodes to jQuery collection for easier filtering
                    const $addedNodes = $(mutation.addedNodes).filter(function() {
                        return this.nodeType === 1; // Only process Element nodes
                    });
                    
                    // Style any hint buttons in the added nodes
                    $addedNodes.find('.wpProQuiz_TipButton, .wpProQuiz_hint, .lilac-show-hint').css({
                        'visibility': 'visible !important',
                        'display': 'inline-block !important',
                        'opacity': '1',
                        'background-color': '#ff9800',
                        'color': 'white',
                        'font-weight': 'bold',
                        'border': '2px solid #e67e22',
                        'border-radius': '4px',
                        'padding': '8px 24px',
                        'cursor': 'pointer',
                        'font-size': '16px',
                        'margin-right': '10px',
                        'box-shadow': '0 3px 5px rgba(0,0,0,0.2)',
                        'pointer-events': 'auto',
                        'z-index': '1000'
                    });
                }
            });
        });
        
        // Start observing the entire document
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Set up answer observer for detecting answer changes
     */
    function setupAnswerObserver() {
        // Disabled - this was causing premature triggering
        return;
    }

    // Initialize the plugin
    $(document).ready(function() {
        initQuizAnswerReselection();
        setupObserver();
        setupAnswerObserver();
        
        // Check if first question needs immediate processing
        setTimeout(function() {
            const $firstQuestion = $('.wpProQuiz_listItem').first();
            if ($firstQuestion.length) {
                const $checked = $firstQuestion.find('.wpProQuiz_questionInput:checked');
                if ($checked.length) {
                    const $wrapper = $checked.closest('.wpProQuiz_questionListItem');
                    if ($wrapper.hasClass('wpProQuiz_answerCorrect') || 
                        $wrapper.hasClass('wpProQuiz_answerCorrectIncomplete')) {
                        console.log('[LilacQuiz] First question already has correct answer');
                        handleAnswerResult($firstQuestion, true);
                    }
                }
            }
        }, 1000);
    });

})(jQuery);

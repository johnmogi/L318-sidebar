/**
 * LearnDash Quiz - Answer Detection for Hint Enforcement
 * 
 * Detects correct answers and ensures Next button visibility logic
 * Part of the Enforce Hint feature for the Lilac Quiz Sidebar plugin
 */
(function($) {
    'use strict';
    
    // Configuration
    const config = {
        debug: true,               // Enable debug for answer detection
        observerDelay: 500,        // Delay before setting up MutationObserver
        answerChangeDelay: 300     // Delay after answer selection before checking
    };
    
    // Store for question data
    const questionData = {};
    
    // Debug logger
    const log = {
        info: function(message, data) {
            if (config.debug) {
                if (data) {
                    console.log('%cANSWER DETECTION: ' + message, 'color: #007700; font-weight: bold;', data);
                } else {
                    console.log('%cANSWER DETECTION: ' + message, 'color: #007700; font-weight: bold;');
                }
            }
        },
        error: function(message, data) {
            if (data) {
                console.error('ANSWER DETECTION ERROR: ' + message, data);
            } else {
                console.error('ANSWER DETECTION ERROR: ' + message);
            }
        }
    };
    
    // Initialize on document ready
    $(document).ready(function() {
        initAnswerDetection();
    });
    
    // Also initialize after a short delay to catch dynamically loaded content
    setTimeout(function() {
        initAnswerDetection();
    }, config.observerDelay);

    /**
     * Initialize the answer detection module
     */
    function initAnswerDetection() {
        log.info('Initializing answer detection module');
        
        // Discover correct answers from LearnDash
        discoverCorrectAnswers();
        
        // Log the discovered answers
        logAnswerSummary();
        
        // Set up event handlers for answer selection
        setupEventHandlers();
        
        // Set up MutationObserver for dynamic content
        setupObserver();
    }
    
    /**
     * Log a summary of the discovered correct answers
     */
    function logAnswerSummary() {
        console.log('%c==== ANSWER DETECTION COMPLETE ====', 'color: #007700; font-weight: bold; font-size: 14px;');
        console.log('%cDetected questions: ', 'color: #007700; font-weight: bold;', questionData);
        
        // Simplified summary 
        const answerSummary = {};
        Object.keys(questionData).forEach(qId => {
            if (questionData[qId].correctAnswerFound) {
                answerSummary[qId] = {
                    type: questionData[qId].type,
                    correct: questionData[qId].correct
                };
            }
        });
        console.log('%cCORRECT ANSWER SUMMARY:', 'color: #007700; font-weight: bold; font-size: 14px;', answerSummary);
    }
    
    /**
     * Set up event handlers
     */
    function setupEventHandlers() {
        // Track input selection to check if correct answer is selected
        $(document).on('change', '.wpProQuiz_questionInput', function() {
            const $input = $(this);
            const $question = $input.closest('.wpProQuiz_listItem');
            const questionIndex = $question.index();
            const questionId = questionIndex + 1;
            
            // If this question previously had an incorrect answer and user is now changing selection
            if ($question.find('.wpProQuiz_incorrect').is(':visible')) {
                // Hide any visible feedback
                $question.find('.wpProQuiz_incorrect, .wpProQuiz_correct').hide();
                
                // Make sure the check button is visible again
                $question.find('.wpProQuiz_button[name="check"]').show()
                    .css('display', 'inline-block')
                    .prop('disabled', false);
            }
            
            // Allow a short delay for all inputs to update in case of multiple choice questions
            setTimeout(function() {
                checkAnswerAndUpdateButtons($question, questionId);
            }, config.answerChangeDelay);
        });
    }
    
    /**
     * Check if the selected answer is correct and update UI accordingly
     */
    function checkAnswerAndUpdateButtons($question, questionId) {
        // Check if answer is correct using our detection
        const isCorrect = isSelectedAnswerCorrect($question, questionId);
        log.info(`Answer selection for question ${questionId}: ${isCorrect ? 'correct' : 'incorrect'}`);
        
        // Get hint status
        const hintViewed = $question.data('hint-viewed') === true || 
                           $question.attr('data-hint-viewed') === 'true';
        const hasHint = $question.attr('data-has-hint') === 'true' || 
                       $question.find('.wpProQuiz_hint, .wpProQuiz_TipButton').length > 0;
        
        log.info(`Question ${questionId} status: correct=${isCorrect}, hint viewed=${hintViewed}, has hint=${hasHint}`);
        
        // If correct answer selected and hint has been viewed (or no hint available)
        if (isCorrect && (hintViewed || !hasHint)) {
            // Show the Next button
            $question.find('.wpProQuiz_button[name="next"]').show()
                .css('display', 'inline-block')
                .removeAttr('style');
                
            log.info(`Question ${questionId}: Enabling Next button - correct answer with hint viewed`);
        } 
        // If correct but hint not viewed yet, may need to keep the Next button hidden
        else if (isCorrect && hasHint && !hintViewed) {
            // Only if the question has been previously marked incorrect
            if ($question.find('.wpProQuiz_incorrect').length > 0 || 
                $question.data('was-incorrect') === true) {
                
                // Keep Next button hidden until hint is viewed
                $question.find('.wpProQuiz_button[name="next"]').hide()
                    .css('display', 'none')
                    .attr('style', 'display: none !important; visibility: hidden !important;');
                    
                log.info(`Question ${questionId}: Keeping Next button hidden - hint not viewed`);
            }
        }
        // If incorrect, always hide the Next button if a hint is available
        else if (!isCorrect && hasHint) {
            // Mark that this question was answered incorrectly
            $question.data('was-incorrect', true);
            
            // Hide the Next button
            $question.find('.wpProQuiz_button[name="next"]').hide()
                .css('display', 'none')
                .attr('style', 'display: none !important; visibility: hidden !important;');
                
            log.info(`Question ${questionId}: Hiding Next button - incorrect answer`);
        }
    }
    
    /**
     * Check if the selected answer(s) match the correct answer(s)
     * 
     * @param {jQuery} $question - The question container element
     * @param {number} questionId - The question ID (1-based index)
     * @returns {boolean} - Whether the selected answer is correct
     */
    function isSelectedAnswerCorrect($question, questionId) {
        // If we don't have question data, can't verify
        if (!questionData[questionId] || !questionData[questionId].correctAnswerFound) {
            log.info(`No correct answer data for question ${questionId}`);
            return false;
        }
        
        const questionType = questionData[questionId].type;
        const correctAnswer = questionData[questionId].correct;
        
        // Get all answer items in this question
        const $answerItems = $question.find('.wpProQuiz_questionListItem');
        
        if (questionType === 'single') {
            // For single choice questions
            const selectedIndex = $answerItems.find('input:checked').closest('.wpProQuiz_questionListItem').index();
            
            if (selectedIndex === -1) {
                // Nothing selected yet
                return false;
            }
            
            const isCorrect = (selectedIndex === correctAnswer);
            return isCorrect;
            
        } else if (questionType === 'multiple') {
            // For multiple choice questions - all correct options must be selected and no incorrect ones
            let allCorrectSelected = true;
            let noIncorrectSelected = true;
            
            $answerItems.each(function(index) {
                const $input = $(this).find('input');
                const isSelected = $input.is(':checked');
                const shouldBeSelected = correctAnswer.includes(index);
                
                if (shouldBeSelected && !isSelected) {
                    allCorrectSelected = false;
                }
                
                if (!shouldBeSelected && isSelected) {
                    noIncorrectSelected = false;
                }
            });
            
            return allCorrectSelected && noIncorrectSelected;
        }
        
        // Default fallback - let LearnDash handle it
        return false;
    }
    
    /**
     * Discover correct answers from LearnDash
     */
    function discoverCorrectAnswers() {
        // Process each question
        $('.wpProQuiz_listItem').each(function() {
            const $question = $(this);
            const questionId = $question.index() + 1;
            
            // First, check for existing answer feedback in the DOM
            const $feedback = $question.find('.wpProQuiz_response');
            const hasFeedback = $feedback.length > 0;
            
            if (hasFeedback) {
                // Check for correct/incorrect feedback
                const isCorrect = $feedback.find('.wpProQuiz_correct').is(':visible');
                
                if (isCorrect) {
                    // If we have correct feedback, find which answer is correct
                    findCorrectAnswerFromFeedback($question, questionId);
                } else {
                    // If we have feedback but it's not correct, try other methods
                    extractAnswerFromQuestion($question, questionId);
                }
            } else {
                // No feedback yet, try to extract from question structure
                extractAnswerFromQuestion($question, questionId);
            }
        });
    }
    
    /**
     * Extract correct answer from question structure
     */
    function extractAnswerFromQuestion($question, questionId) {
        // Check if this is a single or multiple choice question
        if ($question.find('input[type="radio"]').length > 0) {
            extractSingleChoiceAnswer($question, questionId);
        } else if ($question.find('input[type="checkbox"]').length > 0) {
            extractMultipleChoiceAnswer($question, questionId);
        }
    }
    
    /**
     * Find correct answer from feedback in the DOM
     */
    function findCorrectAnswerFromFeedback($question, questionId) {
        const $answers = $question.find('.wpProQuiz_questionListItem');
        let correctIndex = -1;
        
        $answers.each(function(index) {
            const $answer = $(this);
            // Look for visual indicators of correct answer
            if ($answer.find('.wpProQuiz_answerCorrect').length > 0 ||
                $answer.find('.wpProQuiz_classCorrect').length > 0 ||
                $answer.hasClass('wpProQuiz_answerCorrect') ||
                $answer.hasClass('wpProQuiz_classCorrect')) {
                correctIndex = index;
                return false; // Exit the each loop
            }
        });
        
        if (correctIndex !== -1) {
            if (!questionData[questionId]) {
                questionData[questionId] = { type: 'single' };
            }
            
            questionData[questionId].correct = correctIndex;
            questionData[questionId].correctAnswerFound = true;
            
            log.info(`Found correct answer for question ${questionId} at index ${correctIndex}`);
        }
    }
    
    /**
     * Extract correct answer for single choice questions
     */
    function extractSingleChoiceAnswer($question, questionId) {
        const $answers = $question.find('.wpProQuiz_questionListItem');
        let correctIndex = -1;
        
        // First, check for any visual indicators of the correct answer
        $answers.each(function(index) {
            const $answer = $(this);
            const $input = $answer.find('input[type="radio"]');
            
            // Check multiple indicators of correctness
            const isCorrect = 
                $answer.hasClass('wpProQuiz_answerCorrect') || 
                $answer.hasClass('wpProQuiz_answerCorrectIncomplete') ||
                $answer.find('.wpProQuiz_answerCorrect, .wpProQuiz_classCorrect, .wpProQuiz_answerCorrectIncomplete').length > 0 ||
                $answer.data('correct') === true ||
                $answer.attr('data-correct') === 'true' ||
                $input.hasClass('wpProQuiz_answerCorrect') ||
                $input.hasClass('wpProQuiz_answerCorrectIncomplete') ||
                $input.data('correct') === true ||
                $input.attr('data-correct') === 'true' ||
                $input.closest('li').hasClass('wpProQuiz_answerCorrect') ||
                $input.closest('li').hasClass('wpProQuiz_answerCorrectIncomplete');
            
            if (isCorrect) {
                correctIndex = index;
                return false; // Exit the each loop after finding the first correct answer
            }
        });
        
        // If no visual indicators found, check the input values for correctness
        if (correctIndex === -1) {
            $answers.each(function(index) {
                const $input = $(this).find('input[type="radio"]');
                if ($input.is(':checked') && $question.find('.wpProQuiz_correct').is(':visible')) {
                    correctIndex = index;
                    return false;
                }
            });
        }
        
        // If we found a correct answer, store it
        if (correctIndex !== -1) {
            if (!questionData[questionId]) {
                questionData[questionId] = { type: 'single' };
            }
            
            questionData[questionId].correct = correctIndex;
            questionData[questionId].correctAnswerFound = true;
            
            if (config.debug) {
                const answerText = $answers.eq(correctIndex).find('label').text().trim();
                console.log(`%c[ANSWER DETECTION] Found correct answer for question ${questionId}: ${correctIndex} (${answerText})`, 
                           'color: #007700; font-weight: bold;');
            }
        } else if (config.debug) {
            console.warn(`%c[ANSWER DETECTION] Could not determine correct answer for question ${questionId}`, 
                        'color: #ff9800; font-weight: bold;');
        }
    }
    
    /**
     * Extract correct answers for multiple choice questions
     */
    function extractMultipleChoiceAnswer($question, questionId) {
        const $answers = $question.find('.wpProQuiz_questionListItem');
        const correctIndices = [];
        
        $answers.each(function(index) {
            const $answer = $(this);
            const $input = $answer.find('input[type="checkbox"]');
            
            const isCorrect = 
                $answer.hasClass('wpProQuiz_answerCorrect') || 
                $answer.find('.wpProQuiz_classCorrect').length > 0 ||
                $answer.data('correct') === true ||
                $answer.attr('data-correct') === 'true' ||
                $input.hasClass('wpProQuiz_answerCorrect') ||
                $input.data('correct') === true ||
                $input.attr('data-correct') === 'true';
            
            if (isCorrect) {
                correctIndices.push(index);
                
                if (!questionData[questionId]) {
                    questionData[questionId] = { type: 'multiple' };
                }
                
                questionData[questionId].correct = correctIndices;
                questionData[questionId].correctAnswerFound = true;
            }
        });
    }
    
    /**
     * Set up a mutation observer to watch for dynamically added questions
     */
    function setupObserver() {
        if (!window.MutationObserver) {
            log.error('MutationObserver not supported in this browser');
            return;
        }
        
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        
                        if (node.nodeType === 1) {
                            if ($(node).hasClass('wpProQuiz_listItem')) {
                                discoverCorrectAnswers();
                                break;
                            } else if ($(node).find('.wpProQuiz_listItem').length > 0) {
                                discoverCorrectAnswers();
                                break;
                            }
                        }
                    }
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Public API
    window.quizAnswerDetection = {
        getCorrectAnswer: function(questionId) {
            return questionData[questionId]?.correct;
        },
        isAnswerCorrect: function(questionId, answerIndex) {
            if (!questionData[questionId] || !questionData[questionId].correctAnswerFound) {
                return null; // No answer data available
            }
            
            if (questionData[questionId].type === 'single') {
                return questionData[questionId].correct === answerIndex;
            } else if (questionData[questionId].type === 'multiple') {
                return questionData[questionId].correct.includes(answerIndex);
            }
            
            return false;
        }
    };
    
})(jQuery);

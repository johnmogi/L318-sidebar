/**
 * Direct Sidebar Media
 * 
 * Handles answer-specific media in the quiz sidebar
 */

(function($) {
    'use strict';
    
    // Debug flag - true to enable console logs
    const DEBUG = true;
    
    // Log debug messages
    function debug(message, ...args) {
        if (DEBUG) {
            console.log('DIRECT SIDEBAR DEBUG: ' + message, ...args);
        }
    }
    
    // Store current question and answer IDs
    let currentQuestionId = null;
    let currentAnswerId = null;
    
    /**
     * Initialize answer-specific media functionality
     */
    function init() {
        debug('Initializing direct sidebar media handler');
        
        // Wait for quiz to be ready
        $(document).on('learndashQuizReady', function() {
            debug('LearnDash quiz is ready');
            attachAnswerListeners();
        });
        
        // Fallback for when the event doesn't fire
        setTimeout(function() {
            if ($('.wpProQuiz_questionList').length > 0) {
                debug('Quiz found via timeout');
                attachAnswerListeners();
            }
        }, 1000);
    }
    
    /**
     * Attach listeners to answer options
     */
    function attachAnswerListeners() {
        debug('Attaching answer listeners');
        
        // Get current question ID
        currentQuestionId = getCurrentQuestionId();
        debug('Current question ID:', currentQuestionId);
        
        // Listen for answer selection on multiple choice
        $(document).on('change', '.wpProQuiz_questionList input[type="radio"], .wpProQuiz_questionList input[type="checkbox"]', function() {
            const $this = $(this);
            const answerId = $this.attr('name').replace('question_', '');
            
            debug('Answer selected:', answerId);
            
            // Check if the input is checked
            if ($this.prop('checked')) {
                handleAnswerSelection(answerId);
            }
        });
        
        // For select (dropdown) questions
        $(document).on('change', '.wpProQuiz_questionList select', function() {
            const answerId = $(this).attr('name').replace('question_', '');
            debug('Select answer changed:', answerId);
            handleAnswerSelection(answerId);
        });
        
        // For matrix sort questions, it's more complex as they are drag-and-drop
        // So we'll need to listen for the drop event
        $(document).on('mouseup', '.wpProQuiz_matrixSortString', function() {
            // Wait a bit for the drop to complete
            setTimeout(function() {
                const questionId = getCurrentQuestionId();
                debug('Matrix sort question interaction detected, ID:', questionId);
                // For matrix sorts, we don't have a specific answer ID
                // So we'll just use the question ID
                handleAnswerSelection(questionId);
            }, 500);
        });
        
        // For cloze questions (fill in the blank)
        $(document).on('change', '.wpProQuiz_cloze input', function() {
            const questionId = getCurrentQuestionId();
            debug('Cloze question changed, ID:', questionId);
            handleAnswerSelection(questionId);
        });
        
        // Also listen for next/previous question navigation
        $(document).on('click', '.wpProQuiz_button', function() {
            setTimeout(function() {
                currentQuestionId = getCurrentQuestionId();
                debug('Question navigation detected, new ID:', currentQuestionId);
            }, 500);
        });
    }
    
    /**
     * Get the current question ID
     */
    function getCurrentQuestionId() {
        // Try to get from data attribute on active question
        const $activeQuestion = $('.wpProQuiz_listItem[style*="display: block"]');
        if ($activeQuestion.length) {
            const idFromClass = $activeQuestion.attr('id');
            if (idFromClass) {
                return idFromClass.replace('wpProQuiz_listItem_', '');
            }
        }
        
        // If we can't get from data attribute, try to extract from an input
        const $firstInput = $('.wpProQuiz_questionList input').first();
        if ($firstInput.length) {
            const nameAttr = $firstInput.attr('name');
            if (nameAttr && nameAttr.includes('question')) {
                return nameAttr.replace('question_', '');
            }
        }
        
        debug('Could not determine question ID');
        return null;
    }
    
    /**
     * Handle the selection of an answer
     */
    function handleAnswerSelection(answerId) {
        if (answerId === currentAnswerId) {
            debug('Same answer already selected, not fetching media again');
            return;
        }
        
        currentAnswerId = answerId;
        debug('Fetching media for question:', currentQuestionId, 'answer:', currentAnswerId);
        
        // Prepare data for AJAX request
        const data = {
            action: 'get_answer_specific_media',
            question_id: currentQuestionId,
            answer_id: currentAnswerId,
            nonce: lilacQuizSidebar.nonce
        };
        
        console.log('DIRECT SIDEBAR DEBUG: Making AJAX request with data:', data);
        console.log('DIRECT SIDEBAR DEBUG: AJAX URL:', lilacQuizSidebar.ajaxUrl);
        
        // Make AJAX request
        $.ajax({
            url: lilacQuizSidebar.ajaxUrl,
            type: 'POST',
            data: data,
            success: function(response) {
                console.log('DIRECT SIDEBAR DEBUG: AJAX response received:', response);
                
                if (response.success && response.data) {
                    const mediaData = response.data.media || response.data;
                    console.log('DIRECT SIDEBAR DEBUG: Media data extracted:', mediaData);
                    
                    // Update sidebar with the answer-specific media
                    if (typeof window.displayMedia === 'function') {
                        // Use the displayMedia function from quiz-sidebar-media.js
                        window.displayMedia(mediaData);
                    } else {
                        debug('displayMedia function not found, cannot update sidebar');
                    }
                } else {
                    debug('No media found for this answer or error in response');
                }
            },
            error: function(xhr, status, error) {
                console.error('DIRECT SIDEBAR DEBUG: AJAX error:', error);
                debug('Error fetching answer media:', error);
            }
        });
    }
    
    // Make displayMedia function available globally
    // This will be implemented in quiz-sidebar-media.js
    $(document).ready(function() {
        init();
    });
    
})(jQuery);

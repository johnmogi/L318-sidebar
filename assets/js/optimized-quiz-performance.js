/**
 * Optimized Quiz Performance Handler
 * Replaces multiple setTimeout calls with efficient event-driven approach
 * Designed for quizzes with 300+ questions
 */

(function($) {
    'use strict';
    console.log('Optimized Quiz Performance Handler');
    const config = {
        maxQuestions: 500,
        batchSize: 50,
        debounceDelay: 100,
        maxRetries: 3,
        cacheTimeout: 30000, // 30 seconds
        debug: false
    };

    let state = {
        initialized: false,
        currentQuestion: null,
        mediaCache: new Map(),
        observers: [],
        debounceTimers: new Map(),
        retryCount: 0
    };

    /**
     * Debounced function executor
     */
    function debounce(key, func, delay = config.debounceDelay) {
        if (state.debounceTimers.has(key)) {
            clearTimeout(state.debounceTimers.get(key));
        }
        
        const timer = setTimeout(() => {
            func();
            state.debounceTimers.delete(key);
        }, delay);
        
        state.debounceTimers.set(key, timer);
    }

    /**
     * Efficient media cache with TTL
     */
    function cacheMedia(questionId, mediaData) {
        state.mediaCache.set(questionId, {
            data: mediaData,
            timestamp: Date.now()
        });
    }

    function getCachedMedia(questionId) {
        const cached = state.mediaCache.get(questionId);
        if (cached && (Date.now() - cached.timestamp) < config.cacheTimeout) {
            return cached.data;
        }
        state.mediaCache.delete(questionId);
        return null;
    }

    /**
     * Optimized question detection without DOM polling
     */
    function getCurrentQuestionId() {
        // Try multiple selectors efficiently
        const selectors = [
            '.wpProQuiz_listItem.wpProQuiz_reviewQuestionTarget',
            '.wpProQuiz_listItem:visible',
            '.wpProQuiz_questionList .wpProQuiz_listItem'
        ];

        for (const selector of selectors) {
            const $question = $(selector).first();
            if ($question.length) {
                const questionId = $question.data('question-id') || 
                                $question.find('[data-question-id]').data('question-id') ||
                                $question.index() + 1;
                return questionId;
            }
        }
        return null;
    }

    /**
     * Optimized media loading with batching
     */
    function loadQuestionMedia(questionId, force = false) {
        if (!questionId) return;

        // Check cache first
        if (!force) {
            const cached = getCachedMedia(questionId);
            if (cached) {
                displayMedia(cached);
                return;
            }
        }

        // Use fetch API for better performance than jQuery AJAX
        const formData = new FormData();
        formData.append('action', 'get_question_acf_media');
        formData.append('question_id', questionId);
        formData.append('nonce', lilacQuizSidebar.nonce);

        fetch(lilacQuizSidebar.ajaxUrl, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data.media) {
                cacheMedia(questionId, data.data.media);
                displayMedia(data.data.media);
            } else {
                displayFallbackMedia();
            }
        })
        .catch(error => {
            if (config.debug) console.error('Media load error:', error);
            displayFallbackMedia();
        });
    }

    /**
     * Efficient media display without DOM manipulation overhead
     */
    function displayMedia(mediaData) {
        const $container = $('#question-media');
        if (!$container.length) return;

        // Use DocumentFragment for efficient DOM updates
        const fragment = document.createDocumentFragment();
        
        if (mediaData.type === 'image') {
            const img = document.createElement('img');
            img.src = mediaData.url;
            img.alt = mediaData.alt || 'Question media';
            img.loading = 'lazy'; // Native lazy loading
            fragment.appendChild(img);
        } else if (mediaData.type === 'video') {
            const video = document.createElement('video');
            video.src = mediaData.url;
            video.controls = true;
            video.preload = 'metadata'; // Optimize loading
            fragment.appendChild(video);
        }

        // Single DOM update
        $container[0].innerHTML = '';
        $container[0].appendChild(fragment);
    }

    function displayFallbackMedia() {
        const $container = $('#question-media');
        if ($container.length) {
            $container.html('<div class="no-media">No media available</div>');
        }
    }

    /**
     * Optimized hint enforcement without polling
     */
    function setupHintEnforcement() {
        if (!lilacQuizSidebar.enforceHint) return;

        // Use event delegation for better performance
        $(document).on('click', '.wpProQuiz_questionInput', function(e) {
            const $input = $(this);
            const $question = $input.closest('.wpProQuiz_listItem');
            
            debounce('answer-check-' + $question.index(), () => {
                checkAnswerAndEnforceHint($question, $input);
            }, 50);
        });
    }

    function checkAnswerAndEnforceHint($question, $input) {
        // Immediate DOM check without setTimeout
        const $wrapper = $input.closest('.wpProQuiz_questionListItem');
        
        // Use MutationObserver for efficient DOM change detection
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = $(mutation.target);
                    if (target.hasClass('wpProQuiz_answerIncorrect')) {
                        handleIncorrectAnswer($question, target);
                        observer.disconnect();
                    } else if (target.hasClass('wpProQuiz_answerCorrect')) {
                        handleCorrectAnswer($question, target);
                        observer.disconnect();
                    }
                }
            });
        });

        observer.observe($wrapper[0], {
            attributes: true,
            attributeFilter: ['class']
        });

        // Store observer for cleanup
        state.observers.push(observer);
    }

    function handleIncorrectAnswer($question, $wrapper) {
        if (config.debug) console.log('Incorrect answer detected');
        
        // Disable navigation immediately
        $('.wpProQuiz_button').prop('disabled', true);
        
        // Show hint requirement
        showHintRequirement($question);
    }

    function handleCorrectAnswer($question, $wrapper) {
        if (config.debug) console.log('Correct answer detected');
        
        // Apply styling efficiently
        $wrapper.addClass('lilac-correct-answer');
        
        // Re-enable navigation
        $('.wpProQuiz_button').prop('disabled', false);
    }

    function showHintRequirement($question) {
        const $hintButton = $question.find('.wpProQuiz_tip');
        if ($hintButton.length) {
            $hintButton.addClass('lilac-hint-required').trigger('click');
        }
    }

    /**
     * Efficient initialization without multiple setTimeout calls
     */
    function initialize() {
        if (state.initialized) return;

        // Single initialization check
        const $quiz = $('.wpProQuiz_content');
        if (!$quiz.length) {
            // Use requestAnimationFrame instead of setTimeout for better performance
            requestAnimationFrame(initialize);
            return;
        }

        state.initialized = true;

        // Setup optimized event listeners
        setupQuestionNavigation();
        setupHintEnforcement();
        
        // Load initial media
        const currentQuestionId = getCurrentQuestionId();
        if (currentQuestionId) {
            loadQuestionMedia(currentQuestionId);
        }

        if (config.debug) console.log('Optimized quiz performance handler initialized');
    }

    function setupQuestionNavigation() {
        // Single event listener for all navigation
        $(document).on('click', '.wpProQuiz_button, .wpProQuiz_listItem', function() {
            debounce('navigation', () => {
                const questionId = getCurrentQuestionId();
                if (questionId && questionId !== state.currentQuestion) {
                    state.currentQuestion = questionId;
                    loadQuestionMedia(questionId);
                }
            });
        });
    }

    /**
     * Cleanup function to prevent memory leaks
     */
    function cleanup() {
        // Clear all timers
        state.debounceTimers.forEach(timer => clearTimeout(timer));
        state.debounceTimers.clear();
        
        // Disconnect all observers
        state.observers.forEach(observer => observer.disconnect());
        state.observers = [];
        
        // Clear cache
        state.mediaCache.clear();
    }

    // Initialize when DOM is ready
    $(document).ready(initialize);

    // Cleanup on page unload
    $(window).on('beforeunload', cleanup);

    // Expose for debugging
    if (config.debug) {
        window.LilacQuizOptimizer = {
            state,
            config,
            loadQuestionMedia,
            cleanup
        };
    }


})(jQuery);
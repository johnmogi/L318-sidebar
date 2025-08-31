/**
 * Enhanced Quiz Sidebar Layout JavaScript
 * 
 * Fixes layout issues and improves sidebar functionality
 * for the Lilac Quiz Sidebar plugin.
 */

(function($) {
    'use strict';

    // Configuration
    var config = {
        debug: false,
        retryAttempts: 3,
        retryDelay: 2000,
        mediaLoadTimeout: 10000,
        resizeDebounce: 250
    };

    // State management
    var state = {
        currentQuestionId: null,
        mediaCache: {},
        retryCount: 0,
        isLoading: false,
        layoutInitialized: false
    };

    /**
     * Initialize the enhanced sidebar functionality
     */
    function init() {
        log('Initializing enhanced quiz sidebar layout');
        
        // Wait for DOM to be fully ready
        $(document).ready(function() {
            setupLayout();
            setupEventListeners();
            setupMediaHandling();
            setupErrorHandling();
            
            // Initial media load
            setTimeout(loadCurrentQuestionMedia, 500);
            
            log('Enhanced sidebar initialization complete');
        });
    }

    /**
     * Setup responsive layout handling
     */
    function setupLayout() {
        log('Setting up responsive layout');
        
        var $container = $('.quiz-container');
        var $sidebar = $('.ld-quiz-sidebar');
        var $content = $('.quiz-content');
        
        if (!$container.length || !$sidebar.length || !$content.length) {
            error('Required layout elements not found');
            return;
        }

        // Add layout classes for enhanced styling
        $container.addClass('lilac-enhanced-layout');
        $sidebar.addClass('lilac-enhanced-sidebar');
        $content.addClass('lilac-enhanced-content');

        // Handle window resize with debouncing
        var resizeTimer;
        $(window).on('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                handleLayoutResize();
            }, config.resizeDebounce);
        });

        // Initial layout adjustment
        handleLayoutResize();
        
        state.layoutInitialized = true;
        log('Layout setup complete');
    }

    /**
     * Handle layout adjustments on resize
     */
    function handleLayoutResize() {
        var windowWidth = $(window).width();
        var $container = $('.quiz-container');
        
        // Add responsive classes based on screen size
        $container.removeClass('layout-mobile layout-tablet layout-desktop layout-large');
        
        if (windowWidth <= 768) {
            $container.addClass('layout-mobile');
        } else if (windowWidth <= 992) {
            $container.addClass('layout-tablet');
        } else if (windowWidth <= 1200) {
            $container.addClass('layout-desktop');
        } else {
            $container.addClass('layout-large');
        }

        // Adjust sidebar height on mobile
        if (windowWidth <= 992) {
            adjustMobileSidebar();
        }

        log('Layout adjusted for width: ' + windowWidth);
    }

    /**
     * Adjust sidebar for mobile devices
     */
    function adjustMobileSidebar() {
        var $sidebar = $('.ld-quiz-sidebar');
        var $mediaContainer = $('#question-media');
        
        // Ensure sidebar doesn't take too much vertical space on mobile
        $sidebar.css('max-height', '400px');
        $mediaContainer.css('min-height', '200px');
    }

    /**
     * Setup event listeners for quiz navigation
     */
    function setupEventListeners() {
        log('Setting up event listeners');
        
        // Listen for LearnDash quiz navigation
        $(document).on('click', '.wpProQuiz_listItem', function() {
            setTimeout(loadCurrentQuestionMedia, 300);
        });

        // Listen for quiz question changes (multiple selectors for compatibility)
        $(document).on('click', '.wpProQuiz_button, .wpProQuiz_QuestionButton', function() {
            setTimeout(loadCurrentQuestionMedia, 500);
        });

        // Listen for retry button clicks
        $(document).on('click', '.retry-media-load', function(e) {
            e.preventDefault();
            retryMediaLoad();
        });

        // Listen for quiz completion
        $(document).on('quiz_completed', function() {
            showCompletionMedia();
        });

        // Setup mutation observer for dynamic content changes
        setupMutationObserver();
    }

    /**
     * Setup mutation observer to detect quiz changes
     */
    function setupMutationObserver() {
        if (typeof MutationObserver === 'undefined') {
            log('MutationObserver not supported');
            return;
        }

        var observer = new MutationObserver(function(mutations) {
            var shouldUpdate = false;
            
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' || mutation.type === 'attributes') {
                    // Check if quiz content has changed
                    if ($(mutation.target).closest('.wpProQuiz_content').length > 0) {
                        shouldUpdate = true;
                    }
                }
            });

            if (shouldUpdate) {
                setTimeout(loadCurrentQuestionMedia, 200);
            }
        });

        // Observe quiz content area
        var quizContent = document.querySelector('.wpProQuiz_content');
        if (quizContent) {
            observer.observe(quizContent, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style']
            });
        }
    }

    /**
     * Setup media handling functionality
     */
    function setupMediaHandling() {
        log('Setting up media handling');
        
        var $mediaContainer = $('#question-media');
        if (!$mediaContainer.length) {
            error('Media container not found');
            return;
        }

        // Check if media content already exists and show it
        var $existingContent = $mediaContainer.find('.media-content img');
        if ($existingContent.length > 0) {
            log('Found existing media content, showing it');
            $mediaContainer.find('.media-content').show();
            $mediaContainer.find('.media-loading').hide(); // Only hide loading, keep placeholder available
            return;
        }

        // Ensure media container has proper structure
        if (!$mediaContainer.find('.media-loading').length) {
            $mediaContainer.append('<div class="media-loading" style="display: none;"><div class="spinner"></div><p>טוען תוכן...</p></div>');
        }

        if (!$mediaContainer.find('.media-error').length) {
            $mediaContainer.append('<div class="media-error" style="display: none;"><p>שגיאה בטעינת התוכן העזר</p><button type="button" class="retry-media-load">נסה שוב</button></div>');
        }
    }

    /**
     * Load media for current question
     */
    function loadCurrentQuestionMedia() {
        if (state.isLoading) {
            log('Media loading already in progress');
            return;
        }

        var questionId = getCurrentQuestionId();
        if (!questionId) {
            log('No question ID found');
            showPlaceholder();
            return;
        }

        if (questionId === state.currentQuestionId) {
            log('Question unchanged: ' + questionId);
            return;
        }

        log('Loading media for question: ' + questionId);
        state.currentQuestionId = questionId;
        state.isLoading = true;

        // Check cache first
        if (state.mediaCache[questionId]) {
            displayCachedMedia(questionId);
            return;
        }

        // Show loading state
        showLoading();

        // Load media via AJAX
        $.ajax({
            url: lilacQuizSidebar.ajaxUrl,
            type: 'POST',
            data: {
                action: 'get_question_acf_media',
                question_id: questionId,
                nonce: lilacQuizSidebar.nonce
            },
            timeout: config.mediaLoadTimeout,
            success: function(response) {
                handleMediaResponse(response, questionId);
            },
            error: function(xhr, status, error) {
                handleMediaError(error, questionId);
            },
            complete: function() {
                state.isLoading = false;
                hideLoading();
            }
        });
    }

    /**
     * Get current question ID using multiple strategies
     */
    function getCurrentQuestionId() {
        // Strategy 1: Check active navigation item
        var $activeNav = $('.wpProQuiz_listItem.wpProQuiz_reviewQuestionTarget');
        if ($activeNav.length) {
            var navIndex = $activeNav.index();
            if (navIndex >= 0) {
                return 'q' + (navIndex + 1);
            }
        }

        // Strategy 2: Check for question number in content
        var $questionNumber = $('.wpProQuiz_question_page');
        if ($questionNumber.length) {
            var questionText = $questionNumber.text();
            var match = questionText.match(/(\d+)/);
            if (match) {
                return 'q' + match[1];
            }
        }

        // Strategy 3: Check URL hash
        var hash = window.location.hash;
        if (hash && hash.includes('question')) {
            var questionMatch = hash.match(/question[_-]?(\d+)/i);
            if (questionMatch) {
                return 'q' + questionMatch[1];
            }
        }

        // Strategy 4: Default to first question
        return 'q1';
    }

    /**
     * Handle media response from AJAX
     */
    function handleMediaResponse(response, questionId) {
        if (response.success && response.data) {
            var mediaData = response.data;
            
            // Cache the response
            state.mediaCache[questionId] = mediaData;
            
            // Display the media
            displayMedia(mediaData);
            
            log('Media loaded successfully for question: ' + questionId);
        } else {
            handleMediaError('Invalid response', questionId);
        }
    }

    /**
     * Display media in the sidebar
     */
    function displayMedia(mediaData) {
        var $mediaContainer = $('#question-media');
        var $mediaContent = $mediaContainer.find('.media-content');
        
        // Hide loading state first
        hideLoading();
        
        // Clear existing content
        $mediaContent.empty();
        
        if (mediaData && mediaData.image) {
            var $img = $('<img>')
                .attr('src', mediaData.image.url)
                .attr('alt', mediaData.image.alt || 'תמונת עזר')
                .addClass('question-media-img')
                .on('load', function() {
                    log('Image loaded successfully');
                    // Ensure content is visible after image loads
                    $mediaContent.show();
                    $mediaContainer.find('.media-placeholder, .media-error, .media-loading').hide();
                })
                .on('error', function() {
                    showError('שגיאה בטעינת התמונה');
                });
            
            $mediaContent.append($img);
        } else if (mediaData && mediaData.video) {
            var $video = $('<video>')
                .attr('src', mediaData.video.url)
                .attr('controls', true)
                .addClass('question-media-video');
            
            $mediaContent.append($video);
        } else {
            showPlaceholder();
            return;
        }
        
        // Show content and hide other states
        $mediaContent.show();
        $mediaContainer.find('.media-placeholder, .media-error, .media-loading').hide();
    }

    /**
     * Display cached media
     */
    function displayCachedMedia(questionId) {
        log('Displaying cached media for question: ' + questionId);
        displayMedia(state.mediaCache[questionId]);
        state.isLoading = false;
    }

    /**
     * Handle media loading errors
     */
    function handleMediaError(error, questionId) {
        error('Media loading failed for question ' + questionId + ': ' + error);
        
        if (state.retryCount < config.retryAttempts) {
            log('Retrying media load (' + (state.retryCount + 1) + '/' + config.retryAttempts + ')');
            state.retryCount++;
            setTimeout(function() {
                loadCurrentQuestionMedia();
            }, config.retryDelay);
        } else {
            showError('שגיאה בטעינת התוכן העזר');
            state.retryCount = 0;
        }
    }

    /**
     * Retry media loading
     */
    function retryMediaLoad() {
        log('Manual retry requested');
        state.retryCount = 0;
        state.currentQuestionId = null; // Force reload
        loadCurrentQuestionMedia();
    }

    /**
     * Show loading state
     */
    function showLoading() {
        var $mediaContainer = $('#question-media');
        $mediaContainer.addClass('loading');
        $mediaContainer.find('.media-loading').show();
        
        // NEVER hide media-content completely - use opacity instead
        var $mediaContent = $mediaContainer.find('.media-content');
        $mediaContent.css({
            'opacity': '0.6',
            'transition': 'all 0.3s ease'
        }).show(); // Keep it visible
        
        $mediaContainer.find('.media-placeholder, .media-error').hide();
    }

    /**
     * Hide loading state
     */
    function hideLoading() {
        var $mediaContainer = $('#question-media');
        $mediaContainer.removeClass('loading');
        $mediaContainer.find('.media-loading').hide();
        
        // Restore media content to full visibility
        var $mediaContent = $mediaContainer.find('.media-content');
        $mediaContent.css({
            'opacity': '1',
            'transition': 'all 0.3s ease'
        }).show(); // Ensure it's visible
    }

    /**
     * Show placeholder content
     */
    function showPlaceholder() {
        var $mediaContainer = $('#question-media');
        $mediaContainer.find('.media-placeholder').show();
        
        // Keep media-content visible but empty it if needed
        var $mediaContent = $mediaContainer.find('.media-content');
        $mediaContent.css({
            'opacity': '1'
        }).show(); // Always keep visible
        
        $mediaContainer.find('.media-loading, .media-error').hide();
    }

    /**
     * Show error state
     */
    function showError(message) {
        var $mediaContainer = $('#question-media');
        var $errorDiv = $mediaContainer.find('.media-error');
        
        if (message) {
            $errorDiv.find('p').text(message);
        }
        
        $errorDiv.show();
        
        // Keep media-content visible even during error state
        var $mediaContent = $mediaContainer.find('.media-content');
        $mediaContent.css({
            'opacity': '0.3',
            'filter': 'grayscale(100%)',
            'transition': 'all 0.3s ease'
        }).show(); // Keep visible but dimmed
        
        $mediaContainer.find('.media-loading, .media-placeholder').hide();
    }

    /**
     * Show completion media
     */
    function showCompletionMedia() {
        var $mediaContainer = $('#question-media');
        var $mediaContent = $mediaContainer.find('.media-content');
        
        $mediaContent.html('<div class="completion-message"><h4>כל הכבוד!</h4><p>סיימת את המבחן בהצלחה</p></div>');
        $mediaContainer.find('.media-placeholder, .media-error').hide();
        $mediaContent.show();
    }

    /**
     * Setup error handling
     */
    function setupErrorHandling() {
        // Global error handler for uncaught errors
        window.addEventListener('error', function(e) {
            if (e.filename && e.filename.includes('lilac-quiz-sidebar')) {
                error('JavaScript error: ' + e.message);
            }
        });
    }

    /**
     * Logging function
     */
    function log(message) {
        if (config.debug && console && console.log) {
            console.log('[Lilac Quiz Sidebar] ' + message);
        }
    }

    /**
     * Error logging function
     */
    function error(message) {
        if (console && console.error) {
            console.error('[Lilac Quiz Sidebar ERROR] ' + message);
        }
    }

    // Initialize when script loads
    init();

    // Expose public API
    window.lilacQuizSidebarEnhanced = {
        loadMedia: loadCurrentQuestionMedia,
        retryLoad: retryMediaLoad,
        getCurrentQuestion: getCurrentQuestionId,
        config: config,
        state: state
    };

})(jQuery);

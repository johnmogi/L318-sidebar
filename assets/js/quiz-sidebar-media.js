/**
 * Quiz Sidebar Media JavaScript
 * 
 * Handles loading and displaying media in the quiz sidebar
 * for the current question.
 */

// Create debug object for tracking sidebar media behavior
var sidebarDebug = {
    // Debug mode is disabled by default in production
    // but can be enabled via lilacQuizSidebar.debug setting
    enabled: false, // Force debug mode off
    log: function(message, data) {
        // Debug logging disabled
        return;
    },
    error: function(message, data) {
        // Only log critical errors in production
        if (this.enabled) {
            if (data) {
                console.error('SIDEBAR ERROR: ' + message, data);
            } else {
                console.error('SIDEBAR ERROR: ' + message);
            }
        }
    }
};

(function($) {
    'use strict';

    // Store reference to the media container
    var $mediaContainer = $('#question-media');
    var $mediaContent = $('.media-content', $mediaContainer);
    
    // Store current question ID to avoid unnecessary reloads
    var currentQuestionId = null;
    
    // Store mapping of navigation dots to question IDs
    var questionData = {};
    
    /**
     * Initialize the sidebar functionality
     */
    function init() {
        sidebarDebug.log('Initializing quiz sidebar media');
        
        // Pre-parse quiz structure to build question data mapping
        parseQuizQuestions();
        
        // Initial load of media for the first question
        setTimeout(function() {
            sidebarDebug.log('Attempting initial media load');
            loadMediaForCurrentQuestion();
        }, 800);
        
        // Listen for quiz navigation events
        setupEventListeners();
        
        sidebarDebug.log('Quiz sidebar initialization complete');
    }
    
    /**
     * Parse quiz questions to build a mapping of dot index to question ID
     */
    function parseQuizQuestions() {
        sidebarDebug.log('Parsing quiz questions structure');
        
        // Get all navigation dots
        var $navDots = $('.wpProQuiz_listItem');
        sidebarDebug.log('Found navigation dots:', $navDots.length);
        
        // Since we can't get IDs from the DOM, let's try to find post IDs in the page
        var postIds = [];
        
        // First check if we have a quiz ID
        var quizId = $('input[name="quiz_id"]').val();
        sidebarDebug.log('Found quiz ID from form:', quizId);
        
        // Try to extract question IDs from any scripts or data attributes on the page
        var pageHtml = $('body').html();
        var questionIdMatches = pageHtml.match(/question_id["':=\s]+(\d+)/g) || [];
        sidebarDebug.log('Found question_id patterns in page:', questionIdMatches);
        
        // Extract post IDs from meta tags or other sources
        var postIdMeta = $('meta[property="og:id"]').attr('content');
        if (postIdMeta) {
            postIds.push(postIdMeta);
            sidebarDebug.log('Found post ID from meta tag:', postIdMeta);
        }
        
        // If no IDs found, use index+1 as temporary IDs
        if (questionIdMatches.length === 0) {
            sidebarDebug.log('No question IDs found, using sequential numbering');
            
            // Loop through each question
            $navDots.each(function(index) {
                // Use the element's index + a prefix as the ID
                var tempQuestionId = 'q' + (index + 1);
                
                // Store in the mapping
                questionData[index] = tempQuestionId;
                
                sidebarDebug.log('Assigned temporary ID for index ' + index + ': ' + tempQuestionId);
            });
        } else {
            // Try to extract actual question IDs
            var extractedIds = [];
            
            for (var i = 0; i < questionIdMatches.length; i++) {
                var match = questionIdMatches[i].match(/(\d+)/);
                if (match && match[1]) {
                    extractedIds.push(match[1]);
                }
            }
            
            sidebarDebug.log('Extracted question IDs:', extractedIds);
            
            // Map the question IDs to the nav dots
            $navDots.each(function(index) {
                if (index < extractedIds.length) {
                    questionData[index] = extractedIds[index];
                    sidebarDebug.log('Mapped index ' + index + ' to question ID ' + extractedIds[index]);
                } else {
                    // Fallback to index numbering
                    questionData[index] = 'q' + (index + 1);
                    sidebarDebug.log('Mapped index ' + index + ' to fallback ID q' + (index + 1));
                }
            });
        }
        
        sidebarDebug.log('Final question data mapping:', questionData);
    }
    
    /**
     * Set up event listeners for quiz navigation
     */
    function setupEventListeners() {
        // Listen for clicks on navigation buttons
        $(document).on('click', '.wpProQuiz_button, .wpProQuiz_listItem', function() {
            // Use setTimeout to allow LearnDash to update the DOM
            setTimeout(function() {
                loadMediaForCurrentQuestion();
            }, 150);
        });
        
        // Listen for LearnDash quiz events
        $(document).on('learndash-quiz-started learndash-quiz-question-answered', function() {
            setTimeout(function() {
                loadMediaForCurrentQuestion();
            }, 150);
        });
        
        // Set up MutationObserver to detect DOM changes
        setupMutationObserver();
    }
    
    /**
     * Set up MutationObserver to detect quiz question changes
     */
    function setupMutationObserver() {
        // Check if MutationObserver is supported
        if (window.MutationObserver) {
            var quizContainer = document.querySelector('.wpProQuiz_content');
            
            if (quizContainer) {
                var observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.type === 'childList' || mutation.type === 'attributes') {
                            loadMediaForCurrentQuestion();
                        }
                    });
                });
                
                observer.observe(quizContainer, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['class', 'style']
                });
            }
        }
    }
    
    /**
     * Determine the current question and load its media
     */
    function loadMediaForCurrentQuestion() {
        sidebarDebug.log('Attempting to load media for current question');
        var questionId = getCurrentQuestionId();
        
        if (questionId) {
            sidebarDebug.log('Detected question ID:', questionId);
            if (questionId !== currentQuestionId) {
                sidebarDebug.log('Question changed from', currentQuestionId, 'to', questionId);
                currentQuestionId = questionId;
                loadQuestionMedia(questionId);
            } else {
                sidebarDebug.log('Same question still active, not reloading media');
            }
        } else {
            sidebarDebug.error('Failed to detect current question ID');
        }
    }
    
    /**
     * Determine the current question ID using multiple strategies
     */
    function getCurrentQuestionId() {
        sidebarDebug.log('Attempting to find LearnDash question ID');

        // Method 1: From LearnDash specific attributes on visible question
        var $visibleQuestion = $('.wpProQuiz_listItem:visible');
        if ($visibleQuestion.length) {
            // First try to get the post ID from question-meta
            var questionMeta = $visibleQuestion.data('question-meta');
            if (questionMeta && questionMeta.question_post_id) {
                sidebarDebug.log('Found question ID from LearnDash meta:', questionMeta.question_post_id);
                return questionMeta.question_post_id;
            }
            
            // Try from the data-question_id attribute in the question list
            var $questionList = $visibleQuestion.find('.wpProQuiz_questionList');
            if ($questionList.length) {
                // Try data-question_id attribute
                if ($questionList.data('question_id')) {
                    const questionId = $questionList.data('question_id');
                    // Verify if this is a valid LearnDash question ID (should be a number)
                    if (!isNaN(parseInt(questionId))) {
                        sidebarDebug.log('Found question ID from questionList data:', questionId);
                        return questionId;
                    }
                }
                
                // Try data-question-id attribute (note the dash)
                if ($questionList.data('question-id')) {
                    const questionId = $questionList.data('question-id');
                    if (!isNaN(parseInt(questionId))) {
                        sidebarDebug.log('Found question ID from questionList data-question-id:', questionId);
                        return questionId;
                    }
                }
                
                // Try from the ID attribute which sometimes contains the question ID
                if ($questionList.attr('id')) {
                    const idParts = $questionList.attr('id').split('_');
                    if (idParts.length > 1) {
                        const questionId = idParts[idParts.length - 1];
                        if (!isNaN(parseInt(questionId))) {
                            sidebarDebug.log('Found question ID from questionList ID:', questionId);
                            return questionId;
                        }
                    }
                }
            }
        }
        
        // Method 2: From active review dot
        var $activeDot = $('.wpProQuiz_reviewQuestionTarget');
        if ($activeDot.length) {
            var dotIndex = $activeDot.index();
            if (dotIndex >= 0 && window.quizQuestionData && window.quizQuestionData[dotIndex]) {
                const questionId = window.quizQuestionData[dotIndex];
                if (!isNaN(parseInt(questionId))) {
                    sidebarDebug.log('Found question ID from review dot:', questionId);
                    return questionId;
                }
            }
        }
        
        // Method 3: From the wpProQuiz question ID - this is the most reliable for LearnDash
        var $questionInput = $('input[name="questionId"]');
        if ($questionInput.length) {
            const questionId = $questionInput.val();
            if (!isNaN(parseInt(questionId))) {
                sidebarDebug.log('Found question ID from questionId input:', questionId);
                return questionId;
            }
        }
        
        // Method 4: Try from LearnDash's wpProQuizFront object
        if (typeof wpProQuizFront !== 'undefined' && wpProQuizFront.questionData) {
            // Find the current question index
            const currentIndex = wpProQuizFront.methode.getCurrentPageIndex();
            if (currentIndex >= 0 && wpProQuizFront.questionData[currentIndex]) {
                const questionId = wpProQuizFront.questionData[currentIndex].question_post_id;
                if (questionId) {
                    sidebarDebug.log('Found question ID from wpProQuizFront:', questionId);
                    return questionId;
                }
            }
        }
        
        // Method 5: Fallback to our synthetic IDs if we don't have real LearnDash question IDs
        var index = $visibleQuestion.index();
        if (index >= 0) {
            const syntheticId = 'q' + (index + 1);
            sidebarDebug.log('Using synthetic question ID:', syntheticId);
            return syntheticId;
        }
        
        // Log failure if we got here
        sidebarDebug.error('Failed to find a valid LearnDash question ID');
        return null;
    }
    
    /**
     * Load media for a specific question
     */
    function loadQuestionMedia(questionId) {
        sidebarDebug.log('Loading media for question ID:', questionId);
        
        // Show loading state
        $mediaContainer.addClass('loading').removeClass('error');
        
        // Check if we're using a synthetic ID (starts with 'q')
        var isSyntheticId = typeof questionId === 'string' && questionId.charAt(0) === 'q';
        var questionIndex = isSyntheticId ? parseInt(questionId.substring(1), 10) - 1 : null;
        
        sidebarDebug.log('Question ID analysis:', { 
            isSynthetic: isSyntheticId, 
            index: questionIndex, 
            originalId: questionId 
        });
        
        // If using synthetic ID, try to extract the actual question ID from the DOM if possible
        if (isSyntheticId) {
            var $questions = $('.wpProQuiz_listItem');
            if (questionIndex >= 0 && questionIndex < $questions.length) {
                var $targetQuestion = $($questions[questionIndex]);
                var actualId = $targetQuestion.attr('data-question-id');
                if (actualId) {
                    questionId = actualId;
                    sidebarDebug.log('Found actual question ID:', questionId);
                }
            }
            
            // If we're using fallback IDs, we need to also include the quiz ID if available
            var quizId = $('input[name="quiz_id"]').val() || $('.wpProQuiz_quiz').attr('data-quiz-id');
            sidebarDebug.log('Associated quiz ID:', quizId);
        }
        
        // Debug info about AJAX parameters
        var ajaxData = {
            action: 'get_question_acf_media',
            question_id: questionId,
            nonce: lilacQuizSidebar.nonce
        };
        
        // If using a synthetic ID, include the question index and quiz ID in the request
        if (isSyntheticId && questionIndex !== null) {
            ajaxData.question_index = questionIndex;
            
            // Find the quiz ID if available
            var quizId = $('input[name="quiz_id"]').val() || $('.wpProQuiz_quiz').attr('data-quiz-id');
            if (quizId) {
                ajaxData.quiz_id = quizId;
            }
        }
        
        sidebarDebug.log('Making AJAX request with data:', ajaxData);
        sidebarDebug.log('AJAX URL:', lilacQuizSidebar.ajaxUrl);
        
        // Make AJAX request to get media
        $.ajax({
            url: lilacQuizSidebar.ajaxUrl,
            type: 'POST',
            data: ajaxData,
            success: function(response) {
                // No debug output in production
                // Process the response and display media
                
                // New response structure has media inside a 'media' property
                if (response.success && response.data) {
                    const mediaData = response.data.media || response.data;
                    
                    if (mediaData.url) {
                        displayMedia(mediaData);
                    } else {
                        // Try fallback if we didn't get proper media data
                        if (isSyntheticId) {
                            tryLoadFallbackMedia(questionIndex);
                        } else {
                            showError();
                        }
                    }
                } else {
                    // Try fallback if we didn't get proper media data
                    if (isSyntheticId) {
                        tryLoadFallbackMedia(questionIndex);
                    } else {
                        showError();
                    }
                }
            },
            error: function(xhr, status, error) {
                // Try fallback if AJAX failed and we're using a synthetic ID
                if (isSyntheticId) {
                    tryLoadFallbackMedia(questionIndex);
                } else {
                    showError();
                }
            },
            complete: function() {
                // Hide loading indicator
                $mediaContainer.removeClass('loading');
            }
        });
    }
    
    /**
     * Display media in the sidebar
     */
    function displayMedia(data) {
        // Clear previous content
        $mediaContent.empty();
        
        if (data.type === 'image' && data.url) {
            // Display image
            $mediaContent.removeClass('question-media-video').addClass('question-media-image');
            
            var img = $('<img>', {
                src: data.url,
                alt: data.alt || '',
                class: 'question-media-img'
            });
            
            sidebarDebug.log('Created image element:', img);
            $mediaContent.append(img);
            
            // Track image loading success or failure
            img.on('load', function() {
                sidebarDebug.log('Image loaded successfully:', data.url);
            }).on('error', function() {
                sidebarDebug.error('Image failed to load:', data.url);
                showError();
            });
            
        } else if (data.type === 'video') {
            sidebarDebug.log('Processing video type media:', data);
            // Display video
            $mediaContent.removeClass('question-media-image').addClass('question-media-video');
            
            if (data.youtube_id) {
                sidebarDebug.log('Creating YouTube embed for ID:', data.youtube_id);
                // YouTube embed
                var iframe = $('<iframe>', {
                    src: 'https://www.youtube.com/embed/' + data.youtube_id,
                    frameborder: '0',
                    allowfullscreen: true,
                    width: '100%',
                    height: '200'
                });
                
                $mediaContent.append(iframe);
            } 
            else if (data.vimeo_id) {
                sidebarDebug.log('Creating Vimeo embed for ID:', data.vimeo_id);
                // Vimeo embed
                var iframe = $('<iframe>', {
                    src: 'https://player.vimeo.com/video/' + data.vimeo_id,
                    frameborder: '0',
                    allowfullscreen: true,
                    width: '100%',
                    height: '200'
                });
                
                $mediaContent.append(iframe);
            }
            else if (data.embed_code) {
                sidebarDebug.log('Using direct iframe embed code');
                // Direct iframe embed code
                $mediaContent.html(data.embed_code);
                
                // Make sure the iframe has good dimensions
                $mediaContent.find('iframe').css({
                    'width': '100%',
                    'height': '200px',
                    'max-width': '100%'
                });
            } 
            else if (data.url) {
                // Check if URL is a video file or a video service
                var videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
                var isVideoFile = false;
                
                // Check if URL ends with a video extension
                for (var i = 0; i < videoExtensions.length; i++) {
                    if (data.url.toLowerCase().endsWith(videoExtensions[i])) {
                        isVideoFile = true;
                        break;
                    }
                }
                
                if (isVideoFile) {
                    sidebarDebug.log('Creating video element for URL:', data.url);
                    // Video file URL
                    var video = $('<video>', {
                        src: data.url,
                        controls: true,
                        class: 'question-media-video-player',
                        width: '100%'
                    });
                    
                    $mediaContent.append(video);
                } else {
                    // Try to handle as a video service URL
                    sidebarDebug.log('Creating fallback iframe for URL:', data.url);
                    var iframe = $('<iframe>', {
                        src: data.url,
                        frameborder: '0',
                        allowfullscreen: true,
                        width: '100%',
                        height: '200'
                    });
                    
                    $mediaContent.append(iframe);
                }
            }
        } else {
            sidebarDebug.error('Invalid media data, no valid image/video content found:', data);
            // No valid media found
            showError();
        }
    }
    
    /**
     * Show error state
     */
    function showError() {
        $mediaContainer.addClass('error');
    }
    
    /**
     * Try to load fallback media when we can't fetch specific media by question ID
     */
    function tryLoadFallbackMedia(questionIndex) {
        sidebarDebug.log('Attempting to load fallback media for question index:', questionIndex);
        
        // First check if we have a fallback URL in the options
        if (lilacQuizSidebar.fallbackImageUrl) {
            sidebarDebug.log('Using configured fallback image:', lilacQuizSidebar.fallbackImageUrl);
            
            // Display the fallback image
            displayMedia({
                type: 'image',
                url: lilacQuizSidebar.fallbackImageUrl,
                alt: 'Quiz media'
            });
            return;
        }
        
        // Second attempt: try to find an image in the question content
        var $questions = $('.wpProQuiz_listItem');
        if (questionIndex !== null && questionIndex >= 0 && questionIndex < $questions.length) {
            var $questionContent = $($questions[questionIndex]);
            var $questionImage = $questionContent.find('img').first();
            
            if ($questionImage.length) {
                var imgSrc = $questionImage.attr('src');
                sidebarDebug.log('Found image in question content:', imgSrc);
                
                // Use the image from the question content
                displayMedia({
                    type: 'image',
                    url: imgSrc,
                    alt: $questionImage.attr('alt') || 'Question image'
                });
                return;
            }
        }
        
        // Final fallback: use a generic placeholder
        var placeholderUrl = 'https://via.placeholder.com/400x300?text=Question+Media';
        sidebarDebug.log('Using generic placeholder image');
        
        displayMedia({
            type: 'image',
            url: placeholderUrl,
            alt: 'Question media placeholder'
        });
    }
    
    /**
     * Analyze DOM structure and provide debugging info
     */
    function analyzeDOMStructure() {
        sidebarDebug.log('--- DOM STRUCTURE ANALYSIS ---');
        
        // Quiz container
        var $quizContainer = $('.wpProQuiz_quiz');
        sidebarDebug.log('Quiz container found:', $quizContainer.length > 0);
        
        // List items (questions)
        var $questions = $('.wpProQuiz_list .wpProQuiz_listItem');
        sidebarDebug.log('Question items found:', $questions.length);
        $questions.each(function(i) {
            var $q = $(this);
            var qid = $q.attr('id');
            var dataId = $q.attr('data-question-id');
            var isVisible = $q.is(':visible');
            var isCurrent = $q.hasClass('wpProQuiz_listItemCurrent');
            
            sidebarDebug.log('Question #' + i + ':', { 
                id: qid, 
                dataQuestionId: dataId,
                visible: isVisible, 
                isCurrent: isCurrent
            });
        });
        
        // Sidebar container
        var $sidebar = $('#quiz-context');
        sidebarDebug.log('Sidebar container found:', $sidebar.length > 0);
        
        // Media content area
        var $mediaArea = $('#question-media');
        sidebarDebug.log('Media area found:', $mediaArea.length > 0);
        
        // Check if data is available in window object
        sidebarDebug.log('Window quiz question data available:', typeof window.quizQuestionData !== 'undefined');
        
        sidebarDebug.log('--- END STRUCTURE ANALYSIS ---');
    }
    
    // Initialize when document is ready
    $(document).ready(function() {
        // Wait a bit to ensure LearnDash has initialized the quiz
        setTimeout(function() {
            init();
            
            // Run structure analysis after initialization
            analyzeDOMStructure();
            
            // Add a global debugging command available in console
            window.analyzeQuizSidebar = analyzeDOMStructure;
            sidebarDebug.log('Debug command available: window.analyzeQuizSidebar()');  
        }, 800);
    });
    
})(jQuery);

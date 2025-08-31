/**
 * Conditional Media Debug Fix
 * Clean logging for media functionality
 */

(function($) {
    'use strict';
    
    // Clear console on script load
    if (window.console && window.console.clear) {
        console.clear();
    }
    
    // Debug configuration
    const DEBUG = true;
    const PREFIX = '🎥 MEDIA:';
    
    function log() {
        if (!DEBUG) return;
        const args = Array.from(arguments);
        args.unshift(`%c${PREFIX}`, 'color: #2196F3; font-weight: bold');
        console.log.apply(console, args);
    }
    
    function error() {
        const args = Array.from(arguments);
        args.unshift(`%c${PREFIX}`, 'color: #F44336; font-weight: bold');
        console.error.apply(console, args);
    }

    $(document).ready(function() {
        log('Document ready, initializing...');
        
        // Find the quiz container
        const $quizContainer = $('.wpProQuiz_quiz');
        if ($quizContainer.length === 0) {
            error('Quiz container not found');
            return;
        }
        
        log('Quiz container found, setting up listeners...');
        
        // Get current question ID
        function getCurrentQuestionId() {
            // Try to get from active question
            const $activeQuestion = $('.wpProQuiz_listItem[style*="display: block"]');
            if ($activeQuestion.length) {
                const idFromClass = $activeQuestion.attr('id');
                if (idFromClass) {
                    return idFromClass.replace('wpProQuiz_listItem_', '');
                }
            }
            
            // Fallback to first input
            const $firstInput = $('.wpProQuiz_questionList input').first();
            if ($firstInput.length) {
                const nameAttr = $firstInput.attr('name');
                if (nameAttr && nameAttr.includes('question')) {
                    return nameAttr.replace('question_', '');
                }
            }
            
            error('Could not determine question ID');
            return null;
        }
        
        // Answer selection handler
        function onAnswerSelected($input) {
            const answerId = $input.attr('name').replace('question_', '');
            const questionId = getCurrentQuestionId();
            
            log(`Answer selected - Q:${questionId}, A:${answerId}`, {
                type: $input.attr('type'),
                checked: $input.prop('checked')
            });
            
            if ($input.prop('checked')) {
                fetchConditionalMedia(questionId, answerId);
            }
        }
        
        // Setup event listeners
        $quizContainer
            .on('change', 'input[type="radio"], input[type="checkbox"]', function() {
                onAnswerSelected($(this));
            })
            .on('change', 'select', function() {
                const $select = $(this);
                const answerId = $select.attr('name').replace('question_', '');
                const questionId = getCurrentQuestionId();
                log(`Select changed - Q:${questionId}, A:${answerId}`, {
                    value: $select.val()
                });
                fetchConditionalMedia(questionId, answerId);
            });
            
        log('Event listeners attached');
        
        // Fetch conditional media for a specific answer
        function fetchConditionalMedia(questionId, answerId) {
            if (!questionId || !answerId) {
                error('Missing question or answer ID');
                return;
            }
            
            log(`Fetching media - Q:${questionId}, A:${answerId}`);
            
            const data = {
                action: 'get_answer_specific_media',
                question_id: questionId,
                answer_id: answerId,
                nonce: lilacQuizSidebar.nonce
            };
            
            $('.ld-quiz-sidebar .question-media').addClass('loading');
            
            $.ajax({
                url: lilacQuizSidebar.ajaxUrl,
                type: 'POST',
                data: data,
                success: function(response) {
                    log('Media response', {
                        success: response.success,
                        hasData: !!response.data,
                        hasMedia: !!(response.data && response.data.media)
                    });
                    
                    if (response.success && response.data?.media) {
                        displayMedia(response.data.media);
                    } else {
                        error('No media found in response');
                        $('.ld-quiz-sidebar .question-media')
                            .removeClass('loading')
                            .addClass('error');
                    }
                },
                error: function(xhr, status, error) {
                    error('AJAX error', { status, error });
                    $('.ld-quiz-sidebar .question-media')
                        .removeClass('loading')
                        .addClass('error');
                }
            });
        }
        
        // Display media in the sidebar
        function displayMedia(data) {
            log('Displaying media', {
                type: data.type,
                url: data.url || 'No URL',
                hasThumbnail: !!(data.thumbnail || data.preview)
            });
            
            const $mediaContainer = $('.ld-quiz-sidebar .question-media');
            const $mediaContent = $('.ld-quiz-sidebar .question-media-content');
            
            // Clear previous content
            $mediaContent.empty();
            $mediaContainer.removeClass('loading error');
            
            if (data.type === 'image' && data.url) {
                // Display image
                $mediaContent.removeClass('question-media-video')
                           .addClass('question-media-image');
                
                $mediaContent.append(
                    $('<img>', {
                        src: data.url,
                        alt: data.alt || '',
                        class: 'question-media-img'
                    })
                );
            } 
            else if (data.type === 'video') {
                $mediaContent.removeClass('question-media-image')
                           .addClass('question-media-video');
                
                if (data.youtube_id) {
                    $mediaContent.append(
                        $('<iframe>', {
                            src: `https://www.youtube.com/embed/${data.youtube_id}`,
                            frameborder: '0',
                            allowfullscreen: true,
                            width: '100%',
                            height: '200'
                        })
                    );
                } 
                else if (data.vimeo_id) {
                    $mediaContent.append(
                        $('<iframe>', {
                            src: `https://player.vimeo.com/video/${data.vimeo_id}`,
                            frameborder: '0',
                            allowfullscreen: true,
                            width: '100%',
                            height: '200'
                        })
                    );
                }
                else if (data.embed_code) {
                    $mediaContent.html(data.embed_code)
                        .find('iframe')
                        .css({
                            'width': '100%',
                            'height': '200px',
                            'border': 'none'
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
                        log('Creating video element for URL:', data.url);
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
                        console.log('CONDITIONAL MEDIA DEBUG: Creating fallback iframe for URL:', data.url);
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
                console.log('CONDITIONAL MEDIA DEBUG: Invalid media data, no valid content found');
                $mediaContainer.addClass('error');
            }
        };
        
        // Initialize
        setupAnswerListeners();
        console.log('CONDITIONAL MEDIA DEBUG: Initialization complete');
        
        // Also expose displayMedia for global access
        window.displayConditionalMedia = displayMedia;
    });
})(jQuery);

/**
 * Immediate Media Fix for Quiz Sidebar
 * 
 * This script runs immediately to show any existing media content
 * and hide loading states that shouldn't be visible.
 */

(function($) {
    'use strict';

    // Run as soon as possible
    $(document).ready(function() {
        fixMediaDisplay();
    });

    // Also run after a short delay to catch any late-loading content
    setTimeout(fixMediaDisplay, 100);
    setTimeout(fixMediaDisplay, 500);

    function fixMediaDisplay() {
        var $mediaContainer = $('#question-media');
        
        if (!$mediaContainer.length) {
            return;
        }
        
        // Force flexbox layout on quiz container
        var $quizContainer = $('.quiz-container');
        if ($quizContainer.length) {
            $quizContainer.css({
                'display': 'flex',
                'flex-direction': 'row-reverse',
                'gap': '30px',
                'align-items': 'flex-start',
                'flex-wrap': 'nowrap'
            });
            
            // Ensure quiz content and sidebar have proper flex properties
            var $quizContent = $quizContainer.find('.quiz-content');
            var $sidebar = $quizContainer.find('.ld-quiz-sidebar');
            
            if ($quizContent.length) {
                $quizContent.css({
                    'flex': '1 1 auto',
                    'min-width': '300px',
                    'max-width': 'none',
                    'width': 'auto'
                });
            }
            
            if ($sidebar.length) {
                $sidebar.css({
                    'flex': '0 0 350px',
                    'width': '350px',
                    'min-width': '350px',
                    'max-width': '350px'
                });
            }
        }

        // Check if there's actual media content (image or video)
        var $mediaContent = $mediaContainer.find('.media-content');
        var $existingImage = $mediaContent.find('img');
        var $existingVideo = $mediaContent.find('video');
        
        if ($existingImage.length > 0 || $existingVideo.length > 0) {
            console.log('Lilac Quiz Sidebar: Found existing media, showing it immediately');
            
            // ALWAYS show the media content - NEVER hide it with display:none
            $mediaContent.show().css({
                'opacity': '1',
                'visibility': 'visible',
                'display': 'block'
            });
            
            // Add loading overlay behind the image for perceived faster loading
            if ($existingImage.length > 0) {
                $existingImage.each(function() {
                    var $img = $(this);
                    
                    // If image is not loaded yet, show with slight opacity
                    if (!$img[0].complete) {
                        $img.css({
                            'opacity': '0.8',
                            'transition': 'all 0.3s ease'
                        });
                        
                        // When image loads, remove loading effects
                        $img.on('load', function() {
                            $(this).css({
                                'opacity': '1'
                            });
                        });
                    } else {
                        // Image already loaded, show at full opacity
                        $img.css({
                            'opacity': '1'
                        });
                    }
                });
            }
            
            // Hide other states but keep media visible
            $mediaContainer.find('.media-loading').hide();
            $mediaContainer.find('.media-placeholder').hide();
            $mediaContainer.find('.media-error').hide();
            
            // Remove loading class from container
            $mediaContainer.removeClass('loading');
            
        } else {
            // No media found, show placeholder (but still don't hide media-content completely)
            console.log('Lilac Quiz Sidebar: No media found, showing placeholder');
            
            // Keep media-content visible but empty, show placeholder
            $mediaContent.show().css('opacity', '1');
            $mediaContainer.find('.media-loading').hide();
            $mediaContainer.find('.media-error').hide();
            $mediaContainer.find('.media-placeholder').show();
            
            // Remove loading class from container
            $mediaContainer.removeClass('loading');
        }
    }

})(jQuery);

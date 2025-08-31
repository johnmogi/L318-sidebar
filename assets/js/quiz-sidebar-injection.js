/**
 * Quiz Sidebar Injection
 * 
 * Moves the sidebar directly into the quiz content for better integration
 */

(function($) {
    'use strict';

    /**
     * Inject the sidebar directly into the quiz content
     */
    function injectSidebar() {        
        // Find the quiz container
        const $quizContainer = $('.wpProQuiz_quiz');
        
        if ($quizContainer.length === 0) {
            // Try again in a moment if quiz isn't loaded yet
            setTimeout(injectSidebar, 500);
            return;
        }

        // Get the sidebar
        const $sidebar = $('.ld-quiz-sidebar');
        
        if ($sidebar.length === 0) {
            return;
        }
        
        // Add direct-injected class to the sidebar
        $sidebar.addClass('direct-injected');
        
        // Move the sidebar into the quiz container
        $quizContainer.append($sidebar);
        
        // Add a class to the quiz container for styling
        $quizContainer.addClass('has-sidebar');
    }
    
    /**
     * Check if enforce hint is enabled and update body class
     */
    function checkEnforceHint() {
        // Check if enforce hint is enabled in the quiz settings
        const $hintButton = $('.wpProQuiz_TipButton');
        const hasEnforceHint = $hintButton.length > 0;
        
        // Toggle the enforce-hint class on body
        $('body').toggleClass('enforce-hint', hasEnforceHint);
        
        return hasEnforceHint;
    }
    
    // Initialize when document is ready
    $(document).ready(function() {
        // Wait a bit to ensure LearnDash has initialized the quiz
        setTimeout(function() {
            injectSidebar();
            checkEnforceHint();
            
            // Also check after AJAX updates
            $(document).ajaxComplete(function() {
                checkEnforceHint();
            });
        }, 800);
    });
    
})(jQuery);

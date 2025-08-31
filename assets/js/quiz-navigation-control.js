jQuery(document).ready(function($) {
    // Check if this is a quiz page with enforce_hint enabled
    if (typeof lilacQuizSidebar !== 'undefined' && lilacQuizSidebar.enforceHint) {
        // Add class to body to trigger the CSS rules
        $('body').addClass('quiz-enforce-hint');
        
        // Function to hide the Next button
        function hideNextButton() {
            // Hide the Next button in the question navigation
            $('input[name="next"]').hide();
            
            // Also hide any other potential Next buttons that might appear
            $('.wpProQuiz_button[name="next"]').hide();
            $('.wpProQuiz_QuestionButton[value*="Next"], .wpProQuiz_QuestionButton[value*="next"]').hide();
            $('.wpProQuiz_QuestionButton[value*="הבא"]').hide(); // Hebrew "Next"
        }
        
        // Run immediately
        hideNextButton();
        
        // Also hide Next button when the quiz content changes (for AJAX loading)
        const observer = new MutationObserver(function(mutations) {
            hideNextButton();
        });
        
        // Start observing the quiz container for changes
        const quizContainer = document.querySelector('.wpProQuiz_content');
        if (quizContainer) {
            observer.observe(quizContainer, {
                childList: true,
                subtree: true
            });
        }
        
        // Remove any existing notice if present
        $('.hint-navigation-notice').remove();
        
        // Prevent keyboard navigation
        $('.wpProQuiz_reviewQuestion').on('click', 'li', function(e) {
            if ($('body').hasClass('quiz-enforce-hint')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });
    }
});

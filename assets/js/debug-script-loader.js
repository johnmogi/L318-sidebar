jQuery(document).ready(function($) {
    console.log('Debug Script Loader: Document ready');
    
    // Check for the quiz script file specifically
    var scriptLoaded = false;
    $('script[src*="quiz-answer-reselection"]').each(function() {
        console.log('Debug Script Loader: Found quiz-answer-reselection script tag:', $(this).attr('src'));
        scriptLoaded = true;
    });
    
    if (!scriptLoaded) {
        console.error('Debug Script Loader: quiz-answer-reselection.js script tag not found in the DOM');
        console.log('Debug Script Loader: Checking for _ld_quiz_enforce_hint meta value...');
        // Check if the enforce_hint option is enabled in the quiz
        $.ajax({
            url: '/wp-admin/admin-ajax.php',
            type: 'POST',
            data: {
                action: 'check_quiz_enforce_hint',
                quiz_id: typeof wpData !== 'undefined' ? wpData.quiz_pro_id : null,
                nonce: typeof lilacHintEnforcement !== 'undefined' ? lilacHintEnforcement.nonce : ''
            },
            success: function(response) {
                console.log('Debug Script Loader: Quiz enforce hint status:', response);
            },
            error: function(xhr) {
                console.error('Debug Script Loader: Error checking quiz settings', xhr.responseText);
            }
        });
    } else {
        console.log('Debug Script Loader: quiz-answer-reselection.js script tag found in DOM');
    }
    
    // Check for LearnDash quiz object
    if (typeof wpData !== 'undefined') {
        console.log('Debug Script Loader: LearnDash wpData found:', wpData);
    } else {
        console.warn('Debug Script Loader: LearnDash wpData object not found');
    }
    
    // Log all script tags for debugging
    console.log('Debug Script Loader: All script tags on page:');
    $('script[src]').each(function() {
        console.log('-', $(this).attr('src'));
    });
});

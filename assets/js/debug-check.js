// Debug check for Lilac Quiz Sidebar
(function() {
    'use strict';
    
    // Create a debug message
    const debugMsg = document.createElement('div');
    debugMsg.id = 'lilac-quiz-debug-check';
    debugMsg.style.cssText = 'position: fixed; top: 10px; left: 10px; background: #FF5722; color: white; padding: 10px; z-index: 9999; border-radius: 4px; font-family: Arial, sans-serif; font-size: 14px;';
    debugMsg.innerHTML = 'Lilac Quiz: Script loading check... <br>jQuery: ' + (typeof jQuery !== 'undefined' ? '✅ Loaded (' + jQuery.fn.jquery + ')' : '❌ Not loaded');
    
    // Add to page
    document.body.appendChild(debugMsg);
    
    // Log to console
    console.log('=== LILAC QUIZ DEBUG CHECK ===');
    console.log('Script loaded at:', new Date().toISOString());
    console.log('jQuery version:', typeof jQuery !== 'undefined' ? jQuery.fn.jquery : 'Not loaded');
    console.log('LearnDash object:', typeof LearnDashData !== 'undefined' ? 'Available' : 'Not available');
    console.log('Current URL:', window.location.href);
    
    // Check for quiz elements after a short delay
    setTimeout(function() {
        const quizFound = document.querySelector('.wpProQuiz_content') !== null;
        const questionsFound = document.querySelectorAll('.wpProQuiz_listItem').length;
        
        debugMsg.innerHTML += '<br>Quiz element: ' + (quizFound ? '✅ Found' : '❌ Not found');
        debugMsg.innerHTML += '<br>Questions found: ' + questionsFound;
        
        console.log('Quiz element found:', quizFound);
        console.log('Questions found:', questionsFound);
        
        // Auto-remove after 10 seconds
        setTimeout(function() {
            debugMsg.style.display = 'none';
        }, 10000);
    }, 1000);
})();

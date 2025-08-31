# LearnDash Quiz Media Sidebar Fix

## Issue: Media Content Not Loading Correctly

The LearnDash Quiz Media Sidebar was experiencing issues with retrieving and displaying media content for quiz questions. This document outlines the problems that were identified and the fixes implemented.

## Problems Identified

1. **Incorrect Question ID Detection**: 
   - The sidebar was using incorrect strategies to identify LearnDash question IDs
   - In some cases, WordPress page IDs were being passed to the AJAX handler instead of LearnDash question post IDs
   - This resulted in the AJAX handler looking for ACF fields on non-question post types

2. **Debug Information Overload**:
   - Verbose debug information was cluttering the console and the UI
   - Debug output was not structured in a way that made troubleshooting efficient

3. **Inconsistent Fallback Handling**:
   - When media couldn't be found, fallback behavior was inconsistent
   - Users were sometimes shown error messages instead of default media

## Solutions Implemented

### 1. Enhanced Question ID Detection

The `getCurrentQuestionId()` function was completely rewritten to use multiple reliable methods for detecting LearnDash question IDs:

- First tries to extract the question post ID from LearnDash's data attributes
- Searches for question IDs in multiple locations in the DOM
- Checks LearnDash's internal `wpProQuizFront` object for question data
- Falls back to synthetic IDs only as a last resort

```javascript
function getCurrentQuestionId() {
    // Method 1: From LearnDash specific attributes on visible question
    var $visibleQuestion = $('.wpProQuiz_listItem:visible');
    if ($visibleQuestion.length) {
        // Try to get the post ID from question-meta
        var questionMeta = $visibleQuestion.data('question-meta');
        if (questionMeta && questionMeta.question_post_id) {
            return questionMeta.question_post_id;
        }
        
        // Additional detection methods...
    }
    
    // More detection strategies...
}
```

### 2. Improved AJAX Handler

The AJAX handler in the plugin was enhanced to:

- Provide better error reporting
- Include detailed diagnostics about the question post
- Verify post type is a LearnDash question
- Handle ACF field detection more robustly
- Implement consistent fallback behavior when media isn't found

### 3. Structured Debug Output

Debug output was restructured to be:

- More targeted and relevant
- Only visible when debug mode is enabled
- Organized into clear categories (post info, ACF fields, media data)
- Non-intrusive to the user experience

## Testing

To verify the fix is working correctly:

1. Enable the sidebar for a quiz with questions that have media content
2. Navigate through the questions and verify that media loads correctly for each
3. Check that fallback media appears when a question doesn't have specific media
4. Monitor the browser console (with `WP_DEBUG` enabled) to see the question ID detection in action

## Future Improvements

Potential enhancements to consider:

1. Caching media responses to reduce AJAX calls
2. Preloading media for the next few questions to improve UX
3. Adding media preview in the LearnDash question editor
4. Supporting more media types beyond images and YouTube videos

---

*Document created: May 19, 2025*

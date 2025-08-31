# Quiz Sidebar Fix Documentation

## Overview
This document outlines the fixes and enhancements made to the Lilac Quiz Sidebar functionality to ensure proper loading and display of the quiz media sidebar.

## Key Components

### 1. Template Loading Fixes
- **File**: `templates/single-quiz-sidebar.php`
- **Purpose**: Main template override for quizzes with sidebar enabled
- **Key Changes**:
  - Added proper quiz content rendering using LearnDash shortcode
  - Implemented fallback content display
  - Added debug information output

### 2. Script and Style Loading
- **File**: `includes/class-quiz-sidebar.php`
- **Methods Modified**:
  - `enqueue_scripts_styles()`
  - `load_sidebar_template()`
- **Key Changes**:
  - Added proper script dependencies
  - Implemented cache-busting with file modification times
  - Added debug logging
  - Fixed script localization

### 3. Debugging System
- **Features**:
  - Console logging of plugin state
  - On-screen debug panel
  - Error logging to WordPress debug log
  - Version-based cache busting

## Implementation Details

### Template Loading Flow
1. WordPress loads the quiz post
2. `load_sidebar_template()` checks if sidebar is enabled
3. If enabled, loads the custom template
4. Template enqueues necessary scripts and styles
5. JavaScript initializes the sidebar functionality

### Debugging Features

#### Console Logging
```javascript
// Example debug output
console.log('Lilac Quiz Sidebar: Debug Info');
console.log('Quiz ID:', quizId);
console.log('Has Sidebar:', hasSidebar);
```

#### Debug Panel
A debug panel appears in the bottom-right corner showing:
- Quiz ID
- Sidebar status
- Enforce Hint status
- Script loading status

#### Error Logging
All errors are logged to:
- Browser console
- WordPress debug log (`wp-content/debug.log`)

## Common Issues and Solutions

### 1. Sidebar Not Loading
- **Symptom**: Sidebar doesn't appear on quiz pages
- **Check**:
  - Verify `_ld_quiz_toggle_sidebar` meta is set to '1' for the quiz
  - Check browser console for errors
  - Verify template file exists at `templates/single-quiz-sidebar.php`

### 2. Media Not Displaying
- **Symptom**: Sidebar loads but media doesn't appear
- **Check**:
  - Verify media is properly associated with questions
  - Check network tab for failed AJAX requests
  - Verify file permissions on media files

### 3. JavaScript Errors
- **Symptom**: Console shows JavaScript errors
- **Check**:
  - Ensure jQuery is loaded before plugin scripts
  - Verify no conflicts with other plugins
  - Check for undefined variables in console

## Moving Media to Right Side

To move the media sidebar from left to right:

1. Update CSS in `assets/css/quiz-sidebar.css`:
```css
.quiz-container {
    display: flex;
    flex-direction: row-reverse; /* Reverse the order */
    gap: 20px;
}
```

2. Update template structure in `single-quiz-sidebar.php`:
```php
<div class="quiz-container">
    <div class="quiz-content">
        <!-- Quiz content will be here -->
    </div>
    <aside class="ld-quiz-sidebar">
        <!-- Sidebar content will be here -->
    </aside>
</div>
```

## Next Steps for Video Implementation

1. Ensure video media type is properly handled in:
   - `quiz-sidebar-media.js` (frontend)
   - `class-quiz-sidebar.php` (backend)

2. Add video player initialization:
```javascript
function initializeVideoPlayer(videoUrl) {
    // Initialize video player based on URL type
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        // YouTube embed
    } else if (videoUrl.includes('vimeo.com')) {
        // Vimeo embed
    } else {
        // HTML5 video
    }
}
```

3. Add responsive video container styles:
```css
.video-container {
    position: relative;
    padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
    height: 0;
    overflow: hidden;
}

.video-container iframe,
.video-container video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}
```

## Troubleshooting

### Debug Mode
Enable WordPress debug mode in `wp-config.php`:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

### Common Errors
- **Script not loading**: Check browser console for 404 errors
- **Template not overriding**: Verify template file location and permissions
- **Media not showing**: Check network requests for media files

## Version History

### 1.0.0
- Initial sidebar implementation
- Basic media loading
- Debug system

### 1.0.1
- Fixed template loading issues
- Improved script dependencies
- Added debug panel
- Moved sidebar to right side

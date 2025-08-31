# Lilac Quiz Sidebar

This plugin adds a media sidebar to LearnDash quizzes that displays relevant images and videos for each question.

## Features

- Adds a metabox to the quiz editor to toggle the sidebar on/off
- Displays a sidebar with media content related to the current question
- Supports both images and YouTube videos
- Smooth transitions between questions with loading indicators
- Admin columns and quick edit support for easy management
- Works with both ACF fields and standard post meta

## Usage

1. Go to the Quizzes section in WordPress admin
2. Edit any quiz
3. Look for the "Quiz Media Sidebar" metabox on the right
4. Check the "Enable Media Sidebar" option
5. Update the quiz

When viewing the quiz, it will now display with a sidebar showing relevant media for each question.

## Media Setup

The plugin looks for media in the following locations:

1. If ACF is installed:
   - A field called `choose_media` to determine media type (image/video)
   - A field called `question_image` for image media
   - A field called `question_video` for video URLs

2. If ACF is not installed, or as fallback:
   - Post meta `_question_image` for image URLs
   - Post meta `_question_video` for video URLs

## Requirements

- WordPress 5.0+
- LearnDash LMS
# liliac6


# lilac-quiz-recovery-1
# lilac-plug-fix-and-more-2
# ilac-Quiz-Sidebar
# L318-sidebar

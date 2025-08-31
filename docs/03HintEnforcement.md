# Hint Enforcement Feature

## Overview

The Hint Enforcement feature requires users to view hints after submitting incorrect answers before they can proceed to the next question. This enhances the learning experience by encouraging reflection on mistakes and promoting better understanding of the material.

## Key Features

1. **Enforced Hint Viewing**
   - When a user submits an incorrect answer, the Next button is hidden
   - A pulsing highlight appears on the Hint button with a tooltip
   - Users must click the Hint button to view the hint before proceeding

2. **Answer Reselection**
   - Inputs remain enabled after an incorrect submission
   - Users can select a new answer and resubmit
   - The Next button only becomes available after a correct answer is submitted

3. **Visual Feedback**
   - Clear indication of incorrect answers
   - Hebrew tooltip text guides the user to view the hint
   - Animation draws attention to the hint button

## Implementation Details

### Activation

The Hint Enforcement feature is **opt-in** via the Quiz Sidebar Settings metabox in the LearnDash Quiz editor:

1. Navigate to the Quiz editor
2. Find the "Quiz Media Sidebar" metabox on the right side
3. Check the "Enforce Hint" option
4. Save the quiz

### Technical Components

1. **JavaScript (quiz-answer-reselection.js)**:
   - Implements the logic for detecting incorrect answers
   - Controls button visibility
   - Monitors hint viewing
   - Ensures inputs remain enabled for reselection

2. **CSS (quiz-answer-reselection.css)**:
   - Provides visual styling for hint button highlighting
   - Implements the pulsing animation
   - Styles the tooltip
   - Ensures proper element visibility

### User Flow

1. User takes a quiz with Hint Enforcement enabled
2. User selects an answer and clicks "Check"
3. If incorrect:
   - The Next button disappears
   - The Hint button pulses with a tooltip
4. User clicks the Hint button to view the hint
5. User selects a new answer and clicks "Check" again
6. Once correct, the Next button appears and the user can proceed

## Integration with Quiz Sidebar

When both the Quiz Media Sidebar and Hint Enforcement features are enabled:

1. The sidebar displays media content for each question
2. Hint enforcement operates independently to control answer submission flow
3. Both features enhance the quiz experience in complementary ways:
   - Media sidebar provides visual/audio support for understanding questions
   - Hint enforcement ensures proper review of mistakes

## Browser Compatibility

The Hint Enforcement feature works in all modern browsers:
- Chrome (80+)
- Firefox (75+)
- Safari (13+)
- Edge (80+)

## Future Enhancements

Potential improvements for future releases:
1. Analytics tracking for hint usage
2. Custom tooltip text configuration
3. Advanced customization options for styling
4. Integration with learning analytics systems

---

*Documentation created: May 19, 2025*

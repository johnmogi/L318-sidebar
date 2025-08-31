<?php
/**
 * Template for quizzes with sidebar
 *
 * Based on the LearnDash quiz template but with added sidebar
 *
 * @package Lilac_Quiz_Sidebar
 */

if (!defined('ABSPATH')) {
    exit;
}

// Debug: Log template loading
error_log('Lilac Quiz Sidebar: Loading template file: ' . __FILE__);

// Include theme header
get_header();


// Get quiz ID and settings
$quiz_id = get_the_ID();
$has_sidebar = get_post_meta($quiz_id, '_ld_quiz_toggle_sidebar', true);
$enforce_hint = get_post_meta($quiz_id, '_ld_quiz_enforce_hint', true);

// Debug output removed for production
?>

<script type="text/javascript">
console.log('Lilac Quiz Sidebar: Template loaded');
console.log('Quiz ID:', <?php echo json_encode($quiz_id); ?>);
console.log('Has Sidebar:', <?php echo json_encode($has_sidebar); ?>);
console.log('Enforce Hint:', <?php echo json_encode($enforce_hint); ?>);

jQuery(document).ready(function($) {
    console.log('Lilac Quiz Sidebar: Document ready');
    
    // Debug: Check if our script is loaded
    if (typeof window.lilacQuizSidebarInit === 'function') {
        console.log('Lilac Quiz Sidebar: Main script is loaded');
    } else {
        console.warn('Lilac Quiz Sidebar: Main script not loaded!');
    }
    
    // Debug: Check LearnDash
    if (typeof LearnDashData !== 'undefined') {
        console.log('LearnDash data:', LearnDashData);
    } else {
        console.warn('LearnDashData not found!');
    }
});
</script>

<main id="primary" class="site-main lilac-quiz-main">
    <div class="quiz-container" data-quiz-id="<?php echo esc_attr($quiz_id); ?>" data-has-sidebar="<?php echo esc_attr($has_sidebar); ?>">
        <!-- Main Quiz Content -->
        <div class="quiz-content">
            <?php if (have_posts()) : while (have_posts()) : the_post(); ?>
                <article id="post-<?php the_ID(); ?>" <?php post_class('sfwd-quiz lilac-quiz-article'); ?>>
                    <header class="entry-header">
                        <h1 class="entry-title"><?php the_title(); ?></h1>
                    </header>

                    <div class="entry-content quiz-entry-content">
                        <?php 
                        // Output the quiz content using LearnDash shortcode
                        $quiz_content = do_shortcode('[ld_quiz quiz_id="' . $quiz_id . '"]');
                        
                        // Ensure content is properly wrapped
                        if (!empty($quiz_content)) {
                            echo '<div class="lilac-quiz-wrapper">' . $quiz_content . '</div>';
                        } else {
                            echo '<div class="lilac-quiz-error">';
                            echo '<p>' . __('שגיאה בטעינת המבחן. אנא רענן את הדף ונסה שוב.', 'lilac-quiz-sidebar') . '</p>';
                            echo '</div>';
                        }
                        ?>
                    </div>
                </article>
            <?php endwhile; else: ?>
                <div class="lilac-no-quiz">
                    <p><?php _e('מבחן לא נמצא.', 'lilac-quiz-sidebar'); ?></p>
                </div>
            <?php endif; ?>
        </div>
        
        <!-- Enhanced Sidebar -->
        <aside class="ld-quiz-sidebar" role="complementary" aria-label="<?php esc_attr_e('תוכן עזר למבחן', 'lilac-quiz-sidebar'); ?>">
            
            <div id="question-media" class="question-media-container">
                <div class="media-loading" style="display: none;">
                    <div class="spinner"></div>
                    <p><?php _e('טוען תוכן...', 'lilac-quiz-sidebar'); ?></p>
                </div>
                
                <div class="media-content question-media-image">
                    <?php 
                    $default_image = plugins_url('/assets/images/default-media.png', dirname(__DIR__));
                    if (file_exists(dirname(__DIR__) . '/assets/images/default-media.png')) {
                        echo '<img src="' . esc_url($default_image) . '" alt="' . esc_attr__('תמונת ברירת מחדל', 'lilac-quiz-sidebar') . '" class="fallback-image">';
                    }
                    ?>
                </div>
                
                <div class="media-placeholder">
                </div>
                
                <div class="media-error" style="display: none;">
                </div>
            </div>
        </aside>
    </div>
</main>

<?php
// Include theme footer
get_footer();

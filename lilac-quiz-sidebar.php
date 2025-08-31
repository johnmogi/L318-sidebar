<?php
/**
 * Plugin Name: Lilac Quiz Sidebar
 * Plugin URI: https://lilacquiz.com
 * Description: Adds a media sidebar to LearnDash quizzes that displays relevant images and videos for each question.
 * Version: 1.0.0
 * Author: Lilac Learning
 * Author URI: https://lilacquiz.com
 * Text Domain: lilac-quiz-sidebar
 * Domain Path: /languages
 * 
 * @package Lilac_Quiz_Sidebar
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('LILAC_QUIZ_SIDEBAR_VERSION', '1.0.0');
define('LILAC_QUIZ_SIDEBAR_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('LILAC_QUIZ_SIDEBAR_PLUGIN_URL', plugin_dir_url(__FILE__));

// Include the main class
require_once LILAC_QUIZ_SIDEBAR_PLUGIN_DIR . 'includes/class-quiz-sidebar.php';

// Initialize the plugin
function lilac_quiz_sidebar_init() {
    // Ensure LearnDash is active
    if (!class_exists('SFWD_LMS')) {
        add_action('admin_notices', 'lilac_quiz_sidebar_learndash_notice');
        return;
    }
    
    // Initialize the sidebar class
    Lilac_Quiz_Sidebar::get_instance();
}
add_action('plugins_loaded', 'lilac_quiz_sidebar_init');

/**
 * Show admin notice if LearnDash is not active
 */
function lilac_quiz_sidebar_learndash_notice() {
    ?>
    <div class="notice notice-error">
        <p><?php _e('Lilac Quiz Sidebar requires LearnDash LMS to be installed and activated.', 'lilac-quiz-sidebar'); ?></p>
    </div>
    <?php
}

/**
 * Activation hook
 */
function lilac_quiz_sidebar_activate() {
    // Activation tasks if needed
}
register_activation_hook(__FILE__, 'lilac_quiz_sidebar_activate');

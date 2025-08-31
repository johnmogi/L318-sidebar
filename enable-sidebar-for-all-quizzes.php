<?php
/**
 * One-time script to enable rich media sidebar for all quizzes
 * 
 * How to use:
 * 1. Upload this file to your WordPress plugins directory
 * 2. Visit: https://your-site.com/wp-admin/admin.php?page=enable-sidebar-all-quizzes
 * 3. The script will run once and then disable itself
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Add admin menu item
add_action('admin_menu', 'lqs_enable_sidebar_menu');

function lqs_enable_sidebar_menu() {
    add_submenu_page(
        null, // Don't show in menu
        'Enable Sidebar for All Quizzes',
        '', // Menu title (not used)
        'manage_options',
        'enable-sidebar-all-quizzes',
        'lqs_enable_sidebar_all_quizzes'
    );
}

function lqs_enable_sidebar_all_quizzes() {
    if (!current_user_can('manage_options')) {
        wp_die('You do not have sufficient permissions to access this page.');
    }

    // Get all quizzes
    $quizzes = get_posts([
        'post_type' => 'sfwd-quiz',
        'posts_per_page' => -1,
        'post_status' => 'any',
        'fields' => 'ids',
    ]);

    $updated = 0;
    $skipped = 0;
    $errors = [];

    foreach ($quizzes as $quiz_id) {
        $current_value = get_post_meta($quiz_id, '_ld_quiz_toggle_sidebar', true);
        
        if ($current_value !== '1') {
            $result = update_post_meta($quiz_id, '_ld_quiz_toggle_sidebar', '1');
            
            if ($result !== false) {
                $updated++;
            } else {
                $errors[] = "Failed to update quiz ID: $quiz_id";
            }
        } else {
            $skipped++;
        }
    }

    // Output results
    echo '<div class="wrap">';
    echo '<h1>Rich Media Sidebar Update</h1>';
    echo "<p>Updated: $updated quizzes</p>";
    echo "<p>Skipped (already enabled): $skipped quizzes</p>";
    
    if (!empty($errors)) {
        echo '<div class="error"><p>Errors occurred with the following quizzes:</p><ul>';
        foreach ($errors as $error) {
            echo "<li>$error</li>";
        }
        echo '</ul></div>';
    }
    
    echo '<p><strong>This script has deactivated itself. You can now delete this file.</strong></p>';
    echo '</div>';
    
    // Deactivate this script
    deactivate_plugins(plugin_basename(__FILE__));
    
    // Delete this file after execution
    unlink(__FILE__);
}

<?php
/**
 * Main class for Quiz Sidebar functionality
 *
 * @package Lilac_Quiz_Sidebar
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Class Lilac_Quiz_Sidebar
 * 
 * Handles the sidebar functionality for LearnDash quizzes
 */
class Lilac_Quiz_Sidebar {
    /**
     * Instance of this class
     *
     * @var Lilac_Quiz_Sidebar
     */
    private static $instance = null;

    /**
     * Meta keys for storing quiz settings
     */
    const TOGGLE_SIDEBAR_META_KEY = '_ld_quiz_toggle_sidebar';
    const ENFORCE_HINT_META_KEY = '_ld_quiz_enforce_hint';

    /**
     * Constructor
     */
    private function __construct() {
        // Register metabox for quiz editor
        add_action('add_meta_boxes', array($this, 'add_sidebar_toggle_metabox'));
        
        // Save metabox data
        add_action('save_post_sfwd-quiz', array($this, 'save_sidebar_toggle_metabox'));
        
        // Override template for sidebar
        add_filter('template_include', array($this, 'load_sidebar_template'), 999);
        
        // Add body classes based on quiz settings
        add_filter('body_class', array($this, 'add_quiz_body_classes'));
        
        // Enqueue scripts and styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts_styles'));
        
        // Add admin columns
        add_filter('manage_sfwd-quiz_posts_columns', array($this, 'add_admin_columns'));
        add_action('manage_sfwd-quiz_posts_custom_column', array($this, 'render_admin_columns'), 10, 2);
        
        // Register AJAX handlers
        add_action('wp_ajax_get_question_acf_media', array($this, 'get_question_acf_media'));
        add_action('wp_ajax_nopriv_get_question_acf_media', array($this, 'get_question_acf_media'));
        add_action('wp_ajax_update_quiz_sidebar_settings', array($this, 'ajax_update_quiz_sidebar_settings'));
        add_action('wp_ajax_check_quiz_enforce_hint', array($this, 'check_quiz_enforce_hint'));
        add_action('wp_ajax_nopriv_check_quiz_enforce_hint', array($this, 'check_quiz_enforce_hint'));
        
        // Admin scripts and quick edit support
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        add_action('quick_edit_custom_box', array($this, 'add_quick_edit_fields'), 10, 2);
        add_action('bulk_edit_custom_box', array($this, 'add_bulk_edit_fields'), 10, 2);
        add_action('save_post', array($this, 'save_quick_edit_data'));
        
        // Disable debug panel display
        add_action('wp_footer', array($this, 'disable_debug_panel'), 999);
    }

    /**
     * Get instance of this class
     *
     * @return Lilac_Quiz_Sidebar
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Add metabox for toggling sidebar
     */
    public function add_sidebar_toggle_metabox() {
        add_meta_box(
            'lilac_quiz_sidebar_toggle',
            __('Quiz Media Sidebar', 'lilac-quiz-sidebar'),
            array($this, 'render_sidebar_toggle_metabox'),
            'sfwd-quiz',
            'side',
            'default'
        );
    }

    /**
     * Render metabox content
     *
     * @param WP_Post $post Current post object
     */
    public function render_sidebar_toggle_metabox($post) {
        // Add nonce for security
        wp_nonce_field('lilac_quiz_sidebar_toggle_save', 'lilac_quiz_sidebar_nonce');
        
        // Get current values
        $toggle_sidebar = get_post_meta($post->ID, self::TOGGLE_SIDEBAR_META_KEY, true);
        $enforce_hint = get_post_meta($post->ID, self::ENFORCE_HINT_META_KEY, true);
        ?>
        <div class="lilac-quiz-sidebar-metabox">
            <p>
                <label for="lilac_quiz_toggle_sidebar">
                    <input type="checkbox" id="lilac_quiz_toggle_sidebar" name="lilac_quiz_toggle_sidebar" 
                        value="1" <?php checked($toggle_sidebar, '1'); ?> />
                    <strong><?php _e('Enable Media Sidebar', 'lilac-quiz-sidebar'); ?></strong>
                </label>
            </p>
            <p class="description">
                <?php _e('When enabled, this quiz will display with a sidebar that shows media content for each question.', 'lilac-quiz-sidebar'); ?>
            </p>
            <hr style="margin: 15px 0;" />
            <p>
                <label for="lilac_quiz_enforce_hint">
                    <input type="checkbox" id="lilac_quiz_enforce_hint" name="lilac_quiz_enforce_hint" 
                        value="1" <?php checked($enforce_hint, '1'); ?> />
                    <strong><?php _e('Enforce Hint', 'lilac-quiz-sidebar'); ?></strong>
                </label>
            </p>
            <p class="description">
                <?php _e('When enabled, users must view hints after submitting incorrect answers before proceeding.', 'lilac-quiz-sidebar'); ?>
            </p>
        </div>
        <?php
    }

    /**
     * Save metabox data
     *
     * @param int $post_id Post ID
     */
    public function save_sidebar_toggle_metabox($post_id) {
        // Check if this is an autosave
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        
        // Check nonce
        if (!isset($_POST['lilac_quiz_sidebar_nonce']) || 
            !wp_verify_nonce($_POST['lilac_quiz_sidebar_nonce'], 'lilac_quiz_sidebar_toggle_save')) {
            return;
        }
        
        // Check permissions
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        // Save sidebar toggle state
        if (isset($_POST['lilac_quiz_toggle_sidebar'])) {
            update_post_meta($post_id, self::TOGGLE_SIDEBAR_META_KEY, '1');
        } else {
            delete_post_meta($post_id, self::TOGGLE_SIDEBAR_META_KEY);
        }
        
        // Save enforce hint state
        if (isset($_POST['lilac_quiz_enforce_hint'])) {
            update_post_meta($post_id, self::ENFORCE_HINT_META_KEY, '1');
        } else {
            delete_post_meta($post_id, self::ENFORCE_HINT_META_KEY);
        }
    }

    /**
     * Load sidebar template for quizzes with sidebar enabled
     *
     * @param string $template Current template path
     * @return string Modified template path
     */
    public function load_sidebar_template($template) {
        // Debug: Log template loading attempt
        error_log('Lilac Quiz Sidebar: Template loading check started');
        
        if (is_singular('sfwd-quiz')) {
            $quiz_id = get_the_ID();
            error_log('Lilac Quiz Sidebar: Processing quiz #' . $quiz_id);
            
            $has_sidebar = get_post_meta($quiz_id, self::TOGGLE_SIDEBAR_META_KEY, true);
            error_log('Lilac Quiz Sidebar: Has sidebar meta: ' . print_r($has_sidebar, true));
            
            if ($has_sidebar === '1' || $has_sidebar === 'yes' || $has_sidebar === true) {
                $custom_template = LILAC_QUIZ_SIDEBAR_PLUGIN_DIR . 'templates/single-quiz-sidebar.php';
                error_log('Lilac Quiz Sidebar: Looking for template at: ' . $custom_template);
                
                if (file_exists($custom_template)) {
                    error_log('Lilac Quiz Sidebar: Template found, loading: ' . $custom_template);
                    // Add debug output to HTML
                    add_action('wp_footer', function() use ($quiz_id) {
                        echo '<script type="text/javascript">
                        console.log("Lilac Quiz Sidebar: Debug Info");
                        console.log("Template: ' . esc_js(LILAC_QUIZ_SIDEBAR_PLUGIN_DIR . 'templates/single-quiz-sidebar.php') . '");
                        console.log("Quiz ID: ' . esc_js($quiz_id) . '");
                        console.log("Current Time: ' . esc_js(current_time('mysql')) . '");
                        </script>';
                    });
                    return $custom_template;
                } else {
                    error_log('Lilac Quiz Sidebar: Template file not found: ' . $custom_template);
                }
            } else {
                error_log('Lilac Quiz Sidebar: Sidebar not enabled for this quiz');
            }
        } else {
            error_log('Lilac Quiz Sidebar: Not a single quiz page');
        }
        
        error_log('Lilac Quiz Sidebar: Using default template: ' . $template);
        return $template;
    }

    /**
     * Add quiz-specific body classes
     *
     * @param array $classes Current body classes
     * @return array Modified body classes
     */
    public function add_quiz_body_classes($classes) {
        if (!is_singular('sfwd-quiz')) {
            return $classes;
        }

        $quiz_id = get_queried_object_id();
        $has_sidebar = get_post_meta($quiz_id, self::TOGGLE_SIDEBAR_META_KEY, true);
        $enforce_hint = get_post_meta($quiz_id, self::ENFORCE_HINT_META_KEY, true);

        // Add richSidebar class if sidebar is enabled
        if ($has_sidebar === '1' || $has_sidebar === 'yes' || $has_sidebar === true) {
            $classes[] = 'richSidebar';
        }

        // Add enforceHint class if enforce hint is enabled
        if ($enforce_hint === '1' || $enforce_hint === 'yes' || $enforce_hint === true) {
            $classes[] = 'enforceHint';
        }

        return $classes;
    }

    /**
     * Enqueue scripts and styles
     */
    public function enqueue_scripts_styles() {
        if (is_singular('sfwd-quiz')) {
            $quiz_id = get_the_ID();
            $has_sidebar = get_post_meta($quiz_id, self::TOGGLE_SIDEBAR_META_KEY, true);
            $enforce_hint = get_post_meta($quiz_id, self::ENFORCE_HINT_META_KEY, true);
            
            // Debug logging
            error_log('Lilac Quiz Sidebar: Enqueueing scripts for quiz #' . $quiz_id);
            error_log('Lilac Quiz Sidebar: Has sidebar: ' . print_r($has_sidebar, true));
            error_log('Lilac Quiz Sidebar: Enforce hint: ' . print_r($enforce_hint, true));
            
            // Always load debug script in development
            if (defined('WP_DEBUG') && WP_DEBUG) {
                wp_enqueue_script(
                    'lilac-quiz-debug-loader',
                    LILAC_QUIZ_SIDEBAR_PLUGIN_URL . 'assets/js/debug-script-loader.js',
                    array('jquery'),
                    LILAC_QUIZ_SIDEBAR_VERSION,
                    true
                );
                
                // Add debug styles
                wp_add_inline_style('dashicons', '
                    .lilac-debug-info {
                        position: fixed;
                        bottom: 10px;
                        right: 10px;
                        background: rgba(0,0,0,0.8);
                        color: #fff;
                        padding: 10px;
                        z-index: 99999;
                        font-family: monospace;
                        font-size: 12px;
                        border-radius: 4px;
                        max-width: 300px;
                    }
                ');
            }
            
            // If sidebar is enabled, load sidebar scripts and styles
            if ($has_sidebar === '1' || $has_sidebar === 'yes' || $has_sidebar === true) {
                error_log('Lilac Quiz Sidebar: Loading sidebar assets');
                
                // Enqueue CSS with version for cache busting
                $css_path = LILAC_QUIZ_SIDEBAR_PLUGIN_DIR . 'assets/css/quiz-sidebar.css';
                $css_url = LILAC_QUIZ_SIDEBAR_PLUGIN_URL . 'assets/css/quiz-sidebar.css';
                $css_ver = file_exists($css_path) ? filemtime($css_path) : LILAC_QUIZ_SIDEBAR_VERSION;
                
                wp_enqueue_style(
                    'lilac-quiz-sidebar-style',
                    $css_url,
                    array(),
                    $css_ver
                );
                
                // Body classes are now handled by add_quiz_body_classes() method
                
                // Enqueue JavaScript with version for cache busting
                $js_path = LILAC_QUIZ_SIDEBAR_PLUGIN_DIR . 'assets/js/quiz-sidebar-media.js';
                $js_url = LILAC_QUIZ_SIDEBAR_PLUGIN_URL . 'assets/js/quiz-sidebar-media.js';
                $js_ver = file_exists($js_path) ? filemtime($js_path) : LILAC_QUIZ_SIDEBAR_VERSION;
                
                // Enqueue immediate media fix first (high priority)
                $immediate_fix_path = LILAC_QUIZ_SIDEBAR_PLUGIN_DIR . 'assets/js/immediate-media-fix.js';
                $immediate_fix_url = LILAC_QUIZ_SIDEBAR_PLUGIN_URL . 'assets/js/immediate-media-fix.js';
                $immediate_fix_ver = file_exists($immediate_fix_path) ? filemtime($immediate_fix_path) : LILAC_QUIZ_SIDEBAR_VERSION;
                
                wp_enqueue_script(
                    'lilac-quiz-sidebar-immediate-fix',
                    $immediate_fix_url,
                    array('jquery'),
                    $immediate_fix_ver,
                    false // Load in header for immediate execution
                );
                
                // Enqueue the main JavaScript
                wp_enqueue_script('lilac-quiz-sidebar-media', $js_url, array('jquery'), $js_ver, true);
                
                // Enqueue enhanced layout JavaScript
                $enhanced_js_path = LILAC_QUIZ_SIDEBAR_PLUGIN_DIR . 'assets/js/enhanced-sidebar-layout.js';
                $enhanced_js_url = LILAC_QUIZ_SIDEBAR_PLUGIN_URL . 'assets/js/enhanced-sidebar-layout.js';
                $enhanced_js_ver = file_exists($enhanced_js_path) ? filemtime($enhanced_js_path) : LILAC_QUIZ_SIDEBAR_VERSION;
                
                wp_enqueue_script(
                    'lilac-quiz-sidebar-enhanced',
                    $enhanced_js_url,
                    array('jquery', 'lilac-quiz-sidebar-media'),
                    $enhanced_js_ver,
                    true
                );
                
                // Localize the script with quiz data
                wp_localize_script('lilac-quiz-sidebar-media', 'lilacQuizSidebar', array(
                    'ajaxUrl' => admin_url('admin-ajax.php'),
                    'nonce' => wp_create_nonce('lilac_quiz_sidebar_nonce'),
                    'quizId' => $quiz_id,
                    'enforceHint' => $enforce_hint === '1',
                    'debug' => defined('WP_DEBUG') && WP_DEBUG,
                    'fallbackImageUrl' => plugins_url('/assets/images/default-media.png', LILAC_QUIZ_SIDEBAR_PLUGIN_DIR),
                    'pluginUrl' => LILAC_QUIZ_SIDEBAR_PLUGIN_URL,
                    'template' => 'single-quiz-sidebar.php'
                ));
                
                // Debug info removed for production
            }
            
            // If hint enforcement is enabled, load that functionality
            if ($enforce_hint === '1') {
                // Enqueue CSS for hint enforcement
                wp_enqueue_style(
                    'lilac-quiz-answer-reselection',
                    LILAC_QUIZ_SIDEBAR_PLUGIN_URL . 'assets/css/quiz-answer-reselection.css',
                    array(),
                    LILAC_QUIZ_SIDEBAR_VERSION
                );
                
                // Enqueue custom quiz overrides CSS
                wp_enqueue_style(
                    'lilac-quiz-custom-overrides',
                    LILAC_QUIZ_SIDEBAR_PLUGIN_URL . 'assets/css/custom-quiz-overrides.css',
                    array('lilac-quiz-answer-reselection'),
                    LILAC_QUIZ_SIDEBAR_VERSION
                );
                
                // Enqueue navigation control script
                wp_enqueue_script(
                    'lilac-quiz-navigation-control',
                    LILAC_QUIZ_SIDEBAR_PLUGIN_URL . 'assets/js/quiz-navigation-control.js',
                    array('jquery'),
                    LILAC_QUIZ_SIDEBAR_VERSION,
                    true
                );
                
                // Localize script with enforce_hint setting
                wp_localize_script('lilac-quiz-navigation-control', 'lilacQuizSidebar', array(
                    'enforceHint' => true,
                    'ajaxUrl' => admin_url('admin-ajax.php'),
                    'nonce' => wp_create_nonce('lilac_quiz_sidebar_nonce')
                ));
                
                // Enqueue JavaScript for hint enforcement with no dependencies
                $script_handle = 'lilac-quiz-answer-reselection';
                wp_register_script(
                    $script_handle,
                    LILAC_QUIZ_SIDEBAR_PLUGIN_URL . 'assets/js/quiz-answer-reselection.js',
                    array('jquery'),
                    LILAC_QUIZ_SIDEBAR_VERSION,
                    true
                );
                
                // Add debug information
                wp_add_inline_script($script_handle, 
                    'console.log("Lilac Quiz: Answer Reselection script registered");',
                    'before'
                );
                
                // Enqueue the script
                wp_enqueue_script($script_handle);
                
                // Add error logging
                add_action('wp_footer', function() use ($script_handle) {
                    echo '<script>
                    document.addEventListener("DOMContentLoaded", function() {
                        console.log("DOM fully loaded and parsed");
                        
                        // Check if jQuery is loaded
                        if (typeof jQuery === "undefined") {
                            console.error("jQuery is not loaded!");
                        } else {
                            console.log("jQuery version:", jQuery.fn.jquery);
                        }
                        
                        // Check if our script is in the DOM
                        const scriptElements = document.getElementsByTagName("script");
                        let scriptFound = false;
                        for (let i = 0; i < scriptElements.length; i++) {
                            if (scriptElements[i].src.includes("quiz-answer-reselection.js")) {
                                scriptFound = true;
                                console.log("Found quiz-answer-reselection.js in the DOM");
                                break;
                            }
                        }
                        
                        if (!scriptFound) {
                            console.error("quiz-answer-reselection.js not found in the DOM!");
                            
                            // Try to load it manually
                            const script = document.createElement("script");
                            script.src = "' . LILAC_QUIZ_SIDEBAR_PLUGIN_URL . 'assets/js/quiz-answer-reselection.js?ver=' . LILAC_QUIZ_SIDEBAR_VERSION . '";
                            script.onload = function() {
                                console.log("Successfully loaded quiz script manually!");
                            };
                            script.onerror = function() {
                                console.error("Failed to load quiz script!");
                            };
                            document.body.appendChild(script);
                        }
                    });
                    </script>';
                }, 999);
                
                // Localize script
                wp_localize_script('lilac-quiz-answer-reselection', 'lilacHintEnforcement', array(
                    'debug' => defined('WP_DEBUG') && WP_DEBUG,
                    'tooltipText' => __('טעית! להמשך חובה לקחת רמז!', 'lilac-quiz-sidebar'),
                    'quizId' => $quiz_id,
                    'ajaxUrl' => admin_url('admin-ajax.php'),
                    'nonce' => wp_create_nonce('lilac_quiz_hint_nonce')
                ));
                
                // Add inline script to log when our script is loaded
                wp_add_inline_script('lilac-quiz-answer-reselection', 
                    'console.log("Lilac Quiz: Answer Reselection script loaded successfully");',
                    'after'
                );
            }
        }
    }

    /**
     * Add admin columns for quiz list
     *
     * @param array $columns Current columns
     * @return array Modified columns
     */
    public function add_admin_columns($columns) {
        $new_columns = array();
        
        foreach ($columns as $key => $value) {
            $new_columns[$key] = $value;
            
            if ($key === 'title') {
                $new_columns['quiz_sidebar'] = __('Media Sidebar', 'lilac-quiz-sidebar');
                $new_columns['quiz_enforce_hint'] = __('Enforce Hint', 'lilac-quiz-sidebar');
            }
        }
        
        return $new_columns;
    }

    /**
     * Render admin column content
     *
     * @param string $column Column name
     * @param int $post_id Post ID
     */
    public function render_admin_columns($column, $post_id) {
        if ($column === 'quiz_sidebar') {
            $has_sidebar = get_post_meta($post_id, self::TOGGLE_SIDEBAR_META_KEY, true);
            echo $has_sidebar ? __('Enabled', 'lilac-quiz-sidebar') : __('Disabled', 'lilac-quiz-sidebar');
        } else if ($column === 'quiz_enforce_hint') {
            $enforce_hint = get_post_meta($post_id, self::ENFORCE_HINT_META_KEY, true);
            echo $enforce_hint ? __('Enabled', 'lilac-quiz-sidebar') : __('Disabled', 'lilac-quiz-sidebar');
        }
    }

    /**
     * AJAX handler for getting question media
     */
    public function get_question_acf_media() {
        // Debug disabled - production mode
        $debug_mode = false;
        $debug_data = [];
        
        // Minimal logging for critical errors only
        $debug_data = [
            'error' => false
        ];
        
        // Check nonce for security
        if (isset($_POST['nonce'])) {
            $valid_nonce = wp_verify_nonce($_POST['nonce'], 'get_question_acf_media_nonce');
            
            if (!$valid_nonce && !defined('WP_DEBUG')) {
                wp_send_json_error(['message' => 'Security check failed']);
                return;
            }
        }
        
        // Check if question ID is set
        if (!isset($_POST['question_id']) || empty($_POST['question_id'])) {
            $debug_data['error'] = 'missing_question_id';
            $debug_data['debug_log'][] = 'ERROR: No question ID provided';
            wp_send_json_error(['message' => 'No question ID provided', 'debug' => $debug_data]);
            return;
        }
        
        // Get question ID
        $question_id = intval($_POST['question_id']);
        $debug_data['question_id'] = $question_id;
        $debug_data['debug_log'][] = "Question ID: {$question_id}";
        
        // Prepare response array
        $response = [];
        
        // Get question index for fallback if needed
        $question_index = isset($_POST['question_index']) ? intval($_POST['question_index']) : null;
        $debug_data['question_index'] = $question_index;
        $debug_data['debug_log'][] = "Question Index: " . ($question_index !== null ? $question_index : 'not provided');
        
        // Clear any WordPress cache for this post to ensure fresh data
        clean_post_cache($question_id);
        wp_cache_delete($question_id, 'post_meta');
        $debug_data['debug_log'][] = "Cache cleared for post {$question_id}";
        
        // Check if ACF is active
        $has_acf = function_exists('get_field') || function_exists('get_fields');
        $debug_data['acf_active'] = $has_acf;
        $debug_data['debug_log'][] = "ACF Active: " . ($has_acf ? 'YES' : 'NO');
        
        // Verify post exists
        $post = get_post($question_id);
        $post_exists = $post !== null;
        $debug_data['post_exists'] = $post_exists;
        
        if ($post_exists) {
            $debug_data['debug_log'][] = "Post exists: YES";
            $debug_data['debug_log'][] = "Post type: {$post->post_type}";
            $debug_data['debug_log'][] = "Post title: {$post->post_title}";
            $debug_data['post_type'] = $post->post_type;
            $debug_data['post_title'] = $post->post_title;
        } else {
            $debug_data['debug_log'][] = "Post exists: NO";
        }
        
        // If post doesn't exist, use fallback
        if (!$post_exists) {
            $debug_data['error'] = 'post_not_found';
            $debug_data['debug_log'][] = "ERROR: Post not found, using fallback";
            
            // Use default image as fallback
            $default_image_url = site_url('/wp-content/uploads/2025/05/noPic.png');
            $response = [
                'type' => 'image',
                'url' => $default_image_url,
                'alt' => 'Question media',
                'fallback' => true
            ];
            
            $debug_data['response'] = $response;
            wp_send_json_success(['media' => $response, 'debug' => $debug_data]);
            return;
        }
        
        // Get ACF fields if available
        if ($has_acf) {
            $acf_fields = [];
            if (function_exists('get_fields')) {
                $acf_fields = get_fields($question_id);
            }
            
            // Store raw ACF fields for debugging
            $debug_data['acf_fields_raw'] = $acf_fields;
            $debug_data['acf_field_keys'] = is_array($acf_fields) ? array_keys($acf_fields) : [];
            $debug_data['debug_log'][] = "ACF Fields found: " . (!empty($acf_fields) ? 'YES' : 'NO');
            
            // Add more detailed ACF debugging
            if (empty($acf_fields)) {
                // Try direct post meta as fallback
                $all_meta = get_post_meta($question_id);
                $debug_data['all_post_meta_keys'] = $all_meta ? array_keys($all_meta) : [];
                $debug_data['debug_log'][] = "No ACF fields found, checked post meta instead";
                
                // Look for any meta keys that might contain media
                $media_meta_keys = [];
                if ($all_meta) {
                    foreach ($all_meta as $key => $value) {
                        if (strpos($key, 'image') !== false || 
                            strpos($key, 'media') !== false || 
                            strpos($key, 'video') !== false || 
                            strpos($key, 'picture') !== false) {
                            $media_meta_keys[$key] = $value[0];
                        }
                    }
                }
                $debug_data['potential_media_meta'] = $media_meta_keys;
            } else {
                $debug_data['debug_log'][] = "Found " . count($acf_fields) . " ACF fields";
                
                // Add specific field debugging for common fields
                $key_fields = ['choose_media', 'rich_media', 'video_url', 'question_image', 'media_image'];
                foreach ($key_fields as $key) {
                    if (isset($acf_fields[$key])) {
                        $debug_data['field_' . $key] = $acf_fields[$key];
                        $debug_data['debug_log'][] = "Found field '{$key}' with value: " . print_r($acf_fields[$key], true);
                    }
                }
            }
            
            // Get media type from choose_media field
            $media_type = isset($acf_fields['choose_media']) ? $acf_fields['choose_media'] : get_field('choose_media', $question_id);
            $debug_data['media_type'] = $media_type;
            $debug_data['debug_log'][] = "Media Type: " . ($media_type ?: 'not found');
            
            // Default to image if no media type specified
            if (!$media_type) {
                $media_type = 'תמונה'; // Hebrew for "image"
            }
            
            // Handle image media
            if ($media_type === 'תמונה' || $media_type === 'image') {
                // First try rich_media field
                $image = null;
                
                // Try all possible image field names in order of priority
                $image_field_names = ['rich_media', 'media_image', 'question_media', 'media_image_field', 'question_image'];
                
                foreach ($image_field_names as $field_name) {
                    // Try from get_fields result first
                    if (isset($acf_fields[$field_name])) {
                        $image_field = $acf_fields[$field_name];
                        
                        // Handle different possible formats
                        if (is_array($image_field) && !empty($image_field['url'])) {
                            $image = $image_field;
                            break;
                        } elseif (is_string($image_field) && !empty($image_field)) {
                            $image = array('url' => $image_field);
                            break;
                        } elseif (is_numeric($image_field)) {
                            $image_url = wp_get_attachment_url($image_field);
                            if ($image_url) {
                                $image = array('url' => $image_url);
                                break;
                            }
                        }
                    }
                    
                    // Try with direct get_field if not found
                    $field_value = get_field($field_name, $question_id);
                    if ($field_value) {
                        if (is_array($field_value) && !empty($field_value['url'])) {
                            $image = $field_value;
                            break;
                        } elseif (is_string($field_value) && !empty($field_value)) {
                            $image = array('url' => $field_value);
                            break;
                        } elseif (is_numeric($field_value)) {
                            $image_url = wp_get_attachment_url($field_value);
                            if ($image_url) {
                                $image = array('url' => $image_url);
                                break;
                            }
                        }
                    }
                }
                
                // If we found an image, add it to the response
                if ($image && !empty($image['url'])) {
                    $response['type'] = 'image';
                    $response['url'] = $image['url'];
                    $response['width'] = isset($image['width']) ? $image['width'] : '';
                    $response['height'] = isset($image['height']) ? $image['height'] : '';
                    $response['alt'] = isset($image['alt']) ? $image['alt'] : '';
                }
            } 
            // Handle video media
            elseif ($media_type === 'סרטון' || $media_type === 'video') {
                // Try different possible video field names
                $video_field_names = ['video_url', 'question_video', 'video', 'video_question'];
                $video_url = null;
                
                foreach ($video_field_names as $field_name) {
                    // Try from get_fields result first
                    if (isset($acf_fields[$field_name]) && !empty($acf_fields[$field_name])) {
                        $video_url = $acf_fields[$field_name];
                        break;
                    }
                    
                    // Try with direct get_field
                    $field_value = get_field($field_name, $question_id);
                    if ($field_value && !empty($field_value)) {
                        $video_url = $field_value;
                        break;
                    }
                }
                
                if ($video_url) {
                    $response['type'] = 'video';
                    $response['url'] = $video_url;
                    
                    // YouTube video
                    if (strpos($video_url, 'youtube.com') !== false || strpos($video_url, 'youtu.be') !== false) {
                        $response['youtube_id'] = $this->get_youtube_id($video_url);
                    }
                    // Vimeo video
                    else if (strpos($video_url, 'vimeo.com') !== false) {
                        // Extract Vimeo ID
                        preg_match('/vimeo\.com\/(?:video\/)?([0-9]+)/', $video_url, $matches);
                        if (!empty($matches[1])) {
                            $response['vimeo_id'] = $matches[1];
                        }
                    }
                    // Check if it's an iframe embed code rather than a URL
                    else if (strpos($video_url, '<iframe') !== false) {
                        $response['embed_code'] = $video_url;
                    }
                }
            }
        }
        
        // Fallback to standard post meta if ACF is not active or no data found
        if (empty($response)) {
            $image_url = get_post_meta($question_id, '_question_image', true);
            $video_url = get_post_meta($question_id, '_question_video', true);
            
            if (!empty($image_url)) {
                $response['type'] = 'image';
                $response['url'] = $image_url;
                $response['width'] = '';
                $response['height'] = '';
                $response['alt'] = '';
            } elseif (!empty($video_url)) {
                $response['type'] = 'video';
                $response['url'] = $video_url;
                
                // YouTube video
                if (strpos($video_url, 'youtube.com') !== false || strpos($video_url, 'youtu.be') !== false) {
                    $response['youtube_id'] = $this->get_youtube_id($video_url);
                }
            }
        }
        
        // Add the final response to debug data
        // Send the response without debug data
        if (!empty($response)) {
            wp_send_json_success([
                'media' => $response
            ]);
        } else {
            // No media was found - return a default image as fallback
            $default_image_url = site_url('/wp-content/uploads/2025/05/noPic.png');
            if (!file_exists(ABSPATH . 'wp-content/uploads/2025/05/noPic.png')) {
                // Use a placeholder as last resort
                $default_image_url = 'https://via.placeholder.com/400x300?text=Question+Media';
            }
            
            $fallback_response = [
                'type' => 'image',
                'url' => $default_image_url,
                'alt' => 'Default question media',
                'fallback' => true
            ];
            
            wp_send_json_success([
                'media' => $fallback_response
            ]);
        }
    }

    /**
     * Extract YouTube video ID from URL
     *
     * @param string $url YouTube URL
     * @return string YouTube ID or empty string if not found
     */
    private function get_youtube_id($url) {
        $pattern = '/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/';
        
        if (preg_match($pattern, $url, $matches)) {
            return $matches[1];
        }
        
        return '';
    }
    
    /**
     * Enqueue admin scripts
     *
     * @param string $hook Current admin page
     */
    public function enqueue_admin_scripts($hook) {
        global $post_type;
        
        // Only load scripts on the quiz list or edit pages
        if (($hook === 'edit.php' && $post_type === 'sfwd-quiz') || 
            ($hook === 'post.php' && $post_type === 'sfwd-quiz') || 
            ($hook === 'post-new.php' && $post_type === 'sfwd-quiz')) {
            
            wp_enqueue_script(
                'lilac-quiz-sidebar-admin',
                LILAC_QUIZ_SIDEBAR_PLUGIN_URL . 'assets/js/quiz-sidebar-admin.js',
                array('jquery', 'inline-edit-post'),
                LILAC_QUIZ_SIDEBAR_VERSION,
                true
            );
            
            // Localize the script with translation strings
            wp_localize_script(
                'lilac-quiz-sidebar-admin',
                'lilacQuizSidebar',
                array(
                    'nonce' => wp_create_nonce('lilac_quiz_sidebar_ajax'),
                    'toggle_sidebar_label' => __('Enable Sidebar', 'lilac-quiz-sidebar'),
                    'enable' => __('Enable', 'lilac-quiz-sidebar'),
                    'disable' => __('Disable', 'lilac-quiz-sidebar')
                )
            );
        }
    }
    
    /**
     * Add fields to quick edit interface
     *
     * @param string $column_name Name of the column
     * @param string $post_type Post type
     */
    public function add_quick_edit_fields($column_name, $post_type) {
        if ($post_type !== 'sfwd-quiz' || ($column_name !== 'quiz_sidebar' && $column_name !== 'quiz_enforce_hint')) {
            return;
        }
        
        if ($column_name === 'quiz_sidebar') {
            ?>        
            <fieldset class="inline-edit-col-right">
                <div class="inline-edit-col">
                    <label class="inline-edit-group">
                        <span class="title"><?php _e('Quiz Media Sidebar', 'lilac-quiz-sidebar'); ?></span>
                        <input type="checkbox" name="<?php echo esc_attr(self::TOGGLE_SIDEBAR_META_KEY); ?>" value="1" />
                        <span class="checkbox-title"><?php _e('Enable', 'lilac-quiz-sidebar'); ?></span>
                    </label>
                </div>
            </fieldset>
            <?php
        }
        
        if ($column_name === 'quiz_enforce_hint') {
            ?>        
            <fieldset class="inline-edit-col-right">
                <div class="inline-edit-col">
                    <label class="inline-edit-group">
                        <span class="title"><?php _e('Enforce Hint', 'lilac-quiz-sidebar'); ?></span>
                        <input type="checkbox" name="<?php echo esc_attr(self::ENFORCE_HINT_META_KEY); ?>" value="1" />
                        <span class="checkbox-title"><?php _e('Enable', 'lilac-quiz-sidebar'); ?></span>
                    </label>
                </div>
            </fieldset>
            <?php
        }
    }
    
    /**
     * Add fields to bulk edit interface
     *
     * @param string $column_name Name of the column
     * @param string $post_type Post type
     */
    public function add_bulk_edit_fields($column_name, $post_type) {
        if ($post_type !== 'sfwd-quiz' || ($column_name !== 'quiz_sidebar' && $column_name !== 'quiz_enforce_hint')) {
            return;
        }
        
        if ($column_name === 'quiz_sidebar') {
            ?>        
            <fieldset class="inline-edit-col-right">
                <div class="inline-edit-col">
                    <label class="inline-edit-group">
                        <span class="title"><?php _e('Quiz Media Sidebar', 'lilac-quiz-sidebar'); ?></span>
                        <select name="<?php echo esc_attr(self::TOGGLE_SIDEBAR_META_KEY); ?>">
                            <option value="">— <?php _e('No Change', 'lilac-quiz-sidebar'); ?> —</option>
                            <option value="1"><?php _e('Enable', 'lilac-quiz-sidebar'); ?></option>
                            <option value="0"><?php _e('Disable', 'lilac-quiz-sidebar'); ?></option>
                        </select>
                    </label>
                </div>
            </fieldset>
            <?php
        }
        
        if ($column_name === 'quiz_enforce_hint') {
            ?>        
            <fieldset class="inline-edit-col-right">
                <div class="inline-edit-col">
                    <label class="inline-edit-group">
                        <span class="title"><?php _e('Enforce Hint', 'lilac-quiz-sidebar'); ?></span>
                        <select name="<?php echo esc_attr(self::ENFORCE_HINT_META_KEY); ?>">
                            <option value="">— <?php _e('No Change', 'lilac-quiz-sidebar'); ?> —</option>
                            <option value="1"><?php _e('Enable', 'lilac-quiz-sidebar'); ?></option>
                            <option value="0"><?php _e('Disable', 'lilac-quiz-sidebar'); ?></option>
                        </select>
                    </label>
                </div>
            </fieldset>
            <?php
        }
    }
    
    /**
     * Save data from quick edit
     *
     * @param int $post_id Post ID
     */
    public function save_quick_edit_data($post_id) {
        // Don't save for autosaves
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        
        // Only continue for quizzes
        if (get_post_type($post_id) !== 'sfwd-quiz') {
            return;
        }
        
        // Check permissions
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        // Handle the sidebar toggle
        if (isset($_POST[self::TOGGLE_SIDEBAR_META_KEY])) {
            if ($_POST[self::TOGGLE_SIDEBAR_META_KEY] === '1') {
                update_post_meta($post_id, self::TOGGLE_SIDEBAR_META_KEY, '1');
            } else if ($_POST[self::TOGGLE_SIDEBAR_META_KEY] === '0') {
                delete_post_meta($post_id, self::TOGGLE_SIDEBAR_META_KEY);
            }
        }
        
        // Handle the enforce hint toggle
        if (isset($_POST[self::ENFORCE_HINT_META_KEY])) {
            if ($_POST[self::ENFORCE_HINT_META_KEY] === '1') {
                update_post_meta($post_id, self::ENFORCE_HINT_META_KEY, '1');
            } else if ($_POST[self::ENFORCE_HINT_META_KEY] === '0') {
                delete_post_meta($post_id, self::ENFORCE_HINT_META_KEY);
            }
        }
    }
    
    /**
     * Disable debug panel that appears at the bottom of the quiz page
     * This method uses CSS to hide the debug panel and JavaScript to remove it from the DOM
     */
    public function disable_debug_panel() {
        if (!is_singular('sfwd-quiz')) {
            return;
        }
        
        // Output inline CSS to hide the debug panel
        echo '<style>
            /* Hide LearnDash debug info panel */
            div[style*="background: #f5f5f5; padding: 15px; margin: 20px; border: 1px solid #ddd; font-family: monospace"],
            div#quiz-debug-panel {
                display: none !important;
            }
        </style>';
        
        // Output inline JavaScript to remove the debug panel from DOM
        echo '<script>
            document.addEventListener("DOMContentLoaded", function() {
                // Remove any debug panels that match the style pattern
                var debugPanels = document.querySelectorAll("div[style*=\"background: #f5f5f5; padding: 15px; margin: 20px; border: 1px solid #ddd\"]");
                debugPanels.forEach(function(panel) {
                    if (panel.textContent.indexOf("Debug Info") !== -1) {
                        panel.parentNode.removeChild(panel);
                    }
                });
            });
        </script>';
    }
    
    /**
     * AJAX handler for checking if enforce hint is enabled for a quiz
     */
    public function check_quiz_enforce_hint() {
        $response = array(
            'success' => false,
            'enforce_hint' => false,
            'message' => 'Invalid request'
        );
        
        // Get the quiz ID from the AJAX request
        $quiz_id = isset($_POST['quiz_id']) ? intval($_POST['quiz_id']) : 0;
        
        if (!$quiz_id) {
            // Try to get it from the current page if not provided
            if (is_singular('sfwd-quiz')) {
                $quiz_id = get_the_ID();
            }
        }
        
        if ($quiz_id > 0) {
            // Check if enforce hint is enabled
            $enforce_hint = get_post_meta($quiz_id, self::ENFORCE_HINT_META_KEY, true);
            
            $response = array(
                'success' => true,
                'quiz_id' => $quiz_id,
                'enforce_hint' => ($enforce_hint === '1'),
                'message' => 'Quiz settings retrieved'
            );
        }
        
        echo wp_json_encode($response);
        wp_die();
    }
    
    /**
     * AJAX handler for updating quiz sidebar settings
     */
    public function ajax_update_quiz_sidebar_settings() {
        // Check nonce
        if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'lilac_quiz_sidebar_ajax')) {
            wp_send_json_error(array('message' => __('Security check failed', 'lilac-quiz-sidebar')));
        }
        
        // Check permissions
        if (!current_user_can('edit_posts')) {
            wp_send_json_error(array('message' => __('Permission denied', 'lilac-quiz-sidebar')));
        }
        
        // Check for post ID
        if (!isset($_POST['post_id']) || empty($_POST['post_id'])) {
            wp_send_json_error(array('message' => __('No post ID provided', 'lilac-quiz-sidebar')));
        }
        
        $post_id = intval($_POST['post_id']);
        
        // Make sure it's a quiz
        if (get_post_type($post_id) !== 'sfwd-quiz') {
            wp_send_json_error(array('message' => __('Not a quiz', 'lilac-quiz-sidebar')));
        }
        
        // Update sidebar toggle
        if (isset($_POST['toggle_sidebar'])) {
            if ($_POST['toggle_sidebar'] == '1') {
                update_post_meta($post_id, self::TOGGLE_SIDEBAR_META_KEY, '1');
            } else {
                delete_post_meta($post_id, self::TOGGLE_SIDEBAR_META_KEY);
            }
        }
        
        // Update enforce hint
        if (isset($_POST['enforce_hint'])) {
            if ($_POST['enforce_hint'] == '1') {
                update_post_meta($post_id, self::ENFORCE_HINT_META_KEY, '1');
            } else {
                delete_post_meta($post_id, self::ENFORCE_HINT_META_KEY);
            }
        }
        
        wp_send_json_success(array('message' => __('Settings updated', 'lilac-quiz-sidebar')));
    }
}

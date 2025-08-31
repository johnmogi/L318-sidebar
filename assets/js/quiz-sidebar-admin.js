/**
 * Admin JavaScript for Quiz Sidebar
 * 
 * Handles quick edit functionality for quiz sidebar settings
 */

(function($) {
    'use strict';
    
    // Initialize when document is ready
    $(document).ready(function() {
        // Quick Edit support
        if (typeof inlineEditPost !== 'undefined') {
            // Store the original edit post function
            var $wp_inline_edit = inlineEditPost.edit;
            
            // Replace with our own
            inlineEditPost.edit = function(id) {
                // Call the original function
                var result = $wp_inline_edit.apply(this, arguments);
                
                // Get the post ID from the argument
                var post_id = 0;
                if (typeof id === 'object') {
                    post_id = parseInt(this.getId(id));
                }
                
                if (post_id > 0) {
                    // Find the row with our custom column
                    var $row = $('#post-' + post_id);
                    
                    // Get the current values
                    var toggleSidebar = $('.column-quiz_sidebar', $row).text() === 'Enabled' ? true : false;
                    var enforceHint = $('.column-quiz_enforce_hint', $row).text() === 'Enabled' ? true : false;
                    
                    // Find the quick edit row and set values
                    var $quickEdit = $('#edit-' + post_id);
                    $('input[name="_ld_quiz_toggle_sidebar"]', $quickEdit).prop('checked', toggleSidebar);
                    $('input[name="_ld_quiz_enforce_hint"]', $quickEdit).prop('checked', enforceHint);
                }
                
                return result;
            };
        }
        
        // Handle bulk edit
        $('#bulk_edit').on('click', function() {
            // Get checked boxes
            var $checkedBoxes = $('.wp-list-table input[name="post[]"]:checked');
            
            if ($checkedBoxes.length > 0) {
                // Get the bulk edit values
                var toggleSidebar = $('select[name="_ld_quiz_toggle_sidebar"]').val();
                var enforceHint = $('select[name="_ld_quiz_enforce_hint"]').val();
                
                // Process each selected post
                $checkedBoxes.each(function() {
                    var post_id = $(this).val();
                    
                    // Prepare data for AJAX request
                    var data = {
                        action: 'update_quiz_sidebar_settings',
                        post_id: post_id,
                        nonce: lilacQuizSidebar.nonce
                    };
                    
                    // Only include fields that are being updated
                    if (toggleSidebar !== '') {
                        data.toggle_sidebar = toggleSidebar;
                    }
                    
                    if (enforceHint !== '') {
                        data.enforce_hint = enforceHint;
                    }
                    
                    // Send AJAX request
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: data,
                        success: function(response) {
                            // Success handling if needed
                        }
                    });
                });
            }
        });
    });
    
})(jQuery);

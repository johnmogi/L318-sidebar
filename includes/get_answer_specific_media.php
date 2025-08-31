    /**
     * AJAX handler for getting answer-specific media
     */
    public function get_answer_specific_media() {
        // Debug output
        error_log('LILAC DEBUG: get_answer_specific_media function called');
        
        // Check nonce for security
        check_ajax_referer('lilac_quiz_sidebar_nonce', 'nonce');
        
        // Verify we have the required data
        if (!isset($_POST['question_id']) || !isset($_POST['answer_id'])) {
            error_log('LILAC DEBUG: Missing required parameters');
            wp_send_json_error(array('message' => 'Missing required parameters'));
            return;
        }
        
        error_log('LILAC DEBUG: Received question_id: ' . $_POST['question_id'] . ', answer_id: ' . $_POST['answer_id']);
        
        // Get question and answer IDs
        $question_id = intval($_POST['question_id']);
        $answer_id = intval($_POST['answer_id']);
        
        error_log('LILAC DEBUG: Converted to integers - question_id: ' . $question_id . ', answer_id: ' . $answer_id);
        
        // Prepare response array
        $response = array(
            'type' => 'none',
            'url' => '',
            'alt' => '',
        );
        
        // Check if ACF is active
        if (function_exists('get_field')) {
            error_log('LILAC DEBUG: ACF is active');
            
            // Try to get answer-specific media fields
            $field_patterns = array(
                'answer_%d_media',
                'answer_%d_image',
                'answer_%d_video',
                'media_answer_%d',
                'image_answer_%d',
                'video_answer_%d',
            );
            
            error_log('LILAC DEBUG: Checking field patterns for answer-specific media');
            
            // Check each field pattern
            foreach ($field_patterns as $pattern) {
                $field_name = sprintf($pattern, $answer_id);
                error_log('LILAC DEBUG: Checking field: ' . $field_name);
                
                $media = get_field($field_name, $question_id);
                if (!empty($media)) {
                    error_log('LILAC DEBUG: Found media in field: ' . $field_name);
                    error_log('LILAC DEBUG: Media data: ' . print_r($media, true));
                    
                    // Check if it's an image or video
                    if (is_array($media) && isset($media['type'])) {
                        if ($media['type'] == 'image' && isset($media['url'])) {
                            $response['type'] = 'image';
                            $response['url'] = $media['url'];
                            $response['alt'] = isset($media['alt']) ? $media['alt'] : '';
                            break;
                        } elseif ($media['type'] == 'video' && isset($media['url'])) {
                            $response['type'] = 'video';
                            $response['url'] = $media['url'];
                            break;
                        }
                    } elseif (is_string($media)) {
                        // Check if it's a video URL
                        if (strpos($media, 'youtube.com') !== false || 
                            strpos($media, 'youtu.be') !== false || 
                            strpos($media, 'vimeo.com') !== false || 
                            strpos($media, '<iframe') !== false) {
                            $response['type'] = 'video';
                            $response['url'] = $media;
                            
                            // YouTube video
                            if (strpos($media, 'youtube.com') !== false || strpos($media, 'youtu.be') !== false) {
                                $response['youtube_id'] = $this->get_youtube_id($media);
                            }
                            // Vimeo video
                            else if (strpos($media, 'vimeo.com') !== false) {
                                // Extract Vimeo ID
                                preg_match('/vimeo\\.com\\/(?:video\\/)?([0-9]+)/', $media, $matches);
                                if (!empty($matches[1])) {
                                    $response['vimeo_id'] = $matches[1];
                                }
                            }
                            // Check if it's an iframe embed code rather than a URL
                            else if (strpos($media, '<iframe') !== false) {
                                $response['embed_code'] = $media;
                            }
                            break;
                        } else {
                            // Assume it's an image URL
                            $response['type'] = 'image';
                            $response['url'] = $media;
                            break;
                        }
                    }
                }
            }
        }
        
        // If we found any media, return it
        if ($response['type'] !== 'none') {
            error_log('LILAC DEBUG: Returning media: ' . print_r($response, true));
            wp_send_json_success(array('media' => $response));
            return;
        } else {
            error_log('LILAC DEBUG: No answer-specific media found');
        }
        
        // If we didn't find answer-specific media, try to get general question media
        // as a fallback
        error_log('LILAC DEBUG: Trying to get general question media as fallback');
        $response = $this->get_question_media_response($question_id);
        
        if ($response['type'] !== 'none') {
            error_log('LILAC DEBUG: Returning general question media: ' . print_r($response, true));
            wp_send_json_success(array('media' => $response));
        } else {
            error_log('LILAC DEBUG: No media found at all for this question');
            wp_send_json_error(array('message' => 'No media found for this question'));
        }
    }

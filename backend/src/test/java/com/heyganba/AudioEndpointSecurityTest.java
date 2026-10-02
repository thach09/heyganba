package com.heyganba;

import com.heyganba.support.ContentApiTestBase;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Chặn lạm dụng endpoint TTS (`/audio/tts`).
 *
 * TTS dùng endpoint KHÔNG chính thức của Google ⇒ nếu để public, người ngoài có thể biến server thành proxy TTS
 * miễn phí (và làm IP của mình bị Google chặn). Vì vậy endpoint phải nằm sau đăng nhập (không có trong permitAll).
 */
class AudioEndpointSecurityTest extends ContentApiTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("GET /audio/tts: ẩn danh bị chặn 401 (không thể dùng làm proxy TTS)")
    void anonymousIsUnauthorized() throws Exception {
        mockMvc.perform(get("/audio/tts").param("text", "よっか"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /audio/tts: thiếu tham số text ⇒ vẫn chặn 401 trước (không lộ là endpoint tồn tại)")
    void missingTextIsStillUnauthorized() throws Exception {
        mockMvc.perform(get("/audio/tts"))
                .andExpect(status().isUnauthorized());
    }
}

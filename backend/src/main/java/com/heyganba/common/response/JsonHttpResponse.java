package com.heyganba.common.response;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** Filter/security responses bypass MVC's UTF-8 Jackson message converter. */
public final class JsonHttpResponse {
    private JsonHttpResponse() {}
    public static void write(HttpServletResponse response, int status, Object body, ObjectMapper mapper) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        mapper.writeValue(response.getOutputStream(), body);
    }
}

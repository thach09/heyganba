package com.heyganba.service.tts;

import com.heyganba.common.exception.BadRequestException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/** Mandarin speech provider; cached by language and text. Unofficial endpoint, no SLA. */
@Component
public class GoogleTranslateTtsClient implements TtsClient {

    private static final Logger log = LoggerFactory.getLogger(GoogleTranslateTtsClient.class);
    private static final String ENDPOINT = "https://translate.google.com/translate_tts";
    private static final String USER_AGENT = "Mozilla/5.0 (compatible; HeyGanba/1.0; +https://heyganba.site)";
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    @Override
    public byte[] synthesize(String text) {
        String url = ENDPOINT
                + "?ie=UTF-8&client=tw-ob&tl=zh-CN&total=1&idx=0&textlen=" + text.length()
                + "&q=" + URLEncoder.encode(text, StandardCharsets.UTF_8);

        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .header("User-Agent", USER_AGENT)
                .timeout(TIMEOUT)
                .GET()
                .build();

        try {
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            byte[] body = response.body();
            if (response.statusCode() != 200 || body == null || body.length == 0) {
                log.warn("Google TTS trả về mã {} cho chuỗi dài {} ký tự", response.statusCode(), text.length());
                throw new BadRequestException("Dịch vụ đọc tiếng Trung tạm thời không khả dụng. Vui lòng thử lại sau.");
            }
            return body;
        } catch (IOException ex) {
            log.warn("Không gọi được Google TTS: {}", ex.getMessage());
            throw new BadRequestException("Dịch vụ đọc tiếng Trung tạm thời không khả dụng. Vui lòng thử lại sau.");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BadRequestException("Dịch vụ đọc tiếng Trung bị ngắt. Vui lòng thử lại sau.");
        }
    }
}

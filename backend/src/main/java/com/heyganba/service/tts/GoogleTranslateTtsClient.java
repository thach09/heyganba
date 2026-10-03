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

/**
 * Gọi Google Translate TTS (`translate.google.com/translate_tts`) — endpoint KHÔNG chính thức, không SLA,
 * không API key ⇒ CHỈ được gọi một lần cho mỗi chuỗi kana, mọi lần sau đọc từ cache (xem TtsAudioService).
 *
 * Quy tắc ngữ âm: đầu vào PHẢI là chuỗi kana (hiragana/katakana). Nếu truyền chữ kanji, TTS đọc theo cách đọc
 * phổ biến nhất nên sai với từ ghép (vd 日 trong 日曜日) — vì vậy tầng gọi phải đưa cách đọc kana.
 *
 * `tl=ja` đúng language code tiếng Nhật; `client=tw-ob` + User-Agent cần thiết vì endpoint chặn request "trần".
 */
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
    public byte[] synthesize(String kanaText) {
        String url = ENDPOINT
                + "?ie=UTF-8&client=tw-ob&tl=ja&total=1&idx=0&textlen=" + kanaText.length()
                + "&q=" + URLEncoder.encode(kanaText, StandardCharsets.UTF_8);

        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .header("User-Agent", USER_AGENT)
                .timeout(TIMEOUT)
                .GET()
                .build();

        try {
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            byte[] body = response.body();
            if (response.statusCode() != 200 || body == null || body.length == 0) {
                log.warn("Google TTS trả về mã {} cho chuỗi dài {} ký tự", response.statusCode(), kanaText.length());
                throw new BadRequestException("Dịch vụ đọc tiếng Nhật tạm thời không khả dụng. Vui lòng thử lại sau.");
            }
            return body;
        } catch (IOException ex) {
            log.warn("Không gọi được Google TTS: {}", ex.getMessage());
            throw new BadRequestException("Dịch vụ đọc tiếng Nhật tạm thời không khả dụng. Vui lòng thử lại sau.");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BadRequestException("Dịch vụ đọc tiếng Nhật bị ngắt. Vui lòng thử lại sau.");
        }
    }
}

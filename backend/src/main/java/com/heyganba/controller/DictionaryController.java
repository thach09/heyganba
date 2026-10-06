package com.heyganba.controller;

import com.heyganba.common.response.ApiResponse;
import com.heyganba.common.exception.TooManyRequestsException;
import com.heyganba.common.util.ClientIpResolver;
import com.heyganba.dto.dictionary.DictionarySearchResponse;
import com.heyganba.service.DictionaryService;
import com.heyganba.service.RateLimiterService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dictionary")
@RequiredArgsConstructor
public class DictionaryController {

    // Keep an anonymous lookup path usable from shared classroom IPs while bounding full-text DB work.
    private static final int PUBLIC_DICTIONARY_LIMIT = 600;
    private static final java.time.Duration PUBLIC_DICTIONARY_WINDOW = java.time.Duration.ofMinutes(1);

    private final DictionaryService dictionaryService;
    private final com.heyganba.service.KanjiService kanjiService;
    private final RateLimiterService rateLimiterService;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<DictionarySearchResponse>> search(
            @RequestParam(required = false, defaultValue = "") String q,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            HttpServletRequest request
    ) {
        limitPublicRequest(request);
        return ResponseEntity.ok(ApiResponse.success(dictionaryService.search(query == null ? q : query, page)));
    }

    @GetMapping("/lookup/{id}")
    public ResponseEntity<ApiResponse<DictionaryService.Lookup>> lookup(@org.springframework.web.bind.annotation.PathVariable Long id,
                                                                          HttpServletRequest request) {
        limitPublicRequest(request);
        return ResponseEntity.ok(ApiResponse.success(dictionaryService.lookup(id)));
    }

    private void limitPublicRequest(HttpServletRequest request) {
        String key = "public-dictionary:ip:" + ClientIpResolver.resolve(request);
        if (!rateLimiterService.tryConsume(key, PUBLIC_DICTIONARY_LIMIT, PUBLIC_DICTIONARY_WINDOW)) {
            throw new TooManyRequestsException("Bạn tra cứu quá nhanh. Vui lòng đợi một phút rồi thử lại.");
        }
    }

    @GetMapping("/kanji-radicals")
    public ResponseEntity<ApiResponse<java.util.List<com.heyganba.dto.kanji.RadicalResponse>>> radicals() {
        return ResponseEntity.ok(ApiResponse.success(kanjiService.getRadicals(null)));
    }
}

package com.heyganba.controller;

import com.heyganba.common.response.ApiResponse;
import com.heyganba.dto.dictionary.DictionarySearchResponse;
import com.heyganba.service.DictionaryService;
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

    private final DictionaryService dictionaryService;
    private final com.heyganba.service.KanjiService kanjiService;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<DictionarySearchResponse>> search(
            @RequestParam(required = false, defaultValue = "") String q,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page
    ) {
        return ResponseEntity.ok(ApiResponse.success(dictionaryService.search(query == null ? q : query, page)));
    }

    @GetMapping("/lookup/{id}")
    public ResponseEntity<ApiResponse<DictionaryService.Lookup>> lookup(@org.springframework.web.bind.annotation.PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(dictionaryService.lookup(id)));
    }

    @GetMapping("/kanji-radicals")
    public ResponseEntity<ApiResponse<java.util.List<com.heyganba.dto.kanji.RadicalResponse>>> radicals() {
        return ResponseEntity.ok(ApiResponse.success(kanjiService.getRadicals(null)));
    }
}

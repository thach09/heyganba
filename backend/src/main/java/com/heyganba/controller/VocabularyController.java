package com.heyganba.controller;

import com.heyganba.common.response.ApiResponse;
import com.heyganba.dto.vocabulary.VocabularyLessonResponse;
import com.heyganba.dto.vocabulary.VocabularyWordResponse;
import com.heyganba.service.VocabularyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@org.springframework.validation.annotation.Validated
@RestController
@RequestMapping({"/vocabulary", "/vocab"})
@RequiredArgsConstructor
public class VocabularyController {

    private final VocabularyService vocabularyService;

    @GetMapping("/lessons")
    public ResponseEntity<ApiResponse<List<VocabularyLessonResponse>>> getLessons() {
        return ResponseEntity.ok(ApiResponse.success(vocabularyService.getLessons()));
    }

    @GetMapping("/lessons/{slug}/words")
    public ResponseEntity<ApiResponse<List<VocabularyWordResponse>>> getLessonWords(@PathVariable @jakarta.validation.constraints.Pattern(regexp="[a-z0-9-]{1,50}") String slug) {
        return ResponseEntity.ok(ApiResponse.success(vocabularyService.getLessonWords(slug)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<VocabularyWordResponse>> getWordById(@PathVariable @jakarta.validation.constraints.Positive Long id) {
        return ResponseEntity.ok(ApiResponse.success(vocabularyService.getWordById(id)));
    }
}

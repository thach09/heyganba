package com.heyganba.controller;

import com.heyganba.common.response.ApiResponse;
import com.heyganba.config.UserPrincipal;
import com.heyganba.repository.UserRepository;
import com.heyganba.service.VocabularyProvenanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/vocabulary/{id}/provenance")
@RequiredArgsConstructor
public class AdminVocabularyProvenanceController {
    private final VocabularyProvenanceService provenance;
    private final UserRepository users;
    @GetMapping
    public ApiResponse<VocabularyProvenanceService.Snapshot> get(@PathVariable Long id) {
        return ApiResponse.success(provenance.get(id));
    }
    @PutMapping
    public ApiResponse<VocabularyProvenanceService.Snapshot> save(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id, @Valid @RequestBody VocabularyProvenanceService.Evidence evidence) {
        return ApiResponse.success(provenance.save(users.findById(principal.getId()).orElseThrow(),id,evidence));
    }
}

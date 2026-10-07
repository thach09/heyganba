package com.heyganba.controller;

import com.heyganba.common.exception.TooManyRequestsException;
import com.heyganba.common.response.ApiResponse;
import com.heyganba.config.UserPrincipal;
import com.heyganba.service.ProductEventService;
import com.heyganba.service.RateLimiterService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.UUID;

@RestController
@RequestMapping("/product-events")
@RequiredArgsConstructor
public class ProductEventController {
    private final ProductEventService events;
    private final RateLimiterService limiter;

    @PostMapping("/learning-started")
    public ApiResponse<Void> started(@AuthenticationPrincipal UserPrincipal learner,
                                    @Valid @RequestBody StartRequest request) {
        if (!limiter.tryConsume("product-events:" + learner.getId(), 60, Duration.ofMinutes(1))) {
            throw new TooManyRequestsException("Event limit reached");
        }
        events.started(learner.getId(), request.module(), request.eventKey());
        return ApiResponse.success(null);
    }

    public record StartRequest(@NotNull ProductEventService.Module module, @NotNull UUID eventKey) {}
}

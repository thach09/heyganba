package com.heyganba.service;

import com.heyganba.common.exception.TooManyRequestsException;
import com.heyganba.controller.AuthController;
import com.heyganba.dto.auth.AuthResponse;
import com.heyganba.dto.auth.LoginRequest;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RateLimiterLifecycleTest {
    private final AtomicLong now = new AtomicLong();
    private final Clock clock = mock(Clock.class);

    private RateLimiterService limiter(int threshold) {
        when(clock.millis()).thenAnswer(ignored -> now.get());
        return new RateLimiterService(clock, threshold);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, ?> entries(RateLimiterService limiter) {
        return (Map<String, ?>) ReflectionTestUtils.getField(limiter, "windows");
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 15, 60})
    void scheduledCleanupRetainsEachActiveWindowAndRemovesItAtItsOwnBoundary(int minutes) {
        RateLimiterService limiter = limiter(10);
        Duration duration = Duration.ofMinutes(minutes);
        assertThat(limiter.tryConsume("key", 1, duration)).isTrue();
        now.set(duration.toMillis() - 1);
        limiter.scheduledPurge();
        assertThat(entries(limiter)).containsKey("key");
        assertThat(limiter.isBlocked("key", 1, duration)).isTrue();
        assertThat(limiter.tryConsume("key", 1, duration)).isFalse();
        now.incrementAndGet();
        limiter.scheduledPurge();
        assertThat(entries(limiter)).doesNotContainKey("key");
        assertThat(limiter.isBlocked("key", 1, duration)).isFalse();
        assertThat(limiter.tryConsume("key", 1, duration)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 15, 60})
    void capacityCleanupUsesStoredDurationsInsteadOfTheTriggerRequestsWindow(int minutes) {
        RateLimiterService limiter = limiter(2);
        Duration duration = Duration.ofMinutes(minutes);
        limiter.tryConsume("target", 1, duration);
        limiter.tryConsume("filler-a", 1, Duration.ofHours(2));
        limiter.tryConsume("filler-b", 1, Duration.ofHours(2));
        now.set(duration.toMillis() - 1);
        limiter.tryConsume("trigger", 1, Duration.ofMinutes(1));
        assertThat(entries(limiter)).containsKeys("target", "filler-a", "filler-b");
        assertThat(limiter.tryConsume("target", 1, duration)).isFalse();
        now.incrementAndGet();
        limiter.tryConsume("next-trigger", 1, Duration.ofMinutes(1));
        assertThat(entries(limiter)).doesNotContainKey("target").containsKeys("filler-a", "filler-b");
        assertThat(limiter.tryConsume("target", 1, duration)).isTrue();
    }

    @Test void mixedScheduledCleanupCannotResetRegistrationWhileOtherWindowsExpire() {
        RateLimiterService limiter = limiter(10);
        limiter.tryConsume("submission", 1, Duration.ofMinutes(1));
        limiter.tryConsume("login", 1, Duration.ofMinutes(15));
        limiter.tryConsume("registration", 1, Duration.ofMinutes(60));
        now.set(Duration.ofMinutes(16).toMillis());
        limiter.scheduledPurge();
        assertThat(entries(limiter).keySet()).containsExactly("registration");
        assertThat(limiter.tryConsume("registration", 1, Duration.ofMinutes(60))).isFalse();
    }

    @Test void shorterDurationOnTheSameKeyCannotShortenAnExistingWindow() {
        RateLimiterService limiter = limiter(10);
        limiter.tryConsume("key", 1, Duration.ofMinutes(60));
        now.set(Duration.ofMinutes(16).toMillis());
        assertThat(limiter.isBlocked("key", 1, Duration.ofMinutes(1))).isTrue();
        assertThat(limiter.tryConsume("key", 1, Duration.ofMinutes(1))).isFalse();
        limiter.scheduledPurge();
        assertThat(entries(limiter)).containsKey("key");
        now.set(Duration.ofMinutes(60).toMillis());
        assertThat(limiter.tryConsume("key", 1, Duration.ofMinutes(1))).isTrue();
        now.addAndGet(Duration.ofMinutes(1).toMillis());
        limiter.scheduledPurge();
        assertThat(entries(limiter)).isEmpty();
    }

    @Test void checkingDoesNotConsumeAndRejectedRequestsDoNotExtendTheWindow() {
        RateLimiterService limiter = limiter(10);
        Duration duration = Duration.ofMinutes(15);
        limiter.tryConsume("login", 2, duration);
        for (int i = 0; i < 100; i++) assertThat(limiter.isBlocked("login", 2, duration)).isFalse();
        assertThat(limiter.tryConsume("login", 2, duration)).isTrue();
        assertThat(limiter.isBlocked("login", 2, duration)).isTrue();
        now.set(duration.toMillis() - 1);
        assertThat(limiter.tryConsume("login", 2, duration)).isFalse();
        now.incrementAndGet();
        assertThat(limiter.tryConsume("login", 2, duration)).isTrue();
        assertThat(limiter.isBlocked("login", 2, duration)).isFalse();
    }

    @Test void authControllerStillCountsOnlyFailedLoginsAndUnlocksAtFifteenMinutes() {
        RateLimiterService limiter = limiter(10);
        AuthService auth = mock(AuthService.class);
        RefreshCookieService cookies = mock(RefreshCookieService.class);
        AuthController controller = new AuthController(auth, limiter, cookies, mock(ProductEventService.class));
        ReflectionTestUtils.setField(controller, "loginMaxFailedAttemptsPerEmail", 3);
        ReflectionTestUtils.setField(controller, "loginMaxFailedAttemptsPerIp", 3);
        HttpServletRequest http = mock(HttpServletRequest.class);
        when(http.getRemoteAddr()).thenReturn("203.0.113.7");
        when(cookies.headers(any(), any())).thenReturn(HttpHeaders.EMPTY);
        LoginRequest request = LoginRequest.builder().email("fixture@example.invalid").password("synthetic").build();
        AuthResponse response = AuthResponse.builder().userId(1L).build();
        when(auth.login(request)).thenReturn(response);
        for (int i = 0; i < 10; i++) assertThat(controller.login(request, http).getStatusCode().value()).isEqualTo(200);
        when(auth.login(request)).thenThrow(new BadCredentialsException("synthetic failure"));
        for (int i = 0; i < 3; i++) assertThatThrownBy(() -> controller.login(request, http)).isInstanceOf(BadCredentialsException.class);
        doReturn(response).when(auth).login(request);
        now.set(Duration.ofMinutes(15).toMillis() - 1);
        limiter.scheduledPurge();
        assertThatThrownBy(() -> controller.login(request, http)).isInstanceOf(TooManyRequestsException.class);
        verify(auth, times(13)).login(request);
        now.incrementAndGet();
        limiter.scheduledPurge();
        assertThat(controller.login(request, http).getStatusCode().value()).isEqualTo(200);
    }

    @Test void concurrentConsumptionAndCleanupGrantExactlyTheConfiguredNumberOfPermits() throws Exception {
        RateLimiterService limiter = limiter(10);
        var pool = Executors.newFixedThreadPool(12);
        CountDownLatch start = new CountDownLatch(1);
        var futures = new ArrayList<Future<Boolean>>();
        try {
            for (int i = 0; i < 120; i++) futures.add(pool.submit(() -> {
                if (!start.await(5, TimeUnit.SECONDS)) throw new AssertionError("Start barrier timed out");
                limiter.scheduledPurge();
                return limiter.tryConsume("shared", 17, Duration.ofMinutes(1));
            }));
            start.countDown();
            int permitted = 0;
            for (Future<Boolean> future : futures) if (future.get(5, TimeUnit.SECONDS)) permitted++;
            assertThat(permitted).isEqualTo(17);
            assertThat(limiter.isBlocked("shared", 17, Duration.ofMinutes(1))).isTrue();
        } finally {
            start.countDown();
            pool.shutdownNow();
        }
    }

    @Test void resetClearsAllScopes() {
        RateLimiterService limiter = limiter(10);
        limiter.tryConsume("one", 1, Duration.ofMinutes(1));
        limiter.tryConsume("sixty", 1, Duration.ofMinutes(60));
        limiter.reset();
        assertThat(entries(limiter)).isEmpty();
        assertThat(limiter.tryConsume("sixty", 1, Duration.ofMinutes(60))).isTrue();
    }
}

package com.heyganba.config;

import io.sentry.SentryBaseEvent;
import io.sentry.SentryOptions;
import io.sentry.SpanContext;
import io.sentry.protocol.Request;
import io.sentry.protocol.SentryTransaction;
import io.sentry.protocol.TransactionInfo;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.List;
import java.util.Map;

/** Send diagnostic types/stack locations and request timing, never request content or identity. */
@Configuration
public class SentryPrivacyConfiguration {
    @Bean SentryOptions.BeforeSendCallback privateErrors() {
        return (event, hint) -> {
            scrub(event);
            event.setMessage(null);
            event.setTransaction("api.request");
            event.setFingerprints(null);
            event.setThreads(null);
            if (event.getExceptions() != null) event.getExceptions().forEach(exception -> {
                exception.setValue("[redacted]");
                exception.setMechanism(null);
                if (exception.getStacktrace() != null && exception.getStacktrace().getFrames() != null)
                    exception.getStacktrace().getFrames().forEach(frame -> {
                        frame.setVars(null); frame.setPreContext(null); frame.setPostContext(null);
                        frame.setContextLine(null); frame.setAbsPath(null);
                    });
            });
            return event;
        };
    }
    @Bean SentryOptions.BeforeSendTransactionCallback privateTransactions() {
        return (event, hint) -> {
            // SDK 7 child spans can contain SQL literals/descriptions; retain only root request timing.
            var clean = new SentryTransaction("api.request", event.getStartTimestamp(), event.getTimestamp(),
                    List.of(), Map.of(), Map.of(), new TransactionInfo("custom"));
            clean.setEventId(event.getEventId()); clean.setRelease(event.getRelease());
            clean.setEnvironment(event.getEnvironment()); clean.setPlatform(event.getPlatform());
            clean.setRequest(event.getRequest());
            scrub(clean);
            var trace = event.getContexts().getTrace();
            if (trace != null) clean.getContexts().setTrace(new SpanContext(trace.getTraceId(), trace.getSpanId(),
                    trace.getParentSpanId(), "http.server", null, trace.getSamplingDecision(), trace.getStatus(), null));
            return clean;
        };
    }
    static void scrub(SentryBaseEvent event) {
        event.setUser(null); event.setExtras(null); event.setTags(null); event.setBreadcrumbs(null);
        event.getContexts().clear(); event.setServerName(null);
        if (event.getRequest() != null) {
            var request = new Request();
            String method = event.getRequest().getMethod();
            if (method != null && method.matches("GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS")) request.setMethod(method);
            request.setUrl("/api/v1");
            event.setRequest(request);
        }
    }
}

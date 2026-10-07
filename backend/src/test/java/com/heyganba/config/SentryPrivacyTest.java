package com.heyganba.config;

import io.sentry.*;
import io.sentry.protocol.*;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class SentryPrivacyTest {
    @Test void stripsIdentityRequestSecretsAndExceptionValuesButKeepsDiagnosticLocation() {
        var event = new SentryEvent();
        var user = new User(); user.setEmail("private@example.test"); event.setUser(user);
        var request = new Request(); request.setUrl("https://host/users/private?token=secret");
        request.setData("password=secret"); request.setHeaders(Map.of("Authorization","secret"));
        request.setCookies("refresh=secret"); request.setMethod("POST"); event.setRequest(request);
        event.setExtra("answer","secret"); event.setTag("token","secret");
        var exception = new SentryException(); exception.setType("IllegalStateException"); exception.setValue("secret");
        var frame = new SentryStackFrame(); frame.setLineno(12); frame.setFunction("checkAnswer"); frame.setVars(Map.of("password","secret"));
        exception.setStacktrace(new SentryStackTrace(List.of(frame))); event.setExceptions(List.of(exception));
        var result = new SentryPrivacyConfiguration().privateErrors().execute(event, new Hint());
        assertNull(result.getUser()); assertNull(result.getExtras()); assertNull(result.getTags());
        assertNull(result.getRequest().getData()); assertNull(result.getRequest().getHeaders()); assertNull(result.getRequest().getCookies());
        assertEquals("POST",result.getRequest().getMethod()); assertEquals("/api/v1",result.getRequest().getUrl());
        assertEquals("[redacted]",result.getExceptions().getFirst().getValue()); assertEquals(12,frame.getLineno()); assertNull(frame.getVars());
    }
    @Test void transactionsRetainRequestTimingWithoutSqlOrArbitraryMetadata() {
        var event = new SentryTransaction("secret",1.0,2.0,List.of(),Map.of(),Map.of(),new TransactionInfo("url"));
        event.setExtra("password","secret");
        var result = new SentryPrivacyConfiguration().privateTransactions().execute(event,new Hint());
        assertEquals("api.request",result.getTransaction()); assertEquals(1.0,result.getStartTimestamp());
        assertEquals(2.0,result.getTimestamp()); assertTrue(result.getSpans().isEmpty()); assertNull(result.getExtras());
    }
}

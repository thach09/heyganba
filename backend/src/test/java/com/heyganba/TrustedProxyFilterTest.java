package com.heyganba;
import com.heyganba.config.TrustedProxyFilter;
import com.heyganba.common.util.ClientIpResolver;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import jakarta.servlet.http.HttpServletRequest;
import static org.assertj.core.api.Assertions.assertThat;

class TrustedProxyFilterTest {
    @Test void internetClientCannotSpoofForwardedHeaders() throws Exception {
        var request=new MockHttpServletRequest(); request.setRemoteAddr("203.0.113.5");
        request.addHeader("X-Forwarded-For","1.1.1.1"); request.addHeader("X-Forwarded-Proto","https"); request.addHeader("CF-Connecting-IP","8.8.8.8");
        new TrustedProxyFilter("127.0.0.1/32").doFilter(request,new MockHttpServletResponse(),(r,s)->{
            var req=(HttpServletRequest)r;
            assertThat(ClientIpResolver.resolve(req)).isEqualTo("203.0.113.5");
            assertThat(req.getHeader("X-Forwarded-For")).isNull(); assertThat(req.getHeader("X-Forwarded-Proto")).isNull();
        });
    }
    @Test void trustedProxyUsesRightmostUntrustedHopAndIgnoresForgedCfHeader() throws Exception {
        var request=new MockHttpServletRequest(); request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-Forwarded-For","1.1.1.1, 203.0.113.5"); request.addHeader("CF-Connecting-IP","8.8.8.8"); request.addHeader("X-Forwarded-Host","evil.example");
        new TrustedProxyFilter("127.0.0.1/32").doFilter(request,new MockHttpServletResponse(),(r,s)->{
            assertThat(ClientIpResolver.resolve((HttpServletRequest)r)).isEqualTo("203.0.113.5");
            assertThat(((HttpServletRequest)r).getHeader("X-Forwarded-Host")).isNull();
        });
    }
    @Test void verifiedCloudflareHopAllowsConnectingIp() throws Exception {
        var request=new MockHttpServletRequest(); request.setRemoteAddr("127.0.0.1"); request.addHeader("X-Forwarded-For","203.0.113.5, 173.245.48.4"); request.addHeader("CF-Connecting-IP","203.0.113.5");
        new TrustedProxyFilter("127.0.0.1/32").doFilter(request,new MockHttpServletResponse(),(r,s)->assertThat(ClientIpResolver.resolve((HttpServletRequest)r)).isEqualTo("203.0.113.5"));
    }
}

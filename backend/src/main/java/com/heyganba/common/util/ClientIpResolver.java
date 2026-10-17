package com.heyganba.common.util;
import com.heyganba.config.TrustedProxyFilter;
import jakarta.servlet.http.HttpServletRequest;
/** Read only the address verified before forwarded-header processing. */
public final class ClientIpResolver {
    private ClientIpResolver() {}
    public static String resolve(HttpServletRequest request) {
        if (request == null) return "unknown";
        Object verified = request.getAttribute(TrustedProxyFilter.CLIENT_IP);
        if (verified instanceof String ip) return ip;
        String peer = request.getRemoteAddr();
        return peer == null || peer.isBlank() ? "unknown" : peer;
    }
}

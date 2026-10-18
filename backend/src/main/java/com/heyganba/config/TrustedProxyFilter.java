package com.heyganba.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.*;

/** Establish the physical peer before Spring interprets forwarded headers. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TrustedProxyFilter extends OncePerRequestFilter {
    public static final String CLIENT_IP = TrustedProxyFilter.class.getName() + ".clientIp";
    // Snapshot 2026-10-17: https://www.cloudflare.com/ips/ ; review on infrastructure changes.
    private static final List<IpAddressMatcher> CLOUDFLARE = matchers("173.245.48.0/20,103.21.244.0/22,103.22.200.0/22,103.31.4.0/22,141.101.64.0/18,108.162.192.0/18,190.93.240.0/20,188.114.96.0/20,197.234.240.0/22,198.41.128.0/17,162.158.0.0/15,104.16.0.0/13,104.24.0.0/14,172.64.0.0/13,131.0.72.0/22,2400:cb00::/32,2606:4700::/32,2803:f800::/32,2405:b500::/32,2405:8100::/32,2a06:98c0::/29,2c0f:f248::/32");
    private final List<IpAddressMatcher> trusted;
    public TrustedProxyFilter(@Value("${app.security.trusted-proxies:127.0.0.1/32,::1/128}") String ranges) { trusted = matchers(ranges); }
    private static List<IpAddressMatcher> matchers(String ranges) {
        return Arrays.stream(ranges.split(",")).map(String::trim).filter(s -> !s.isEmpty()).map(IpAddressMatcher::new).toList();
    }
    private static boolean matches(List<IpAddressMatcher> ranges, String ip) { return numeric(ip) && ranges.stream().anyMatch(range -> range.matches(ip)); }
    private static boolean numeric(String ip) {
        if (ip == null || ip.length() > 45 || !ip.matches("[0-9a-fA-F.:]+")) return false;
        if (!ip.contains(":") && !ip.matches("[0-9]{1,3}(\\.[0-9]{1,3}){3}")) return false;
        try { java.net.InetAddress.getByName(ip); return true; } catch (Exception ignored) { return false; }
    }
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws IOException, ServletException {
        String peer = request.getRemoteAddr();
        boolean controlled = matches(trusted, peer) || matches(CLOUDFLARE, peer);
        String client = peer;
        boolean cloudflarePeer = matches(CLOUDFLARE, peer);
        if (controlled) {
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && xff.length() <= 2048) {
                String[] hops = xff.split(",");
                for (int i = hops.length - 1; i >= 0; i--) {
                    String candidate = hops[i].trim();
                    if (!numeric(candidate)) break;
                    client = candidate;
                    if (matches(CLOUDFLARE, candidate)) cloudflarePeer = true;
                    if (!matches(trusted, candidate) && !matches(CLOUDFLARE, candidate)) break;
                }
            }
            String cf = request.getHeader("CF-Connecting-IP");
            if (cloudflarePeer && numeric(cf)) client = cf;
        }
        request.setAttribute(CLIENT_IP, client == null ? "unknown" : client);
        String proto = controlled ? request.getHeader("X-Forwarded-Proto") : null;
        String safeProto = "https".equalsIgnoreCase(proto) ? "https" : "http".equalsIgnoreCase(proto) ? "http" : null;
        String safeClient = client;
        boolean forwardIp = controlled && !Objects.equals(client, peer);
        chain.doFilter(new HttpServletRequestWrapper(request) {
            private boolean forwarding(String name) { return name.equalsIgnoreCase("Forwarded") || name.toLowerCase(Locale.ROOT).startsWith("x-forwarded-") || name.equalsIgnoreCase("X-Real-IP") || name.equalsIgnoreCase("CF-Connecting-IP"); }
            @Override public String getHeader(String name) {
                if (name.equalsIgnoreCase("X-Forwarded-Proto")) return safeProto;
                if (name.equalsIgnoreCase("X-Forwarded-For")) return forwardIp ? safeClient : null;
                return forwarding(name) ? null : super.getHeader(name);
            }
            @Override public Enumeration<String> getHeaders(String name) {
                String value = getHeader(name);
                return forwarding(name) ? Collections.enumeration(value == null ? List.of() : List.of(value)) : super.getHeaders(name);
            }
            @Override public Enumeration<String> getHeaderNames() {
                var names = Collections.list(super.getHeaderNames());
                names.removeIf(this::forwarding);
                if (safeProto != null) names.add("X-Forwarded-Proto");
                if (forwardIp) names.add("X-Forwarded-For");
                return Collections.enumeration(names);
            }
        }, response);
    }
}

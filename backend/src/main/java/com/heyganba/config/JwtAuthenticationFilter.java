package com.heyganba.config;

import com.heyganba.service.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtTokenProvider tokenProvider;
    private final CustomUserDetailsService customUserDetailsService;
    private final com.heyganba.service.TokenRevocationService tokenRevocationService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                if (!tokenProvider.isAccessToken(jwt)) {
                    log.warn("Rejected non-access token for protected request: {}", request.getRequestURI());
                    filterChain.doFilter(request, response);
                    return;
                }

                String jti = tokenProvider.getJtiFromJwt(jwt);
                if (jti != null && tokenRevocationService.isRevoked(jti)) {
                    log.warn("Rejected revoked token for request: {}", request.getRequestURI());
                    filterChain.doFilter(request, response);
                    return;
                }

                String username = tokenProvider.getUsernameFromJwt(jwt);
                UserDetails userDetails = customUserDetailsService.loadUserByUsername(username);

                if (!tokenProvider.matchesTokenVersion(jwt, (UserPrincipal) userDetails)) {
                    filterChain.doFilter(request, response);
                    return;
                }

                if (!userDetails.isEnabled()) {
                    log.warn("Rejected request from disabled account");
                    filterChain.doFilter(request, response);
                    return;
                }

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            log.warn("Authentication context rejected: {}", ex.getClass().getSimpleName());
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}

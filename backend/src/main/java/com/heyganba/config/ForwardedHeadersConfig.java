package com.heyganba.config;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.filter.ForwardedHeaderFilter;

@Configuration
public class ForwardedHeadersConfig {
    @Bean
    public FilterRegistrationBean<ForwardedHeaderFilter> forwardedHeaderFilterRegistration() {
        var registration = new FilterRegistrationBean<>(new ForwardedHeaderFilter());
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 1);
        return registration;
    }
}

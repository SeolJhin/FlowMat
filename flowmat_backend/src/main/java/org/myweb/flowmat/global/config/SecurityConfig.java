package org.myweb.flowmat.global.config;

import java.util.Arrays;
import java.util.List;
import org.myweb.flowmat.global.security.JwtAuthFilter;
import org.myweb.flowmat.global.security.JwtExceptionFilter;
import org.myweb.flowmat.global.security.RestAccessDeniedHandler;
import org.myweb.flowmat.global.security.RestAuthenticationEntryPoint;
import org.myweb.flowmat.global.security.oauth.CustomAuthorizationRequestResolver;
import org.myweb.flowmat.global.security.oauth.CustomOAuth2UserService;
import org.myweb.flowmat.global.security.oauth.HttpCookieOAuth2AuthorizationRequestRepository;
import org.myweb.flowmat.global.security.oauth.OAuth2FailureHandler;
import org.myweb.flowmat.global.security.oauth.OAuth2SuccessHandler;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:5174,http://localhost:3000}")
    private String corsAllowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        JwtAuthFilter jwtAuthFilter,
        JwtExceptionFilter jwtExceptionFilter,
        RestAuthenticationEntryPoint authenticationEntryPoint,
        RestAccessDeniedHandler accessDeniedHandler,
        ObjectProvider<ClientRegistrationRepository> clientRegistrationRepositoryProvider,
        CustomOAuth2UserService customOAuth2UserService,
        OAuth2SuccessHandler oAuth2SuccessHandler,
        OAuth2FailureHandler oAuth2FailureHandler
    ) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/auth/signup",
                    "/auth/login",
                    "/auth/refresh",
                    "/auth/logout",
                    "/auth/check-nickname",
                    "/auth/find-email",
                    "/auth/reset-password/request",
                    "/auth/reset-password/verify",
                    "/auth/reset-password/confirm",
                    "/auth/email/send-code",
                    "/auth/email/verify-code",
                    "/auth/oauth2/kakao/complete",
                    "/auth/oauth2/google/complete",
                    "/oauth2/**",
                    "/login/**"
                ).permitAll()
                .requestMatchers("/ws/**").permitAll()
                .anyRequest().authenticated()
            )
            .exceptionHandling(eh -> eh
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler)
            );

        ClientRegistrationRepository clientRegistrationRepository = clientRegistrationRepositoryProvider.getIfAvailable();
        if (clientRegistrationRepository != null) {
            http.oauth2Login(oauth2 -> oauth2
                .authorizationEndpoint(authorization -> authorization
                    .authorizationRequestResolver(new CustomAuthorizationRequestResolver(clientRegistrationRepository))
                    .authorizationRequestRepository(new HttpCookieOAuth2AuthorizationRequestRepository())
                )
                .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                .successHandler(oAuth2SuccessHandler)
                .failureHandler(oAuth2FailureHandler)
            );
        }

        http.addFilterBefore(jwtExceptionFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterAfter(jwtAuthFilter, JwtExceptionFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(
            Arrays.stream(corsAllowedOrigins.split(","))
                .map(String::trim)
                .filter(o -> !o.isEmpty())
                .toList()
        );
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}

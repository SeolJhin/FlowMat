package org.myweb.flowmat.global.security;

import org.springframework.stereotype.Component;

@Component
public class JwtProvider {

    public String resolveUserId(String token) {
        return token;
    }
}

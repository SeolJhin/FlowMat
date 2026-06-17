package org.myweb.flowmat.domain.user.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.user.application.AuthService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
}

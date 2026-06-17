package org.myweb.flowmat.domain.inventory.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.inventory.application.LotService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/lots")
public class LotController {

    private final LotService lotService;
}

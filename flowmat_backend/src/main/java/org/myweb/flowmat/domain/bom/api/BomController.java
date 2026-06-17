package org.myweb.flowmat.domain.bom.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.bom.application.BomService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/boms")
public class BomController {

    private final BomService bomService;
}

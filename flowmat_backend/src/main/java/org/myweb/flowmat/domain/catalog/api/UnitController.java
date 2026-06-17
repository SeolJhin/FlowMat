package org.myweb.flowmat.domain.catalog.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.application.UnitService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/units")
public class UnitController {

    private final UnitService unitService;
}

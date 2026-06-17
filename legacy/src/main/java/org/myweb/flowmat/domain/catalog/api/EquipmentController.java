package org.myweb.flowmat.domain.catalog.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.application.EquipmentService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/equipments")
public class EquipmentController {

    private final EquipmentService equipmentService;
}

package org.myweb.flowmat.domain.inventory.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.inventory.application.InventoryService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/inventories")
public class InventoryController {

    private final InventoryService inventoryService;
}

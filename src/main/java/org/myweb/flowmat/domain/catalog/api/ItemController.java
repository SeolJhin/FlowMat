package org.myweb.flowmat.domain.catalog.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.catalog.application.ItemService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/items")
public class ItemController {

    private final ItemService itemService;
}

package org.myweb.flowmat.domain.bom.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.bom.api.dto.response.BomExplosionResponse;
import org.myweb.flowmat.domain.bom.application.BomExplosionService;
import org.myweb.flowmat.global.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Multi-level BOM explosion (docs/domain/multi-level-bom.md). */
@RestController
@RequiredArgsConstructor
@RequestMapping("/boms")
public class BomExplosionController {

    private final BomExplosionService bomExplosionService;

    /** Only an approved revision can be exploded; {@code quantity} is in the BOM item's own unit. */
    @GetMapping("/{bomId}/explosion")
    public ApiResponse<BomExplosionResponse> explode(
        @PathVariable("bomId") String bomId,
        @RequestParam(value = "quantity", required = false) String quantity
    ) {
        return ApiResponse.ok(bomExplosionService.explode(bomId, quantity));
    }
}

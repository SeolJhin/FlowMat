package org.myweb.flowmat.domain.bom.api.dto.request;

import java.util.List;

/**
 * Material lines for a draft BOM from a spreadsheet (docs/domain/item-import.md "BOM 자재"). Values are text as they
 * were in the file, so a bad number is reported against its row.
 *
 * @param dryRun only check and say what would happen
 * @param replace remove the draft's current lines first; otherwise the file's lines are added to them
 */
public record BomLineImportRequest(boolean dryRun, boolean replace, List<Row> rows) {

    /**
     * @param itemCode the material's item code
     * @param unit a unit code such as "g"
     */
    public record Row(String itemCode, String quantity, String unit, String note) {
    }
}

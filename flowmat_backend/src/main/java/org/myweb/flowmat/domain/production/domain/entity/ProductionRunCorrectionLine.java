package org.myweb.flowmat.domain.production.domain.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

/** One change in a run correction: void a recording, add a recording, or set the run's output quantity. */
@Getter
@Setter
@Entity
@Table(name = "production_run_correction_line")
public class ProductionRunCorrectionLine {

    public static final String VOID_ITEM = "void_item";
    public static final String ADD_ITEM = "add_item";
    public static final String SET_OUTPUT_QTY = "set_output_qty";

    @Id
    private String productionRunCorrectionLineId;

    private String productionRunCorrectionId;
    private Integer lineNo;
    private String lineKind;

    /** void_item: the recording to void. */
    private String targetRunItemId;

    /** add_item: what to record. */
    private String direction;
    private String itemId;
    private String inventoryId;
    private BigDecimal qty;
    private String unit;

    /** set_output_qty: the run's output quantity when the correction was requested, and the new value. */
    private BigDecimal beforeQty;
    private BigDecimal afterQty;

    /** add_item: the recording created when the correction was applied. */
    private String createdRunItemId;
}

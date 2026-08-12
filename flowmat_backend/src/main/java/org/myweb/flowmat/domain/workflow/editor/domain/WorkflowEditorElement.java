package org.myweb.flowmat.domain.workflow.editor.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.myweb.flowmat.global.common.CreatedUpdatedAuditEntity;

@Getter
@Setter
@Entity
@Table(name = "workflow_editor_element")
public class WorkflowEditorElement extends CreatedUpdatedAuditEntity {

    @Id
    @Column(name = "editor_element_id")
    private String editorElementId;

    private String workflowId;
    private String projectId;
    private String elementId;
    private String elementType;

    @Column(name = "pos_x")
    private Double posX;

    @Column(name = "pos_y")
    private Double posY;

    private Double width;
    private Double height;
    private Double rotation;
    private Double opacity;
    private String parentElementId;

    @Column(name = "element_order")
    private Integer elementOrder;

    @Column(name = "geometry_json")
    private String geometryJson = "{}";

    @Column(name = "style_json")
    private String styleJson = "{}";

    private String lockedYn = "N";
    private String hiddenYn = "N";

    @Column(name = "version")
    private int version = 1;

    @Column(name = "version_nonce")
    private long versionNonce = 1L;
}

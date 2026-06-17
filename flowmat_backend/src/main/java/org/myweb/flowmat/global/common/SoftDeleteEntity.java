package org.myweb.flowmat.global.common;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@MappedSuperclass
public abstract class SoftDeleteEntity extends BaseTimeEntity {

    @Column(name = "deleted_yn")
    private String deletedYn = "N";
}

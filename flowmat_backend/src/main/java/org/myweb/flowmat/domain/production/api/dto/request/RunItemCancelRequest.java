package org.myweb.flowmat.domain.production.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Why a recorded run item is being cancelled; kept on the item and on the stock reversal. */
public record RunItemCancelRequest(@NotBlank @Size(max = 500) String reason) {
}

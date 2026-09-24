package org.myweb.flowmat.domain.catalog.application;

import java.util.Optional;
import org.myweb.flowmat.domain.catalog.domain.entity.Item;

/**
 * Something outside the catalog that still relies on an item. Deleting the item is refused while any check says why
 * (docs/domain/inventory-bom-lot-contract.md "품목 삭제"). Other domains implement it, so the catalog does not have to
 * know about them.
 */
public interface ItemUsageCheck {

    /** Why the item cannot be deleted yet, said so the user knows what to do first; empty when nothing here uses it. */
    Optional<String> whyInUse(Item item);
}

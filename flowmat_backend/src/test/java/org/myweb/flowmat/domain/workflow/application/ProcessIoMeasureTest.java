package org.myweb.flowmat.domain.workflow.application;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.myweb.flowmat.domain.workflow.domain.entity.ProcessIo;
import org.myweb.flowmat.global.exception.BusinessException;

/** Which ports need a quantity and unit (docs/domain/port-measurement.md PM2-PM3). */
class ProcessIoMeasureTest {

    @Test
    void materialProductAndItemPortsNeedBoth() {
        for (String type : new String[] {"material", "product", " Material "}) {
            BusinessException missing = assertThrows(BusinessException.class, () -> ProcessIoServiceImpl.validatePortValues(port(type, null, null, null)));
            assertEquals("Material and product ports need a quantity and unit.", missing.getMessage());
            assertThrows(BusinessException.class, () -> ProcessIoServiceImpl.validatePortValues(port(type, null, "0", null)));
            assertDoesNotThrow(() -> ProcessIoServiceImpl.validatePortValues(port(type, null, "0", "ea")));
        }
        // No type at all is a material port, as it always was.
        assertThrows(BusinessException.class, () -> ProcessIoServiceImpl.validatePortValues(port(null, null, null, "ea")));
        assertThrows(BusinessException.class, () -> ProcessIoServiceImpl.validatePortValues(port("data", "itm", null, null)));
    }

    @Test
    void otherPortsMayOmitThemButAQuantityNeedsAUnit() {
        for (String type : new String[] {"data", "file", "api", "energy", "waste", "generic", "custom"}) {
            assertDoesNotThrow(() -> ProcessIoServiceImpl.validatePortValues(port(type, null, null, null)));
            assertDoesNotThrow(() -> ProcessIoServiceImpl.validatePortValues(port(type, null, null, "kWh")));
            BusinessException unitless = assertThrows(BusinessException.class,
                () -> ProcessIoServiceImpl.validatePortValues(port(type, null, "5", null)));
            assertEquals("A port quantity needs a unit.", unitless.getMessage());
        }
        assertThrows(BusinessException.class, () -> ProcessIoServiceImpl.validatePortValues(port("energy", null, "-1", "kWh")));
    }

    private static ProcessIo port(String resourceType, String itemId, String quantity, String unit) {
        ProcessIo port = new ProcessIo();
        port.setDirection("input");
        port.setRequiredYn("Y");
        port.setAllowShortageYn("N");
        port.setResourceType(resourceType);
        port.setIoType(resourceType);
        port.setItemId(itemId);
        port.setQuantity(quantity == null ? null : new BigDecimal(quantity));
        port.setUnit(unit);
        return port;
    }
}

package org.myweb.flowmat.domain.bom.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.Set;
import org.hibernate.bytecode.internal.bytebuddy.BytecodeProviderImpl;
import org.hibernate.proxy.HibernateProxy;
import org.junit.jupiter.api.Test;
import org.myweb.flowmat.domain.bom.domain.entity.BomHeader;
import org.myweb.flowmat.domain.bom.repository.BomHeaderRepository;

class BomPlanningFactsProxyTest {
    private final BomHeaderRepository repository = mock(BomHeaderRepository.class);
    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules()
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    private final BomPlanningQueryImpl query = new BomPlanningQueryImpl(repository, mapper);

    @Test
    void plainFactsKeepDecimalPrecisionDatesAndNulls() throws Exception {
        BomHeader row = row();
        when(repository.findByBomIdAndDeletedYn("bom-proxy-test", "N")).thenReturn(Optional.of(row));

        String json = query.findActive("bom-proxy-test").orElseThrow().json();

        assertThat(json).isEqualTo(mapper.writeValueAsString(row));
        assertThat(json).contains("\"baseQuantity\":123.456789012345678901",
            "\"effectiveFrom\":\"2040-02-29\"", "\"note\":null");
        assertThat(mapper.readTree(json).get("approvedAt").asText()).isEqualTo("2040-02-29T23:59:59.123456+09:00");
    }

    @Test
    void initializedHibernateProxyHasTheSameFactsAsTheEntity() throws Exception {
        BomHeader row = row();
        var provider = new BytecodeProviderImpl();
        try {
            var factory = provider.getProxyFactoryFactory().buildProxyFactory(null);
            factory.postInstantiate(BomHeader.class.getName(), BomHeader.class, Set.of(HibernateProxy.class),
                BomHeader.class.getMethod("getBomId"), BomHeader.class.getMethod("setBomId", String.class), null);
            HibernateProxy proxy = factory.getProxy(row.getBomId(), null);
            proxy.getHibernateLazyInitializer().setImplementation(row);
            assertThat(proxy).isInstanceOf(BomHeader.class);
            when(repository.findByBomIdAndDeletedYn("bom-proxy-test", "N"))
                .thenReturn(Optional.of((BomHeader) proxy));

            String json = query.findActive("bom-proxy-test").orElseThrow().json();

            assertThat(json).isEqualTo(mapper.writeValueAsString(row));
            assertThat(json).doesNotContain("hibernateLazyInitializer", "ByteBuddyInterceptor");
        } finally {
            provider.resetCaches();
        }
    }

    @Test
    void missingBomReturnsEmptyFacts() {
        when(repository.findByBomIdAndDeletedYn("missing", "N")).thenReturn(Optional.empty());
        assertThat(query.findActive("missing")).isEmpty();
    }

    private static BomHeader row() {
        BomHeader row = new BomHeader();
        row.setBomId("bom-proxy-test");
        row.setProjectId("prj-proxy-test");
        row.setBaseQuantity(new BigDecimal("123.456789012345678901"));
        row.setEffectiveFrom(LocalDate.of(2040, 2, 29));
        row.setApprovedAt(OffsetDateTime.parse("2040-02-29T23:59:59.123456+09:00"));
        return row;
    }
}

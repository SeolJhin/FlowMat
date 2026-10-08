package org.myweb.flowmat.domain.bom.application;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.bom.application.publicapi.BomPlanningQuery;
import org.myweb.flowmat.domain.bom.repository.BomHeaderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
@RequiredArgsConstructor
@Transactional(readOnly=true)
public class BomPlanningQueryImpl implements BomPlanningQuery {
    private final BomHeaderRepository boms;
    private final ObjectMapper mapper;
    public Optional<Facts> findActive(String id) {
        return boms.findByBomIdAndDeletedYn(id,"N").map(row -> {
            try { return new Facts(mapper.writeValueAsString(row)); }
            catch(JsonProcessingException error) { throw new IllegalStateException("Invalid internal BOM facts.",error); }
        });
    }
}

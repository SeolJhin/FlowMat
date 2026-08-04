package org.myweb.flowmat.domain.workflow.annotation.application;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.myweb.flowmat.domain.workflow.annotation.domain.CanvasAnnotation;

class CanvasAnnotationReconcileServiceTest {

    private final CanvasAnnotationReconcileService reconcileService = new CanvasAnnotationReconcileService();

    @Test
    void nullCurrentNeverDiscards() {
        boolean result = reconcileService.shouldDiscardIncoming(null, 5, 100L);

        assertThat(result).isFalse();
    }

    @Test
    void nullIncomingVersionNeverDiscards() {
        CanvasAnnotation current = annotation(3, 100L);

        boolean result = reconcileService.shouldDiscardIncoming(current, null, 100L);

        assertThat(result).isFalse();
    }

    @Test
    void nullIncomingNonceNeverDiscards() {
        CanvasAnnotation current = annotation(3, 100L);

        boolean result = reconcileService.shouldDiscardIncoming(current, 4, null);

        assertThat(result).isFalse();
    }

    @Test
    void staleIncomingVersionIsDiscarded() {
        CanvasAnnotation current = annotation(5, 100L);

        boolean result = reconcileService.shouldDiscardIncoming(current, 4, 999L);

        assertThat(result).isTrue();
    }

    @Test
    void sameVersionWithLowerOrEqualNonceIsDiscarded() {
        CanvasAnnotation current = annotation(5, 100L);

        assertThat(reconcileService.shouldDiscardIncoming(current, 5, 100L)).isTrue();
        assertThat(reconcileService.shouldDiscardIncoming(current, 5, 50L)).isTrue();
    }

    @Test
    void sameVersionWithHigherNonceIsAccepted() {
        CanvasAnnotation current = annotation(5, 100L);

        boolean result = reconcileService.shouldDiscardIncoming(current, 5, 101L);

        assertThat(result).isFalse();
    }

    @Test
    void newerIncomingVersionIsAccepted() {
        CanvasAnnotation current = annotation(5, 100L);

        boolean result = reconcileService.shouldDiscardIncoming(current, 6, 1L);

        assertThat(result).isFalse();
    }

    private static CanvasAnnotation annotation(int version, long versionNonce) {
        CanvasAnnotation annotation = new CanvasAnnotation();
        annotation.setVersion(version);
        annotation.setVersionNonce(versionNonce);
        return annotation;
    }
}

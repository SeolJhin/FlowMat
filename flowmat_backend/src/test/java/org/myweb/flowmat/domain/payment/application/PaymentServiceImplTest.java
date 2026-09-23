package org.myweb.flowmat.domain.payment.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.myweb.flowmat.domain.payment.domain.entity.Payment;
import org.myweb.flowmat.domain.payment.repository.PaymentRepository;
import org.myweb.flowmat.domain.payment.repository.SubscriptionRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.myweb.flowmat.global.rbac.PermissionService;
import org.myweb.flowmat.global.rbac.SystemPermission;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private PermissionService permissionService;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    @Test
    void cannotListAnotherUsersPayments() {
        when(permissionService.requireCurrentUserId()).thenReturn("alice");

        BusinessException exception =
            assertThrows(BusinessException.class, () -> paymentService.getPaymentsByUserId("bob"));

        assertEquals(ErrorCode.FORBIDDEN, exception.getErrorCode());
        verifyNoInteractions(paymentRepository);
    }

    @Test
    void canListOwnPayments() {
        when(permissionService.requireCurrentUserId()).thenReturn("alice");
        when(paymentRepository.findAllByUserIdOrderByCreatedAtDesc("alice")).thenReturn(List.of());

        assertTrue(paymentService.getPaymentsByUserId("alice").isEmpty());
    }

    @Test
    void userManagerCanListAnotherUsersPayments() {
        when(permissionService.requireCurrentUserId()).thenReturn("admin");
        when(permissionService.hasPermission(SystemPermission.USER_MANAGE)).thenReturn(true);
        when(paymentRepository.findAllByUserIdOrderByCreatedAtDesc("bob")).thenReturn(List.of());

        assertTrue(paymentService.getPaymentsByUserId("bob").isEmpty());
    }

    @Test
    void anotherUsersPaymentLooksNotFound() {
        UUID paymentId = UUID.randomUUID();
        Payment payment = new Payment();
        payment.setId(paymentId);
        payment.setUserId("bob");
        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(permissionService.requireCurrentUserId()).thenReturn("alice");

        BusinessException exception =
            assertThrows(BusinessException.class, () -> paymentService.getPayment(paymentId));

        assertEquals(ErrorCode.NOT_FOUND, exception.getErrorCode());
    }

    @Test
    void cannotReadAnotherUsersSubscription() {
        when(permissionService.requireCurrentUserId()).thenReturn("alice");

        assertThrows(BusinessException.class, () -> paymentService.getActiveSubscription("bob"));

        verifyNoInteractions(subscriptionRepository);
    }
}

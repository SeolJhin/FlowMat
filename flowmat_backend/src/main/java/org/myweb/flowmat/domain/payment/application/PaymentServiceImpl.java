package org.myweb.flowmat.domain.payment.application;

import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.payment.api.dto.response.PaymentResponse;
import org.myweb.flowmat.domain.payment.api.dto.response.SubscriptionResponse;
import org.myweb.flowmat.domain.payment.domain.entity.Payment;
import org.myweb.flowmat.domain.payment.domain.entity.Subscription;
import org.myweb.flowmat.domain.payment.repository.PaymentRepository;
import org.myweb.flowmat.domain.payment.repository.SubscriptionRepository;
import org.myweb.flowmat.global.exception.BusinessException;
import org.myweb.flowmat.global.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final SubscriptionRepository subscriptionRepository;

    @Override
    public List<PaymentResponse> getPaymentsByUserId(String userId) {
        return paymentRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(PaymentResponse::from)
                .toList();
    }

    @Override
    public PaymentResponse getPayment(UUID paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return PaymentResponse.from(payment);
    }

    @Override
    public SubscriptionResponse getActiveSubscription(String userId) {
        Subscription subscription = subscriptionRepository.findByUserIdAndStatus(userId, "active")
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        return SubscriptionResponse.from(subscription);
    }

    @Override
    public boolean hasActiveSubscription(String userId) {
        return subscriptionRepository.existsByUserIdAndStatus(userId, "active");
    }
}

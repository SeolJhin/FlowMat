package org.myweb.flowmat.domain.production.application;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;

import org.junit.jupiter.api.Test;

/** The ordering of several work orders by changeover minutes (docs/domain/equipment-schedule.md P14-P15). */
class WorkOrderSequenceServiceTest {

    @Test
    void theExactOrderHasTheFewestMinutesAndEqualTotalsKeepTheRanking() {
        // 0 -> 1 -> 2 costs 10 + 10; every other way costs more.
        int[][] cost = {{0, 10, 60}, {60, 0, 10}, {60, 60, 0}};
        assertArrayEquals(new int[] {0, 1, 2}, WorkOrderSequenceService.order(new int[3], cost));
        // Nothing to save: the ranking (priority, planned end, order given) stands.
        assertArrayEquals(new int[] {0, 1, 2}, WorkOrderSequenceService.order(new int[3], new int[3][3]));
        // After an order of the third one's item, starting with it is free: 0 + 60 + 10 beats 60 + 10 + 10.
        assertArrayEquals(new int[] {2, 0, 1}, WorkOrderSequenceService.order(new int[] {60, 60, 0}, cost));
        // A cheap first step is not worth a dear rest: 5 + 50 loses to 20 + 1.
        int[][] trap = {{0, 50}, {1, 0}};
        assertArrayEquals(new int[] {1, 0}, WorkOrderSequenceService.order(new int[] {5, 20}, trap));
        assertArrayEquals(new int[0], WorkOrderSequenceService.order(new int[0], new int[0][0]));
    }

    @Test
    void moreThanTheExactLimitAreTakenNearestFirst() {
        int n = WorkOrderSequenceService.EXACT_LIMIT + 1;
        int[] first = new int[n];
        int[][] cost = new int[n][n];
        for (int i = 0; i < n; i++) {
            first[i] = i == n - 1 ? 0 : 5;
            for (int j = 0; j < n; j++) {
                cost[i][j] = j == i - 1 ? 1 : 5;
            }
        }
        int[] expected = new int[n];
        for (int step = 0; step < n; step++) {
            expected[step] = n - 1 - step;
        }
        assertArrayEquals(expected, WorkOrderSequenceService.order(first, cost));
    }
}

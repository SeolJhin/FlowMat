package org.myweb.flowmat.domain.production.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.ToIntBiFunction;
import org.junit.jupiter.api.Test;

class ChangeoverOrderTest {

    private static ToIntBiFunction<String, String> rules(Map<String, Integer> minutes) {
        return (from, to) -> minutes.getOrDefault(from + ">" + to, 0);
    }

    @Test
    void theSameItemsTogetherChangeOverLess() {
        ChangeoverOrder.Plan plan = ChangeoverOrder.plan(List.of("A", "B", "A"), Set.of(), null, rules(Map.of("A>B", 30, "B>A", 45)));

        assertThat(plan.plannedMinutes()).isEqualTo(75);
        assertThat(plan.suggestedMinutes()).isEqualTo(30);
        // B, A, A also takes 45 and A, A, B 30; of the orders with 30 the one nearest the plan wins.
        assertThat(plan.suggestedOrder()).containsExactly(0, 2, 1);
    }

    @Test
    void aTieKeepsThePlanAndNothingIsSuggested() {
        ChangeoverOrder.Plan plan = ChangeoverOrder.plan(List.of("A", "B"), Set.of(), null, rules(Map.of("A>B", 10, "B>A", 10)));

        assertThat(plan.plannedMinutes()).isEqualTo(10);
        assertThat(plan.suggestedMinutes()).isNull();
        assertThat(plan.suggestedOrder()).isNull();
    }

    @Test
    void theItemRunBeforeCounts() {
        ChangeoverOrder.Plan plan = ChangeoverOrder.plan(List.of("A", "B"), Set.of(), "B", rules(Map.of("B>A", 50, "A>B", 10)));

        assertThat(plan.plannedMinutes()).isEqualTo(60);
        assertThat(plan.suggestedMinutes()).isEqualTo(50);
        assertThat(plan.suggestedOrder()).containsExactly(1, 0);
    }

    @Test
    void aRunningOrderStaysFirst() {
        ChangeoverOrder.Plan plan = ChangeoverOrder.plan(List.of("A", "B", "A"), Set.of(1), null, rules(Map.of("A>B", 30, "B>A", 45)));

        assertThat(plan.plannedMinutes()).isEqualTo(75);
        assertThat(plan.suggestedMinutes()).isEqualTo(45);
        assertThat(plan.suggestedOrder()).containsExactly(1, 0, 2);
    }

    @Test
    void beyondTheExactSearchTheNearestItemIsTakenEachTime() {
        List<String> items = new ArrayList<>();
        for (int index = 0; index < ChangeoverOrder.EXACT_UP_TO + 2; index++) {
            items.add(index % 2 == 0 ? "A" : "B");
        }
        ChangeoverOrder.Plan plan = ChangeoverOrder.plan(items, Set.of(), null, rules(Map.of("A>B", 10, "B>A", 10)));

        assertThat(plan.plannedMinutes()).isEqualTo(90);
        assertThat(plan.suggestedMinutes()).isEqualTo(10);
        assertThat(plan.suggestedOrder()).containsExactly(0, 2, 4, 6, 8, 1, 3, 5, 7, 9);
    }

    @Test
    void noChangeoverTimeMeansNothingToSuggest() {
        ChangeoverOrder.Plan plan = ChangeoverOrder.plan(List.of("A", "B", "A"), Set.of(), null, rules(Map.of()));

        assertThat(plan.plannedMinutes()).isZero();
        assertThat(plan.suggestedOrder()).isNull();
    }
}

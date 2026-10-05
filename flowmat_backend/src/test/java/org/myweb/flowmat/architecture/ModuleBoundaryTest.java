package org.myweb.flowmat.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;

import com.tngtech.archunit.core.domain.Dependency;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import com.tngtech.archunit.library.freeze.FreezingArchRule;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The module rule of docs/architecture/adr/ADR-002-module-dependency.md, Stage A: a bounded context
 * ({@code org.myweb.flowmat.domain.<context>}) uses only its own repositories and reaches other contexts through their
 * {@code application.publicapi}. The violations that existed when the rule came in are frozen in
 * {@code src/test/resources/archunit_store}; that list may only shrink, and any new violation fails this test. Fixed
 * violations drop out of the store by themselves. {@code global} and {@code batch} are not bounded contexts and are not
 * checked.
 */
@AnalyzeClasses(packages = "org.myweb.flowmat", importOptions = ImportOption.DoNotIncludeTests.class)
class ModuleBoundaryTest {

    private static final Pattern CONTEXT = Pattern.compile("^org\\.myweb\\.flowmat\\.domain\\.(\\w+)(\\..*)?$");
    private static final Pattern REPOSITORY = Pattern.compile("^org\\.myweb\\.flowmat\\.domain\\.(\\w+)\\.repository(\\..*)?$");

    @ArchTest
    static final ArchRule repositoriesStayInsideTheirBoundedContext = FreezingArchRule.freeze(
        classes().that().resideInAPackage("org.myweb.flowmat.domain..")
            .should(useOnlyTheirOwnContextsRepositories()));

    private static ArchCondition<JavaClass> useOnlyTheirOwnContextsRepositories() {
        return new ArchCondition<>("use only their own bounded context's repositories") {
            @Override
            public void check(JavaClass origin, ConditionEvents events) {
                Matcher own = CONTEXT.matcher(origin.getPackageName());
                if (!own.matches()) {
                    return;
                }
                // One violation per class and foreign repository, named without signatures or line numbers, so a frozen
                // violation still matches after unrelated edits (a new constructor parameter, a moved method).
                Set<String> repositories = new TreeSet<>();
                for (Dependency dependency : origin.getDirectDependenciesFromSelf()) {
                    JavaClass target = dependency.getTargetClass().getBaseComponentType();
                    Matcher repository = REPOSITORY.matcher(target.getPackageName());
                    if (repository.matches() && !repository.group(1).equals(own.group(1))) {
                        repositories.add(target.getName());
                    }
                }
                String user = topLevelName(origin);
                for (String repository : repositories) {
                    events.add(SimpleConditionEvent.violated(origin, user + " uses " + repository));
                }
            }
        };
    }

    /** {@code a.B} for {@code a.B}, {@code a.B$Inner} and {@code a.B$1}. */
    private static String topLevelName(JavaClass javaClass) {
        String name = javaClass.getName();
        int nested = name.indexOf('$');
        return nested < 0 ? name : name.substring(0, nested);
    }
}

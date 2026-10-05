package org.myweb.flowmat.domain.project.application.publicapi;

/**
 * Project membership reads for other bounded contexts, which use this instead of the project repositories
 * (docs/architecture/adr/ADR-002-module-dependency.md). It answers and never refuses, so a caller inside a transaction
 * can turn a "no" into its own message. Add an operation only when a caller needs it.
 */
public interface ProjectMemberQuery {

    /** Whether the user is an active member of the project; the owner is not a member row, so ask about the owner apart. */
    boolean isActiveMember(String projectId, String userId);
}

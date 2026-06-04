package org.myweb.flowmat.domain.workflow.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.workflow.application.WorkflowService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/workflows")
public class WorkflowController {

    private final WorkflowService workflowService;
}

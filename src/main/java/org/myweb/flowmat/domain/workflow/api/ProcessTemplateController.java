package org.myweb.flowmat.domain.workflow.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.workflow.application.ProcessTemplateService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/process-templates")
public class ProcessTemplateController {

    private final ProcessTemplateService processTemplateService;
}

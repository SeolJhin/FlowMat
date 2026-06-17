package org.myweb.flowmat.domain.project.api.admin;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.project.application.ProjectService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/projects")
public class AdminProjectController {

    private final ProjectService projectService;
}

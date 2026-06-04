package org.myweb.flowmat.domain.project.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.project.application.ProjectService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/projects")
public class ProjectController {

    private final ProjectService projectService;
}

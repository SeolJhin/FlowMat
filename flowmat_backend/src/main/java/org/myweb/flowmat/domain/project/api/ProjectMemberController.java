package org.myweb.flowmat.domain.project.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.project.application.ProjectMemberService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/project-members")
public class ProjectMemberController {

    private final ProjectMemberService projectMemberService;
}

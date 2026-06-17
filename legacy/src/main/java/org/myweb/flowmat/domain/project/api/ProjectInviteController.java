package org.myweb.flowmat.domain.project.api;

import lombok.RequiredArgsConstructor;
import org.myweb.flowmat.domain.project.application.ProjectInviteService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/project-invites")
public class ProjectInviteController {

    private final ProjectInviteService projectInviteService;
}

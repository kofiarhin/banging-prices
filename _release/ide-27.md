# IDE-27 Release Notes
Request: verify/apply security updates and preserve UTC.
User-facing changes: host sudo security package updated; automatic updates and UTC verified.
Developer changes: workflow evidence only.
New APIs, routes, env vars, schema changes, dependencies: none.
Test commands: apt-get update; unattended-upgrade --verbose; dpkg --audit; apt-mark showhold; dpkg-query; apt list --upgradable; timedatectl; systemctl timer checks; apt-config dump. All passed.
Known limitations: six kernel-related updates remain outside automatic selection; Linear unchanged.
Follow-up: optional separately scoped general update review.
Suggested commit: docs: record IDE-27 security update verification

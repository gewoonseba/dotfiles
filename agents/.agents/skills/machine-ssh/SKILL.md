---
name: machine-ssh
description: Connect between Sebastian's MacBook and Linux desktop over SSH. Use when work must run on the other machine or when checking their SSH or dedicated desktop GitHub credentials.
---

# Machine SSH

Identify the current machine with `hostname`, then connect:

- MacBook (`Sebastians-MacBook-Pro.local`) → `ssh desktop`
- Desktop (`sebastians-desktop`) → `ssh macbook`

Do not forward the MacBook's SSH agent. The desktop authenticates to GitHub with `~/.ssh/id_ed25519_github_desktop_auth` and signs commits with `~/.ssh/id_ed25519_github_desktop_signing`; both work in persistent Herdr sessions. Preserve these aliases and dedicated-key behavior when editing SSH or Git configuration.

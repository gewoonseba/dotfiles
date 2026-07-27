---
name: machine-ssh
description: Connect between Sebastian's MacBook and Linux desktop over SSH. Use when work must run on the other machine or when checking their SSH or 1Password agent-forwarding setup.
---

# Machine SSH

Identify the current machine with `hostname`, then connect:

- MacBook (`Sebastians-MacBook-Pro.local`) → `ssh desktop`
- Desktop (`sebastians-desktop`) → `ssh macbook`

The MacBook forwards its 1Password SSH agent to the desktop, so GitHub approvals appear on the MacBook. Direct desktop use falls back to the desktop's local 1Password agent. Preserve these aliases and agent behaviors when editing SSH configuration.

# Task: server SSH exposure review (engine-sheet, 2026-11-01)

The owner asked for your independent read. He does not trust the read he has been given. Treat nothing below as settled; check it yourself on this machine.

READ ONLY. Change nothing on the server: no config, no firewall, no keys, no service reloads, no repo edits except the one findings file named below. Never print or record a password or private key.

## Questions, in order

1. Has anyone other than the owner got in? Look for signs of compromise, not only sign-in counts.
2. How exposed is the server right now, and what is the real risk?
3. What is the smallest correct fix? Rank options by value for effort (S/M/L). Say which to leave alone.
4. Review the candidate change below. Does it do what it claims, what can it lock out, and is there something better?

## Facts the owner has given

- He cannot say whether the laptop is his only device that signs in over SSH. He does not use Termius on his phone.
- The sign-in addresses near him are in the Chicago area, which he says is near him.
- He reaches this server through a saved SSH connection on a Chromebook, using the root password.
- He does not want to memorize new commands. He is not a Linux administrator.

## Where to look

- `sshd -T`, `/etc/ssh/sshd_config`, `/etc/ssh/sshd_config.d/`
- `/var/log/auth.log*`, `journalctl -u ssh`, `last`, `who`
- `fail2ban-client status sshd`, `ufw status`, `ss -tlnp`
- `~/.ssh/authorized_keys`, crontab, running processes, pm2, systemd services

## Candidate change (not applied)

Scratch copy: `/tmp/claude-0/-root-GodWorld/bc0355bd-e3a7-4a37-958b-5bf82920c2d7/scratchpad/sshd-candidate/d/00-godworld-password-limit.conf`

```
PasswordAuthentication no
Match Address 172.56.0.0/14,12.74.0.0/15,108.147.0.0/16
    PasswordAuthentication yes
```

## Output

Write `docs/for-claude-review/2026-11-01-codex-ssh-exposure-review.md`. Plain words first: a short verdict a non-administrator can read, then the evidence behind each claim. Mark anything you did not check as unchecked. Finish with the file; do not message any other lane.

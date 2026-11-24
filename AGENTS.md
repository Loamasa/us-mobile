## For agents working here

Codex: at the start of a session, run `git omni arrive --agent codex` once. It prints what changed in this repo since you last looked, or nothing if nothing did. If the command fails, carry on.

When you commit, end the message with these two trailer lines, together in its last paragraph, so the next agent knows who changed what and why:

    Agent: <your tool, and your role if you have one>
    Why: <the reason for the change, in one line>

## To-do list

This project's shared to-do list is `TODO.md`, one task per line as `- [ ] task`. When you finish a task on it, tick it as `- [x]`. Add work you find but won't do now. Commit the list with the change it belongs to.

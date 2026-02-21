Coverly — AI-Powered Team Coverage & Task Reassignment

Built at HackHer 2026 @ UMass Amherst

Team: Sai Pulavarthy & Kiran Balasundaram Kuppuraj

Coverly eliminates the chaos of last-minute coverage gaps. When a team member goes OOO, Coverly's AI engine instantly analyzes your team's workload, skills, and availability — then suggests the best person for every at-risk task, complete with an auto-generated handoff doc.

The Problem
When someone goes out of the office, managers scramble. Who has bandwidth? Who has the right skills? What context does the new owner need? This process is manual, slow, and error-prone. Coverly solves it in one click.

Features
Team Member Side

Availability Management — Mark yourself OOO for a date range, set partial availability (e.g. "mornings only"), or flag yourself as "at capacity."
My Tasks View — See all assigned tasks with deadlines, priorities, and project tags
Handoff Notes — Add context to tasks before going OOO ("blocked on X", "check the Figma first")
Notifications — Get notified when a task is reassigned to you, with the AI-generated handoff note attached

Manager Side

Team Availability Dashboard — Calendar heatmap showing who's available each day. Green = full capacity, yellow = partial, red = OOO or overloaded
Task Board — All tasks across the team, filterable by project, priority, deadline, and assignee. At-risk tasks are auto-flagged
AI Reassignment Engine — Click "Suggest Coverage," and the AI returns a ranked list of who should take each task, with plain-English reasoning ("Alex has 2 tasks this week and has handled design reviews before")
Handoff Doc Generator — Auto-generates a concise handoff note per task once a reassignment is approved
Approve / Tweak / Reject Flow — Review AI suggestions in a side panel, swap out suggested people, and approve in one click

Smart Features

Workload Score — Live score per team member based on open tasks, deadline urgency, and availability. Prevents the AI from piling everything on one person
Overload Alerts — Warns managers if approving a reassignment would push someone over their task threshold
Skill Tags — Team members have tags (e.g. "frontend", "client comms", "data analysis") that the AI factors into suggestions
Deadline Risk Feed — Sidebar showing tasks with approaching deadlines whose owners are unavailable, sorted by urgency

Run the App
bashnpm run dev
Open http://localhost:3000 in your browser.

How the AI Works
Reassignment Engine
The AI receives a snapshot of every team member's current task count, workload score, skill tags, and availability window. It returns a ranked list of suggested assignees per task with a short reasoning blurb explaining the recommendation.
Handoff Doc Generator
Once a reassignment is approved, the AI synthesizes the original task description, the previous owner's notes, the deadline, and the priority level into a clean 3-sentence handoff summary — automatically attached to the new assignee's task.

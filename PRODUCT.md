# Flow

A project-management SPA — tasks, projects, boards, timelines, comments — modeled on Asana / Linear / Notion's database views. Single workspace per deployment, multi-user, real-time sync via PocketBase.

## Register

`product` — design serves the product, not the other way around. Generous-but-quiet UI; the user's content is the foreground.

## Users

- **Admin / user roles**: full task and project CRUD, manage members, configure board columns and templates.
- **Collaborators**: assigned tasks they can update; can self-assign new ones; cannot delete shared work.

Day-to-day usage looks like: open in a tab during the work session, scan home, hop to project view, drag cards on the board, comment on a task, switch back. Sessions are long. Density matters more than spectacle.

## Brand & tone

Quiet, calm, work-respecting. The product is not the show. Speak in plain sentences, no exclamation marks, no marketing voice.

Text density: medium. Generous whitespace, but not so generous that scrolling outweighs scanning.

## Anti-references (do not pivot toward)

- Asana's loud accent colors and gradient task statuses.
- Trello's chunky drop shadows and rounded card piles.
- Jira's dense, info-overloaded form-heavy panels.
- Generic "AI workflow tool" template — pastel gradients, hero metrics, glass cards.

## Strategic principles

1. **Content over chrome.** Sidebar and topbar should fade; task titles and comments lead.
2. **Calm hierarchy.** Type scale and weight do the work — reserve color for status and selection.
3. **Direct manipulation.** Drag, click-to-edit, keyboard shortcuts — modals only when truly necessary.
4. **Real-time but quiet.** Sync indicators are present but unobtrusive; never spinners across the whole UI.
5. **Long-session kindness.** Reduced motion, soft contrast, no hot accents in peripheral chrome.

## Aesthetic direction (this iteration)

Notion-aligned: warm-neutral light surfaces, near-black text (`#37352f`), borders at low opacity (~`rgba(55,53,47,0.16)`), 3–6px radii, Notion blue (`#2383e2`) reserved for selection / focus / links. Status uses Notion's tag palette (red / yellow / blue / green / gray, all desaturated). Shadows minimal — only menus and popovers float.

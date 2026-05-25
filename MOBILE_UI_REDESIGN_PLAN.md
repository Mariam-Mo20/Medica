# Mobile UI Redesign Plan

## 1) Design Problems

- Current screens feel web-translated instead of mobile-native: centered cards, large dead margins, and weak content anchoring.
- Visual hierarchy is shallow: headings, metadata, stats, and actions compete at similar weight.
- Dashboard composition is admin-template-like: basic metric tiles without narrative structure.
- Drawer structure feels sparse and unintentional, with no user/clinic context and weak information scent.
- Bottom navigation has cramped labels and weak icon/text rhythm, reducing scan speed.
- Form and card patterns are generic; spacing and typography do not communicate priority clearly.

## 2) Proposed Visual Direction

- Premium clinical minimalism: clean surfaces, confident blue accents, stronger typography, and calm background layering.
- Mobile-first composition: top-aligned sections, full-width content rails, and progressive disclosure via cards/blocks.
- Strong anchors: brand header, section titles, concise supporting copy, and action hierarchy.
- Softer depth language: subtle tonal backgrounds, rounded cards, and balanced elevation (not heavy shadows).
- Consistent shape/spacing rhythm: reusable paddings, radii, and component heights tuned for thumb comfort.

## 3) Layout Strategy

- Replace centered auth cards with top-aligned flows:
  - Branded hero/header at top
  - Step context and concise helper text
  - Full-width form blocks and sticky-feeling primary action cadence
- Dashboard structure:
  - Welcome/overview header
  - Compact metric grid with clear contrast and icon anchors
  - Quick actions as tappable chips/cards
  - Secondary section (today focus/recent work) to remove dead space
- Drawer/More:
  - Top: clinic/user profile block
  - Middle: secondary utilities/help area
  - Bottom-pinned: Settings + Logout

## 4) Navigation Improvements

- Bottom navigation readability improvements:
  - Shorter labels where needed
  - Adjust selected/unselected font size and icon size balance
  - Ensure all labels remain visible without truncation
- Preserve bottom nav as primary app movement.
- Keep drawer for contextual/secondary actions only.
- Maintain clear back navigation across auth steps and nested screens.

## 5) Component Refinements

- Typography system tuning:
  - Larger, consistent Medica brand mark
  - Distinct scales for page title, section title, supporting text, and metadata
- Card redesign:
  - Better internal spacing, icon containment, and title/value relationships
  - Introduce section headers and grouped card clusters
- Form polish:
  - Dense but breathable vertical rhythm
  - Larger touch targets and clearer input labels/hints
  - Reduced decorative framing; rely on hierarchy not boxes-on-boxes
- Empty and helper states:
  - Intentional copy blocks and action-forward guidance
  - Avoid placeholder appearance

## 6) Scope Guardrails

- Do not alter backend endpoints, payload contracts, or auth/role business logic.
- Focus on UI composition, interaction clarity, and perceived product quality.
- Keep implementation reusable through shared widgets/tokens where possible.

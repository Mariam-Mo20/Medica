# Medica Mobile Design System

## Design Direction

Clinical, calm, and trustworthy. The app should feel clean and focused, with clear hierarchy and touch-friendly interaction.

## Color Tokens

- Primary: `#0F4C81`
- Page background: `#F7F8FB`
- Surface/Card: `#FFFFFF`
- Border: `#E5E7EB`
- Text primary: `#111827`
- Text muted: `#6B7280`
- Error: `#DC2626`
- Success: `#047857`

### Status Colors

- Scheduled: bg `#FFFBEB`, fg `#B45309`
- Checked In: bg `#EFF6FF`, fg `#1D4ED8`
- In Progress: bg `#F5F3FF`, fg `#6D28D9`
- Completed: bg `#ECFDF5`, fg `#047857`

## Typography

- Screen title: `20 / w800`
- Section title: `16 / w700`
- Card title: `15-16 / w700`
- Body: `14 / w400-500`
- Caption/meta: `12-13 / muted`
- Status chip: `10-11 / w700`

## Spacing Scale

- `4, 8, 12, 16, 20, 24`

Usage:

- Page padding: `16`
- Card padding: `12-16`
- Input vertical gap: `10-12`
- Section separation: `12-16`

## Radius and Elevation

- Input/button radius: `10`
- Card radius: `14`
- Elevation: minimal/flat with subtle border

## Button Styles

- Primary button
  - Filled, full-width in forms
  - Min height `44`
- Secondary button
  - Outlined
  - Min height `40`
- Inline action buttons
  - Compact outlined/text variants

## Input Styles

- White filled background
- Border `#D1D5DB`
- Focus border primary color
- Comfortable content padding for touch

## Card and List Patterns

- Prefer cards for grouped information
- Use list tiles inside cards for itemized data
- Replace dense desktop table content with scannable stacked blocks

## State Patterns

- Loading: centered spinner or local skeleton
- Empty: icon + concise message + optional CTA
- Error: concise message + retry action

## Mobile UX Patterns

- Bottom navigation for primary destinations
- Single-column forms
- Bottom sheets/full-screen forms for modal-like interactions
- Keep visual hierarchy consistent across all features

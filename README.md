# World Cup 2026 Sweepstake Tracker

Live Next.js sweepstake tracker using the original app rules and live update structure, updated with Gerard's six contestants and forty-eight assigned teams.

## Current setup

- Gerard
- Sarah
- Barry
- Thrish
- Fiona
- Alan

Each contestant owns 8 teams.

## Original scoring restored

- Goal scored by your team: +1
- Group-stage win: +3
- Group-stage draw: +1
- Round of 32 bonus: +2
- Round of 16 bonus: +3
- Quarter-final bonus: +4
- Semi-final bonus: +5
- Tournament winner bonus: +6
- Progression bonuses are cumulative.

## Live updates

The app polls `/api/standings` every 60 seconds. The API route pulls World Cup 2026 scores from TheSportsDB and calculates the leaderboard.

## Deploy on Vercel

Import this repository as a Next.js project and click Deploy.

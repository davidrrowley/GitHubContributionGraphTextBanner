#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'banner_2024.json'), 'utf8'));

// Collect commit dates from JSON
const commitDates = new Set();
for (const week of data.weeks) {
  for (const day of week.days) {
    if (day.contribution === 'y') commitDates.add(day.date);
  }
}
// Jan 1-4 fall before the JSON window (starts Jan 7) but are part of the banner
['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04'].forEach(d => commitDates.add(d));

function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function friendlyDate(dateStr) {
  const [, m, day] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(day, 10)}`;
}

const ROWS = 7;
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// 2024: Jan 1 = Monday. Build Mon-Sun weeks across the full year.
const yearEnd = new Date(2024, 11, 31);
const weeks = [];
const monthLabels = [];
let lastMonth = -1;
let cur = new Date(2024, 0, 1);

while (cur <= yearEnd) {
  const week = [];
  for (let row = 0; row < ROWS; row++) {
    const day = new Date(cur);
    day.setDate(cur.getDate() + row);
    const inYear = day.getFullYear() === 2024;
    const dateStr = inYear ? fmt(day) : null;
    if (inYear && day.getMonth() !== lastMonth) {
      monthLabels.push({ col: weeks.length, label: monthNames[day.getMonth()] });
      lastMonth = day.getMonth();
    }
    week.push({ date: dateStr, active: dateStr ? commitDates.has(dateStr) : false, inYear });
  }
  weeks.push(week);
  cur.setDate(cur.getDate() + 7);
}

const totalCommits = commitDates.size;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.year} Contribution Graph – "${data.text}"</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0d1117;
      color: #e6edf3;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 40px 20px;
      gap: 20px;
    }
    .profile-header {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: #8b949e;
    }
    .profile-header strong { color: #e6edf3; font-size: 16px; }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 16px;
      width: max-content;
      max-width: 100%;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 16px;
    }
    .card-header h2 {
      font-size: 14px;
      font-weight: 400;
      color: #e6edf3;
    }
    .card-header span { color: #8b949e; }
    .graph-wrap { overflow-x: auto; }
    .graph {
      display: grid;
      grid-template-columns: 32px repeat(${weeks.length}, 13px);
      grid-template-rows: 18px repeat(7, 13px);
      row-gap: 3px;
      column-gap: 3px;
      width: max-content;
    }
    .month-label {
      font-size: 11px;
      color: #8b949e;
      grid-row: 1;
      align-self: end;
      white-space: nowrap;
    }
    .day-label {
      font-size: 11px;
      color: #8b949e;
      grid-column: 1;
      align-self: center;
      text-align: right;
      padding-right: 8px;
      line-height: 13px;
    }
    .cell {
      width: 11px;
      height: 11px;
      border-radius: 2px;
      cursor: default;
      position: relative;
    }
    .cell.empty { background: transparent; pointer-events: none; }
    .cell.off { background: #21262d; }
    .cell.on  { background: #39d353; }
    /* Tooltip */
    .cell:not(.empty):hover::before {
      content: attr(data-tip);
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: #1c2128;
      border: 1px solid #444c56;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 11px;
      white-space: nowrap;
      color: #e6edf3;
      z-index: 100;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0,0,0,.5);
    }
    .legend {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 12px;
      justify-content: flex-end;
      font-size: 11px;
      color: #8b949e;
    }
    .legend-cell {
      width: 11px; height: 11px; border-radius: 2px;
    }
  </style>
</head>
<body>
  <div class="profile-header">
    <svg width="20" height="20" viewBox="0 0 16 16" fill="#8b949e"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm0 1.5a6.5 6.5 0 1 1 0 13A6.5 6.5 0 0 1 8 1.5Zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm0 7c-2.5 0-4.5 1.1-4.5 2.5v.2A6.47 6.47 0 0 0 8 14.5a6.47 6.47 0 0 0 4.5-1.8v-.2c0-1.4-2-2.5-4.5-2.5Z"/></svg>
    <strong>davidrrowley</strong>
    <span>/ GitHubContributionGraphTextBanner</span>
  </div>

  <div class="card">
    <div class="card-header">
      <h2>${totalCommits} contributions in ${data.year} <span>· "${data.text}"</span></h2>
    </div>
    <div class="graph-wrap">
      <div class="graph" id="graph"></div>
    </div>
    <div class="legend">
      Less
      <div class="legend-cell" style="background:#21262d"></div>
      <div class="legend-cell" style="background:#0e4429"></div>
      <div class="legend-cell" style="background:#006d32"></div>
      <div class="legend-cell" style="background:#26a641"></div>
      <div class="legend-cell" style="background:#39d353"></div>
      More
    </div>
  </div>

  <script>
    const weeks = ${JSON.stringify(weeks)};
    const monthLabels = ${JSON.stringify(monthLabels)};
    const dayLabels = ${JSON.stringify(dayLabels)};
    const graph = document.getElementById('graph');

    // Month labels (row 1)
    for (const { col, label } of monthLabels) {
      const el = document.createElement('div');
      el.className = 'month-label';
      el.textContent = label;
      el.style.gridColumn = (col + 2).toString();
      el.style.gridRow = '1';
      graph.appendChild(el);
    }

    // Day labels — only Mon (row 0), Wed (row 2), Fri (row 4) shown, matching GitHub
    for (let row = 0; row < 7; row++) {
      if (row === 0 || row === 2 || row === 4) {
        const el = document.createElement('div');
        el.className = 'day-label';
        el.textContent = dayLabels[row];
        el.style.gridColumn = '1';
        el.style.gridRow = (row + 2).toString();
        graph.appendChild(el);
      }
    }

    // Cells
    for (let col = 0; col < weeks.length; col++) {
      for (let row = 0; row < 7; row++) {
        const day = weeks[col][row];
        const el = document.createElement('div');
        el.className = 'cell';
        if (!day.inYear) {
          el.classList.add('empty');
        } else if (day.active) {
          el.classList.add('on');
          el.setAttribute('data-tip', '1 contribution on ${data.text} banner — ' + day.date);
        } else {
          el.classList.add('off');
          el.setAttribute('data-tip', 'No contributions on ' + day.date);
        }
        el.style.gridColumn = (col + 2).toString();
        el.style.gridRow = (row + 2).toString();
        graph.appendChild(el);
      }
    }
  </script>
</body>
</html>`;

const outPath = path.join(__dirname, 'preview.html');
fs.writeFileSync(outPath, html);
console.log('Saved: ' + outPath);

try {
  execSync(`start "" "${outPath}"`);
} catch (e) {
  console.log('Open manually: ' + outPath);
}

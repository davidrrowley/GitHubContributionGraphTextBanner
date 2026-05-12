#!/usr/bin/env node
/**
 * GitHub Contribution Graph Text Banner Generator
 *
 * Generates the list of dates you need to make at least one commit on
 * in order to spell out text on your GitHub contribution graph.
 *
 * Usage:
 *   node banner.js "Vibe Coding"
 *   node banner.js "Hello" --preview
 *   node banner.js "Vibe Coding" --preview
 *   node banner.js "Vibe Code" --year 2024 --save
 */

// ---------------------------------------------------------------------------
// 5-wide × 7-tall bitmap font (columns are bit-arrays, row 0 = top)
// Each letter is an array of columns (left→right), each column is 7 bits
// stored as an integer (bit 6 = top row, bit 0 = bottom row).
// ---------------------------------------------------------------------------
const FONT = {
  ' ': [0b0000000, 0b0000000, 0b0000000],
  'A': [0b0111110, 0b1001000, 0b1001000, 0b1001000, 0b0111110],
  'B': [0b1111110, 0b1001010, 0b1001010, 0b1001010, 0b0110100],
  'C': [0b0111100, 0b1000010, 0b1000010, 0b1000010, 0b0100100],
  'D': [0b1111110, 0b1000010, 0b1000010, 0b1000010, 0b0111100],
  'E': [0b1111110, 0b1001010, 0b1001010, 0b1001010, 0b1000010],
  'F': [0b1111110, 0b1001000, 0b1001000, 0b1001000, 0b1000000],
  'G': [0b0111100, 0b1000010, 0b1000010, 0b1001010, 0b0001110],
  'H': [0b1111110, 0b0001000, 0b0001000, 0b0001000, 0b1111110],
  'I': [0b1000010, 0b1000010, 0b1111110, 0b1000010, 0b1000010],
  'J': [0b0000100, 0b0000010, 0b1000010, 0b1000010, 0b1111100],
  'K': [0b1111110, 0b0001000, 0b0010100, 0b0100010, 0b1000000],
  'L': [0b1111110, 0b0000010, 0b0000010, 0b0000010, 0b0000010],
  'M': [0b1111110, 0b0100000, 0b0011000, 0b0100000, 0b1111110],
  'N': [0b1111110, 0b0100000, 0b0011000, 0b0000100, 0b1111110],
  'O': [0b0111100, 0b1000010, 0b1000010, 0b1000010, 0b0111100],
  'P': [0b1111110, 0b1001000, 0b1001000, 0b1001000, 0b0110000],
  'Q': [0b0111100, 0b1000010, 0b1000010, 0b1000110, 0b0111100],
  'R': [0b1111110, 0b1001000, 0b1001100, 0b1001010, 0b0110000],
  'S': [0b0110010, 0b1001001, 0b1001001, 0b1001001, 0b0100110],
  'T': [0b1000000, 0b1000000, 0b1111110, 0b1000000, 0b1000000],
  'U': [0b1111100, 0b0000010, 0b0000010, 0b0000010, 0b1111100],
  'V': [0b1111000, 0b0000100, 0b0000010, 0b0000100, 0b1111000],
  'W': [0b1111100, 0b0000110, 0b0011000, 0b0000110, 0b1111100],
  'X': [0b1100010, 0b0010100, 0b0001000, 0b0010100, 0b1100010],
  'Y': [0b1100000, 0b0010000, 0b0001110, 0b0010000, 0b1100000],
  'Z': [0b1000010, 0b1000110, 0b1001010, 0b1010010, 0b1100010],
  'a': [0b0000100, 0b0101010, 0b0101010, 0b0101010, 0b0011110],
  'b': [0b1111110, 0b0010010, 0b0010010, 0b0010010, 0b0001100],
  'c': [0b0011100, 0b0100010, 0b0100010, 0b0100010, 0b0010100],
  'd': [0b0001100, 0b0010010, 0b0010010, 0b0010010, 0b1111110],
  'e': [0b0011100, 0b0101010, 0b0101010, 0b0101010, 0b0011000],
  'f': [0b0001000, 0b0011110, 0b0101000, 0b0100000, 0b0000000],
  'g': [0b0110000, 0b1001010, 0b1001010, 0b1001010, 0b1111100],
  'h': [0b1111110, 0b0010000, 0b0010000, 0b0010000, 0b0001110],
  'i': [0b0000000, 0b0101110, 0b0101110, 0b0000000, 0b0000000],
  'j': [0b0000000, 0b0000001, 0b0101111, 0b0101110, 0b0000000],
  'k': [0b1111110, 0b0000100, 0b0001010, 0b0010000, 0b0000000],
  'l': [0b0000000, 0b1111110, 0b0000010, 0b0000000, 0b0000000],
  'm': [0b0111110, 0b0100000, 0b0011000, 0b0100000, 0b0111110],
  'n': [0b0111110, 0b0100000, 0b0100000, 0b0100000, 0b0011110],
  'o': [0b0011100, 0b0100010, 0b0100010, 0b0100010, 0b0011100],
  'p': [0b0111110, 0b0101000, 0b0101000, 0b0101000, 0b0010000],
  'q': [0b0010000, 0b0101000, 0b0101000, 0b0101000, 0b0111110],
  'r': [0b0111110, 0b0100000, 0b0100000, 0b0100000, 0b0010000],
  's': [0b0010010, 0b0101010, 0b0101010, 0b0101010, 0b0100100],
  't': [0b0000000, 0b0010000, 0b0111110, 0b0010010, 0b0000000],
  'u': [0b0111100, 0b0000010, 0b0000010, 0b0000010, 0b0111110],
  'v': [0b0111000, 0b0000100, 0b0000010, 0b0000100, 0b0111000],
  'w': [0b0111100, 0b0000110, 0b0001000, 0b0000110, 0b0111100],
  'x': [0b0100010, 0b0010100, 0b0001000, 0b0010100, 0b0100010],
  'y': [0b0110000, 0b0001010, 0b0001010, 0b0001010, 0b0111100],
  'z': [0b0100010, 0b0100110, 0b0101010, 0b0110010, 0b0000000],
  '0': [0b0111100, 0b1000110, 0b1001010, 0b1100010, 0b0111100],
  '1': [0b0100000, 0b1000000, 0b1111110, 0b0000000, 0b0000000],
  '2': [0b0100010, 0b1000110, 0b1001010, 0b1010010, 0b0100010],
  '3': [0b1000100, 0b1001010, 0b1001010, 0b1001010, 0b0110110],
  '4': [0b0001100, 0b0010100, 0b0100100, 0b1111110, 0b0000100],
  '5': [0b1110100, 0b1010010, 0b1010010, 0b1010010, 0b1001100],
  '6': [0b0111100, 0b1010010, 0b1010010, 0b1010010, 0b0001100],
  '7': [0b1000000, 0b1001110, 0b1010000, 0b1100000, 0b1000000],
  '8': [0b0110110, 0b1001010, 0b1001010, 0b1001010, 0b0110110],
  '9': [0b0110000, 0b1001010, 0b1001010, 0b1001010, 0b0111100],
  '!': [0b0000000, 0b1011110, 0b0000000, 0b0000000, 0b0000000],
  '?': [0b0100000, 0b1000000, 0b1001010, 0b1010000, 0b0100000],
  '.': [0b0000000, 0b0000110, 0b0000000, 0b0000000, 0b0000000],
  ',': [0b0000000, 0b0000011, 0b0000000, 0b0000000, 0b0000000],
  '-': [0b0001000, 0b0001000, 0b0001000, 0b0001000, 0b0001000],
  '_': [0b0000001, 0b0000001, 0b0000001, 0b0000001, 0b0000001],
  '+': [0b0001000, 0b0001000, 0b0111110, 0b0001000, 0b0001000],
  '/': [0b0000010, 0b0000100, 0b0001000, 0b0010000, 0b0100000],
  ':': [0b0000000, 0b0010100, 0b0000000, 0b0000000, 0b0000000],
};

const ROWS = 7;
const LETTER_SPACING = 1; // blank column between characters

/**
 * Render text into a 2D boolean grid [row][col].
 * row 0 = top, col 0 = leftmost week.
 */
function renderText(text) {
  const columns = []; // array of 7-bit column integers

  for (const ch of text) {
    const glyph = FONT[ch] ?? FONT['?'];
    for (const col of glyph) {
      columns.push(col);
    }
    // Add spacing column between characters (not after last)
    columns.push(0);
  }

  // Convert to 2D boolean grid
  const grid = [];
  for (let row = 0; row < ROWS; row++) {
    grid.push(columns.map(col => Boolean((col >> (ROWS - 1 - row)) & 1)));
  }

  return { grid, totalCols: columns.length };
}

/**
 * Returns the Monday that starts the GitHub contribution graph for a given year.
 * UK/EU GitHub graphs start on Monday (Mon=top, Sun=bottom).
 * Pass mondayFirst=false for US/Sunday-first graphs.
 */
function getGraphStart(year, mondayFirst = true) {
  const jan1 = new Date(year, 0, 1);
  const graphStart = new Date(jan1);
  if (mondayFirst) {
    // Roll back to the Monday of the week containing Jan 1
    // getDay(): 0=Sun, 1=Mon, ..., 6=Sat
    const day = jan1.getDay();
    const daysToMonday = day === 0 ? -6 : 1 - day;
    graphStart.setDate(jan1.getDate() + daysToMonday);
  } else {
    // Roll back to the Sunday of the week containing Jan 1
    graphStart.setDate(jan1.getDate() - jan1.getDay());
  }
  graphStart.setHours(12, 0, 0, 0);
  return graphStart;
}

/**
 * Map each lit cell in the grid to a real date, starting from graphStart.
 *
 * The GitHub contribution graph shows Sun–Sat (column = week, row = day of week).
 * column 0 = leftmost (oldest) week, row 0 = Sunday.
 *
 * @param {boolean[][]} grid       - [row][col] boolean grid
 * @param {number}      totalCols
 * @param {Date}        graphStart - the Sunday of the first column (leftmost week)
 * @returns {Date[]}  sorted list of dates to commit on
 */
function gridToDates(grid, totalCols, graphStart) {
  const dates = [];

  for (let col = 0; col < totalCols; col++) {
    for (let row = 0; row < ROWS; row++) {
      if (grid[row][col]) {
        const cellDate = new Date(graphStart);
        cellDate.setDate(graphStart.getDate() + col * 7 + row);
        cellDate.setHours(12, 0, 0, 0); // noon = safe from any UTC±12 timezone shift
        dates.push(cellDate);
      }
    }
  }

  dates.sort((a, b) => a - b);
  return dates;
}

/** Format a Date as YYYY-MM-DD using LOCAL time (avoids UTC timezone shift) */
function fmt(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Print an ASCII preview of the grid */
function printPreview(grid, totalCols, mondayFirst = true) {
  const dayLabels = mondayFirst
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  console.log(`\n  Preview (# = commit, . = no commit) [${mondayFirst ? 'Monday' : 'Sunday'}-first graph]:\n`);
  for (let row = 0; row < ROWS; row++) {
    const line = grid[row].map(v => (v ? '#' : '.')).join('');
    console.log(`  ${dayLabels[row]}  ${line}`);
  }
  console.log(`\n  Total columns needed: ${totalCols} weeks`);
  console.log(`  (GitHub graph shows ~53 weeks; text fits if totalCols ≤ 53)\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
GitHub Contribution Graph Text Banner Generator
------------------------------------------------
Usage:
  node banner.js "Your Text" [options]

Options:
  --preview      Show an ASCII art preview of the banner
  --year <YYYY>  Target contribution graph year (default: current year)
  --save         Save ready-to-run bash + PowerShell scripts to disk
  --sunday       Use Sunday-first week layout (US GitHub). Default is Monday-first (UK/EU).
  --help         Show this help

Examples:
  node banner.js "Vibe Code" --preview --year 2024
  node banner.js "Vibe Code" --year 2024 --save
`);
    return;
  }

  // Parse args
  let text = '';
  let preview = false;
  let save = false;
  let mondayFirst = true; // default: Monday-first (UK/EU GitHub)
  let year = new Date().getFullYear();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--preview') {
      preview = true;
    } else if (args[i] === '--save') {
      save = true;
    } else if (args[i] === '--sunday') {
      mondayFirst = false;
    } else if (args[i] === '--year' && args[i + 1]) {
      year = parseInt(args[++i], 10);
    } else if (!args[i].startsWith('--')) {
      text = args[i];
    }
  }

  if (!text) {
    console.error('Error: Please provide text to render.');
    process.exit(1);
  }

  const { grid, totalCols } = renderText(text);

  if (totalCols > 53) {
    console.warn(`\n⚠  Warning: "${text}" needs ${totalCols} columns but GitHub only shows ~53 weeks.`);
    console.warn(`   Consider using shorter text or abbreviations.\n`);
  }

  if (preview) {
    printPreview(grid, totalCols, mondayFirst);
  }

  // Anchor to the Monday (or Sunday) that starts the GitHub contribution graph for the target year.
  const graphStart = getGraphStart(year, mondayFirst);

  const dates = gridToDates(grid, totalCols, graphStart);

  console.log(`\nTo display "${text}" on your GitHub contribution graph:`);
  console.log(`  Total commits needed: ${dates.length}`);
  console.log(`  Date range: ${fmt(dates[0])} → ${fmt(dates[dates.length - 1])}`);
  console.log('\nDates to commit on (one commit per date minimum):\n');
  for (const d of dates) {
    console.log(`  ${fmt(d)}`);
  }

  // Build script lines
  const bashLines = dates.map(d => {
    const ds = fmt(d);
    return `GIT_AUTHOR_DATE="${ds}T12:00:00" GIT_COMMITTER_DATE="${ds}T12:00:00" git commit --allow-empty -m "."`;
  });
  const ps1Lines = dates.map(d => {
    const ds = fmt(d);
    return `$env:GIT_AUTHOR_DATE="${ds}T12:00:00"; $env:GIT_COMMITTER_DATE="${ds}T12:00:00"; git commit --allow-empty -m "."`;
  });

  if (save) {
    const fs = require('fs');
    const jsonPath = `banner_${year}.json`;
    let scriptDates = dates; // default: use computed dates from font bitmaps

    if (fs.existsSync(jsonPath)) {
      // JSON is the source of truth — read commit dates from it
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const jsonDateStrings = [];
      for (const week of jsonData.weeks) {
        for (const day of week.days) {
          if (day.contribution === 'y') jsonDateStrings.push(day.date);
        }
      }
      // Collect any commit dates that fall before the JSON window (e.g. Jan 1-4)
      // by keeping computed dates not already covered by the JSON
      const jsonSet = new Set(jsonDateStrings);
      for (const d of dates) {
        if (!jsonSet.has(fmt(d))) jsonDateStrings.unshift(fmt(d));
      }
      // Re-sort chronologically and convert to Date objects
      jsonDateStrings.sort();
      scriptDates = jsonDateStrings.map(ds => {
        const d = new Date(ds + 'T12:00:00');
        return d;
      });
      console.log(`\nUsing ${jsonPath} as source of truth (${scriptDates.length} commit dates).`);
    } else {
      console.log(`\nNo ${jsonPath} found — using computed dates from font bitmaps.`);
    }

    const finalBashLines = scriptDates.map(d => {
      const ds = fmt(d);
      return `GIT_AUTHOR_DATE="${ds}T12:00:00" GIT_COMMITTER_DATE="${ds}T12:00:00" git commit --allow-empty -m "."`;
    });
    const finalPs1Lines = scriptDates.map(d => {
      const ds = fmt(d);
      return `$env:GIT_AUTHOR_DATE="${ds}T12:00:00"; $env:GIT_COMMITTER_DATE="${ds}T12:00:00"; git commit --allow-empty -m "."`;
    });

    const bashScript = `#!/usr/bin/env bash\n# Run inside a GitHub repo to paint "${text}" on your contribution graph for ${year}\nset -e\n\n${finalBashLines.join('\n')}\ngit push\n`;
    const ps1Script = `# Run inside a GitHub repo to paint "${text}" on your contribution graph for ${year}\n\n${finalPs1Lines.join('\n')}\ngit push\n`;
    fs.writeFileSync(`banner_${year}.sh`, bashScript);
    fs.writeFileSync(`banner_${year}.ps1`, ps1Script);
    console.log(`Saved bash script:       banner_${year}.sh`);
    console.log(`Saved PowerShell script: banner_${year}.ps1`);
    console.log('\nTo run on Windows (PowerShell), from inside your GitHub repo:');
    console.log(`  .\\banner_${year}.ps1\n`);
    console.log('To run on Mac/Linux (bash), from inside your GitHub repo:');
    console.log(`  bash banner_${year}.sh\n`);
  } else {
    console.log('\n--- Git commands (bash) ---\n');
    console.log(bashLines.join('\n'));
    console.log('git push');
    console.log('\n--- Git commands (PowerShell) ---\n');
    console.log(ps1Lines.join('\n'));
    console.log('git push');
  }
}

main();

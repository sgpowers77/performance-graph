# Performance

An interactive graph of time against performance. Months run along the bottom, tiers rise up the side, and a single line snaps from one tier to the next.

Every label can be renamed, including the chart title, the time increments, and the performance tiers. Add time or add a tier when the scale is wrong. High, medium, and low change how much detail stays visible. The points themselves stay put.

Edits are saved in this browser. Reset restores the sample curve: a rise into spring, a dip in June, and a recovery by August.

## Run

```bash
npm install
npm run dev
```

Open the URL printed in the terminal.

## Resolution

- **High** shows every time label and gridline. Columns stay narrow and the chart scrolls sideways when it is wider than the window.
- **Medium** keeps every point, lightens the grid, and thins time labels when columns get tight.
- **Low** fits the whole shape to the width, with sparse time labels and the line carrying the reading.

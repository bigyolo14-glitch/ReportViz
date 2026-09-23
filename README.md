# ReportViz

A browser-first engineering report and graph viewer inspired by professional motor-test / drive-test analysis software.

## Current graph architecture

ReportViz uses an **independent Y-axis per signal**. Current, speed, power, temperature, torque, voltage and other signals therefore keep their own numerical scale and unit instead of shrinking one another.

The graph also supports:

- Multiple colored Y axes
- Independent axis ranges with automatic padding
- Numeric X axis (preserves real time/distance spacing)
- Crosshair tooltip
- Zoom and pan inside the plot
- Double-click reset
- Drag-and-drop CSV loading
- Signal visibility controls
- Engineering units inferred from signal names
- All-left / all-right axis layouts

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## GitHub Pages

The repository includes `.github/workflows/deploy.yml` for GitHub Pages deployment.

## Roadmap

- XLSX support
- Multi-axis manual scaling
- Signal groups / axis locking
- Region selection and statistics
- Synchronized multi-panel graphs
- Test-phase markers
- Measurement cursors
- PNG/SVG/CSV export
- Large-file Web Worker processing


## v0.3 engineering workspace

- Engineering overlay mode with independent Y-axis ranges per signal
- Signal lanes mode for dense multi-variable test logs
- Numeric X-axis
- Synchronized crosshair/tooltips
- Zoom and horizontal range slider
- Double-click reset
- Automatic engineering units from common signal names
- Drag-and-drop CSV loading

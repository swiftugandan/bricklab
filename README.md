# Bricklab

A free 3D brick workshop that runs in your browser. Snap pieces onto a 32 × 32 stud plate, stack and paint them, and pick up where you left off. No framework, external fonts, CDN dependency or build step. Three.js 0.186.1 is vendored with its MIT license.

- **Studio:** https://swiftugandan.github.io/bricklab/studio/
- **Website:** https://swiftugandan.github.io/bricklab/

![The Bricklab studio showing the Sunshine studio starter build](site/assets/studio.jpg)

## Run locally

```sh
git clone https://github.com/swiftugandan/bricklab.git
cd bricklab
python3 -m http.server 4173 --directory dist
```

Open `http://localhost:4173`. To force the WebGL 2 fallback, open `http://localhost:4173/?renderer=webgl`.

Run the domain tests with Node 20 or later:

```sh
npm test
```

## Repository layout

- `dist/` is the studio itself. It's served as-is; there is nothing to compile.
- `site/` is the marketing page served at the root of the GitHub Pages site.
- `tests/` holds the Node test suite for the domain model.
- `.github/workflows/` runs the tests on every push and pull request, and deploys `site/` to `/` and `dist/` to `/studio/` on GitHub Pages from `main`.

## Architecture

- `dist/src/model.js`: integer stud/plate domain model, validated transactions, undo/redo, versioned project serialization, part catalog and starter builds.
- `dist/src/scene.js`: WebGPU renderer with Three.js automatic WebGL 2 fallback, geometry caches, instanced part batches, lighting, camera, raycasting and placement feedback.
- `dist/src/hud.js`: canvas-native responsive tools, piece catalog, colour palette, project panels and keyboard focus treatment.
- `dist/src/main.js`: pointer/touch and keyboard input, domain commands, device-local autosave, import/export, image export, sound and optional WebMCP tools.

The only visible elements are the 3D canvas and the canvas UI. Native file selection is used for importing projects. Models autosave on the device; there is no account-based or cross-device storage.

## Implemented scope

19 parametric pieces in four categories; 12 colours; stud-grid placement and stacking; collision and build-volume bounds; gravity and support constraints; rotate, select, move, paint, duplicate, erase and height adjustment; 80-level undo/redo; three starter scenes; project import/export; PNG snapshots; local autosave; orbit, pan, zoom and top/front views; touch and keyboard controls.

Rendering is invalidated on demand, pixel ratio is capped at 1.75, and geometry is shared and instanced by part type. The model is capped at 2,000 pieces.

## Gravity and support

Gravity is on by default. While it's on, every piece has to be held up, and the model enforces this for every edit: placing, moving, rotating, raising, deleting, undo, import, autosave restore and the WebMCP tools.

- **Studded tops grip.** Bricks, plates, rounds and the baseplate have studs, so they hold the piece above them and the piece above holds them. A single stud is enough, which allows cantilevers and pieces hanging beneath a bridge.
- **Smooth tops only carry weight.** Tiles and slopes can have pieces resting on them, but nothing can hang beneath them.
- **Unsupported placements are refused.** The preview turns red and the studio explains why.
- **Unsupported pieces fall.** When removing or moving a piece leaves others with nothing holding them, they drop straight down. Pieces gripped together fall as one rigid group until they land on the plate or another piece.
- **Older projects settle on load.** Floating pieces in imported files or older autosaves drop into place instead of failing to load.

**Turning gravity off.** Open **Workshop settings** (the gear in the top bar) to switch gravity off and build freely in mid-air. Collisions and plate bounds still apply. Switching gravity back on drops any floating pieces into place as one undoable step: undo brings back both the setting and the floating pieces. The setting is saved per browser, alongside brick sounds, and project files never carry it, so an imported project follows the current setting.

The rules decide support only. There's no tipping, centre-of-mass or load-strength simulation, so a long cantilever held by one stud stays put.

## Known limitations
- **WebGL 2 fallback.** On one macOS machine, every three.js WebGL render (including a single cube) logged ANGLE "Metal error: Compiler encountered an internal error" and the studio's first WebGL frame did not finish within 60 seconds. WebGPU rendered the same scene in about 0.5 seconds. It hasn't been tested on other machines yet; reports are welcome.

## Verification status — 5 October 2026

PASS: Seven model tests covering collision/stacking, rotated bounds, history, atomic invalid-import rejection, starter round-trips and capacity.

PASS (Chrome, macOS, WebGPU): the starter scene renders with no runtime errors, a click places a brick and autosaves it, and drag-orbit works.

PASS: 19 physics tests covering placement, hanging, smooth tops, falling groups, landing height, moves, imports, starter stability, atomic batches and the gravity setting. In Chrome, erasing the base of the tree dropped the 8 pieces above it, undo restored them, and a mid-air placement was refused.

NOT YET VERIFIED: the full checklist below, mobile touch interaction, frame timings with large scenes, and the WebGL fallback on hardware other than the machine described above.

## Browser acceptance checks

1. Open a normal URL and verify the starter scene, readable trays, responsive layout and absence of runtime errors.
2. Place a brick, stack another, rotate at the plate boundary and confirm occupied space is rejected.
3. Select, paint, duplicate, move, raise/lower and delete; verify undo/redo for each.
4. Export a project, replace the build, reimport and compare the model. Check malformed/oversized files are rejected without losing current work.
5. Reload and verify autosave recovery. Download a PNG and inspect the image.
6. Use mouse orbit/pan/zoom and a mobile touchscreen with tap, drag and pinch. Check 390×844, 768×1024 and 1440×900 viewports.
7. Repeat core placement and snapshot checks with `?renderer=webgl`; verify `bricklabDiagnostics()` reports the actual backend.
8. Exercise a 2,000-piece scene, record frame timings while orbiting, and verify idle render counts stop increasing.
9. Validate optional WebMCP valid and invalid inputs when the browser exposes `document.modelContext`.

## Contributing

Issues and pull requests are welcome. Keep the studio dependency-free and build-free, run `npm test` before opening a pull request, and add a test to `tests/model.test.js` for any change to the domain model.

## License

[MIT](LICENSE). Three.js is included under its own MIT license in `dist/vendor/THREE-LICENSE.txt`.

Bricklab is an independent fan project and isn't affiliated with any toy brick maker.

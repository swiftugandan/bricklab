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

Open `http://localhost:4173`. A new workshop starts on an empty plate; the starter builds are under **My builds**. To force the WebGL 2 fallback, open `http://localhost:4173/?renderer=webgl`.

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
- `dist/src/hud.js`: responsive layout for the tools, piece catalog, colour palette and dialogs, plus hit zones, hover, press and keyboard focus. It produces a display list and draws nothing itself.
- `dist/src/studio-ui.js`: builds that display list out of the same plastic as the bricks, in a second 3D scene drawn over the build. Panels and buttons are moulded tiles, labels and icons are printed decals, catalog pieces use the real part geometry and colour swatches are round plates, all under one light.
- `dist/src/main.js`: pointer/touch and keyboard input, domain commands, device-local autosave, import/export, image export, sound and optional WebMCP tools.

The only visible element is the 3D canvas: the studio UI is rendered into it, and a transparent canvas above it takes pointer input. The whole frame uses Khronos Neutral tone mapping, so UI colours stay true to their designs. Native file selection is used for importing projects. Models autosave on the device; there is no account-based or cross-device storage.

## Implemented scope

54 parametric pieces in eight groups (bricks, plates, tiles, slopes, rounds and cones, side-stud bricks, bricks with holes, and links); 12 colours; stud-grid placement and stacking; collision and build-volume bounds; gravity and support constraints; rotate, select, move, paint, duplicate, erase and height adjustment; 80-level undo/redo; three starter scenes; project import/export; PNG snapshots; local autosave; orbit, pan, zoom and top/front views; touch and keyboard controls.

Rendering is invalidated on demand, pixel ratio is capped at 1.75, and geometry is shared and instanced by part type. The model is capped at 2,000 pieces.

## Gravity and support

Gravity is off by default, so pieces stay wherever you put them, even in mid-air. Switch it on in **Workshop settings** (the gear in the top bar) and every piece has to be held up. The model then enforces this for every edit: placing, moving, rotating, raising, deleting, undo, import, autosave restore and the WebMCP tools.

- **Studded tops grip.** Bricks, plates, rounds and the baseplate have studs, so they hold the piece above them and the piece above holds them. A single stud is enough, which allows cantilevers and pieces hanging beneath a bridge.
- **Smooth tops only carry weight.** Tiles, slopes and domes can have pieces resting on them, but nothing can hang beneath them.
- **Side studs slot into holes.** Bricks with studs on two opposite sides or all four sides grip a brick with holes on the facing side, as long as both sit on the same course. That grip holds pieces up like a top stud does, so you can build sideways. A side stud can't press against a plain face, another side stud or a misaligned hole; this applies whether gravity is on or off.
- **Links slot into each other.** Link pieces have studs on one side and holes on the opposite side, so identical links join sideways in a row, end to end or side by side. Grid links have studs on two adjacent sides and holes on the other two, so they join in rows and columns.
- **Unsupported placements are refused.** The preview turns red and the studio explains why.
- **Unsupported pieces fall.** When removing or moving a piece leaves others with nothing holding them, they drop straight down. Pieces gripped together fall as one rigid group until they land on the plate or another piece.
- **Projects settle on load.** With gravity on, floating pieces in imported files or older autosaves drop into place instead of failing to load.

**Switching gravity on and off.** With gravity off, collisions and plate bounds still apply. Switching gravity on drops any floating pieces into place as one undoable step: undo brings back both the setting and the floating pieces. The setting is saved per browser, alongside brick sounds, and project files never carry it, so an imported project follows the current setting.

The rules decide support only. There's no tipping, centre-of-mass or load-strength simulation, so a long cantilever held by one stud stays put.

## Known limitations
- **WebGL 2 fallback.** On one macOS machine, every three.js WebGL render (including a single cube) logged ANGLE "Metal error: Compiler encountered an internal error" and the studio's first WebGL frame did not finish within 60 seconds. WebGPU rendered the same scene in about 0.5 seconds. It hasn't been tested on other machines yet; reports are welcome.

## Verification status — 5 October 2026

PASS: Seven model tests covering collision/stacking, rotated bounds, history, atomic invalid-import rejection, starter round-trips and capacity.

PASS (Chrome, macOS, WebGPU): the starter scene renders with no runtime errors, a click places a brick and autosaves it, and drag-orbit works.

PASS: 36 physics and connector tests covering placement, hanging, smooth tops, falling groups, landing height, moves, imports, starter stability, atomic batches, the gravity setting, side faces under rotation, side grips, side-stud clashes and links. In Chrome, erasing the base of the tree dropped the 8 pieces above it, undo restored them, and a mid-air placement was refused.

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

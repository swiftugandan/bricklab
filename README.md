# Bricklab

A free 3D brick workshop that runs in your browser. Snap pieces onto a 32 × 32 stud plate, stack and paint them, and pick up where you left off. No framework, external fonts, CDN dependency or build step. Three.js 0.186.1 is vendored with its MIT license, with one patch: on WebGPU devices in compatibility mode (such as Android phones with older GPUs), Three compared shadow depths by hand but still bound the shadow map as a comparison depth texture, so every shadowed material failed to compile. The patched lines in `dist/vendor/three.webgpu.js` are marked "Bricklab patch".

- **Studio:** https://swiftugandan.github.io/bricklab/studio/
- **Website:** https://swiftugandan.github.io/bricklab/

![The Bricklab studio showing the Sunshine studio starter build](site/assets/studio.jpg)

## Run locally

```sh
git clone https://github.com/swiftugandan/bricklab.git
cd bricklab
python3 -m http.server 4173 --directory dist
```

Open `http://localhost:4173`. A new workshop starts on an empty plate; the starter builds are under **My builds**. To force the WebGL 2 fallback, open `http://localhost:4173/?renderer=webgl`; `?renderer=webgpu` forces WebGPU. Either one applies to that visit only.

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
- `dist/src/scene.js`: WebGPU renderer with Three.js automatic WebGL 2 fallback (and a report to `main.js` when WebGPU fails mid-session), geometry caches, instanced part batches, lighting, camera, raycasting and placement feedback.
- `dist/src/hud.js`: responsive layout for the tools, piece catalog, colour palette and dialogs, plus hit zones, hover, press and keyboard focus. It produces a display list and draws nothing itself.
- `dist/src/studio-ui.js`: builds that display list out of the same plastic as the bricks, in a second 3D scene drawn over the build. Panels and buttons are moulded tiles, labels and icons are printed decals, catalog pieces use the real part geometry and colour swatches are round plates, all under one light.
- `dist/src/wheel.js`: the piece wheel's eight slots and their order, which slot a pointer or flick points at, the change each quick action makes, why an action is blocked right now (asked of the model), and where the wheel sits on screen.
- `dist/src/main.js`: pointer/touch and keyboard input, domain commands, device-local autosave, import/export, image export, sound and optional WebMCP tools.

Once loaded, the only visible element is the 3D canvas: the studio UI is rendered into it, and a transparent canvas above it takes pointer input. While the scripts download and the renderer starts, a plain HTML splash in `index.html` shows a stack of bricks; it fades out on the first complete frame, and stays up with an explanation if 3D can't start. The whole frame uses Khronos Neutral tone mapping, so UI colours stay true to their designs. Native file selection is used for importing projects. Models autosave on the device; there is no account-based or cross-device storage.

## Implemented scope

54 parametric pieces in eight groups (bricks, plates, tiles, slopes, rounds and cones, side-stud bricks, bricks with holes, and links); 12 colours; stud-grid placement and stacking; collision and build-volume bounds; gravity and support constraints; a piece wheel with move, copy, paint, rotate, raise, lower, delete and use; 80-level undo/redo; three starter scenes; project import/export; PNG snapshots; local autosave; orbit, pan, zoom and top/front views; touch and keyboard controls.

Rendering is invalidated on demand, pixel ratio is capped at 1.75, and geometry is shared and instanced by part type. The model is capped at 2,000 pieces.

## On phones

On small screens the studio switches to a phone layout, chosen by the space available. In portrait, a slim top bar holds the menu, project name, Undo and Redo, and a dock at thumb height holds Build, Select, the piece in hand and Turn. In landscape, the dock becomes a rail down the left edge and Undo, Redo and the menu sit in the top-right corner. The catalog is a sheet you open by tapping the piece in hand; picking a shape puts it away. My builds, Export, Snapshot, Workshop settings and Help live in the ⋯ menu. Controls stay inside the device's safe areas and every target is at least 44 px.

Touch has no hover, so a finger places pieces in two taps: the first aims (the ghost appears on the studs you tapped, red if it can't go there, with a bubble to turn, raise, lower, place or cancel) and tapping the ghost or Place puts it down. One-finger drag turns the camera, pinch zooms, two fingers pan, and pressing and holding a piece opens its wheel. A mouse keeps its hover ghost and one-click placing at any window size.

## The piece wheel

Click a piece with **Select**, or right-click or long-press it with any tool, and a wheel of eight actions opens around it. Each action always sits in the same direction: Raise (up), Paint, Rotate (right), Copy, Lower (down), Delete, Move (left) and Use. Rotate, Raise and Lower apply at once and keep the wheel open; Paint opens a ring of colours; Move and Copy pick the piece up to drop elsewhere; Delete removes it with Undo in the toast; Use switches to Build with that piece. Pressing on a piece with Select and flicking toward a slot picks it in one motion. Holding Shift (or pressing and holding a slot) keeps the action going for each piece you click next, until Esc. Actions the build would refuse are dimmed, and the hint line says why.

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
- **WebGPU falls back to WebGL 2 when it fails.** Any lost WebGPU device (twice in one session) or uncaptured WebGPU error makes the studio save the build, remember to use WebGL 2 in this browser, reopen on WebGL 2 and say so in a toast. Workshop settings shows the renderer in use and the error that caused a switch. WebGPU gets another try once the browser updates (its user agent changes).
- **WebGL 2 fallback.** On one macOS machine, every three.js WebGL render (including a single cube) logged ANGLE "Metal error: Compiler encountered an internal error" and the studio's first WebGL frame did not finish within 60 seconds. WebGPU rendered the same scene in about 0.5 seconds. It hasn't been tested on other machines yet; reports are welcome.

## Verification status — 5 October 2026

PASS: Seven model tests covering collision/stacking, rotated bounds, history, atomic invalid-import rejection, starter round-trips and capacity.

PASS (Chrome, macOS, WebGPU): the starter scene renders with no runtime errors, a click places a brick and autosaves it, and drag-orbit works.

PASS (phone layouts, headless Chrome with touch input): tap to aim, re-aim and place; turning the aimed ghost; the catalog sheet and ⋯ menu in portrait and landscape; long-press for the wheel; My builds and Help fitting a landscape phone. Desktop mouse flows unchanged.

PASS: 9 piece-wheel tests covering slot order, flick direction, blocked actions (including gravity), wheel placement and mode labels. In headless Chrome: opening by click, right-click, long press and flick; rotate and raise keeping the wheel open; the paint ring; Move with the original hidden while carried; Shift+Delete applying to each next click; and the phone layout.

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

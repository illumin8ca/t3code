# Mobile app-store screenshot harness

The screenshot harness runs the real mobile application against a disposable local T3 environment.
It creates an ephemeral T3 base directory, a real Git project with deterministic changes, seeded
orchestration projections, and persisted terminal history. The app pairs with that server through
its normal connection flow and React Navigation opens the production Home, Thread,
ThreadTerminal, and ThreadReview routes.

No screenshot-specific screen recreates application UI. EXPO_PUBLIC_SHOWCASE=1 only enables the
non-rendering pairing/readiness coordinator and disables terminal autofocus so captures do not
contain the software keyboard.

## Capture the default matrix

From the repository root:

    pnpm screenshots:mobile

The command:

1. Creates a temporary T3 base directory and starts a local server on an available port.
2. Creates a Lumen Notes Git repository with a feature branch and uncommitted review diff.
3. Seeds the server's migrated SQLite database with projects, threads, messages, activities, and
   terminal history.
4. Starts an isolated Metro server, builds the selected native apps, and boots each device.
5. Pairs each clean app installation with the temporary environment.
6. Navigates to the real application route for every requested scene.
7. Normalizes appearance and status bars and writes exact-size PNGs to
   artifacts/app-store/screenshots/.

The server, Metro, temporary base directory, and devices started by the runner are cleaned up after
capture. Pass --keep-running to retain them for inspection; the runner prints the base-directory
path and server port.

Captures wait for the real environment snapshot to hydrate and for the requested route to become
active. Both platforms record readiness in the simulator/emulator app container. A final settle
delay allows native terminal and Git review data to finish rendering.

A full capture regenerates the selected native project with Expo's clean development prebuild before
building it. Use --skip-build for repeated captures after the first build.

The harness uses its own Metro port (8199 by default), so an ordinary mobile server or another
worktree cannot accidentally provide the bundle being photographed.

The default matrix is:

- iphone-6.9: iPhone 17 Pro Max
- ipad-13: iPad Pro 13-inch (M5)
- pixel: Pixel 10 Pro Android AVD

Edit [mobile-showcase.config.ts](../../scripts/mobile-showcase.config.ts) to change simulator or AVD
names, light/dark appearance, scenes, output directory, capture delay, Android ABI, or viewport.

## Fast iteration

Capture one scene or device:

    pnpm screenshots:mobile --device iphone-6.9 --scene thread
    pnpm screenshots:mobile --platform android --scene review

Reuse the native build and retain the disposable environment:

    pnpm screenshots:mobile --device ipad-13 --skip-build --keep-running

Run Metro separately:

    pnpm --filter @t3tools/mobile showcase
    pnpm screenshots:mobile --skip-build --skip-metro --device iphone-6.9

List the matrix and flags:

    pnpm screenshots:mobile --list

## Customize the seeded environment

- Project repository, thread projections, conversation, terminal transcript, and Git changes:
  [mobile-showcase-environment.ts](../../scripts/mobile-showcase-environment.ts)
- Device and capture matrix:
  [mobile-showcase.config.ts](../../scripts/mobile-showcase.config.ts)
- Simulator/emulator orchestration:
  [mobile-showcase.ts](../../scripts/mobile-showcase.ts)

Fixture timestamps are generated relative to capture startup so every route shows stable relative
labels while the server still receives valid current data. The same ephemeral environment serves
iPhone, iPad, and Android; responsive differences come entirely from the production app layout.

## Local prerequisites

- iOS: Xcode command-line tools, the configured simulator runtimes, and installed CocoaPods.
- Android: ANDROID_HOME (or the default macOS SDK path), adb, emulator, and the configured AVD.

For store submission, keep generated PNGs unscaled. Configure device classes and Android viewport
dimensions that match the exact upload slots.

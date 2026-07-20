/*
 * Public API of @honuware/ui (primary entry point).
 *
 * The reusable code lives in the layered SECONDARY entry points —
 * @honuware/ui/foundation, /access, /controls, /photos, /auth, /crud,
 * /square, /testing — so consumers import only what they use and the
 * layering is build-enforced (ng-packagr fails on cycles between entries).
 * This primary entry deliberately stays minimal.
 */
export const HONUWARE_UI_VERSION = '0.1.0';

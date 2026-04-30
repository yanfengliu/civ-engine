/**
 * Engine version, kept in sync with package.json's "version" field by the
 * release process. Read by SessionRecorder / scenarioResultToBundle for
 * `metadata.engineVersion` in session bundles. Avoids relying on
 * `process.env.npm_package_version` which is only set under `npm run`.
 */
export const ENGINE_VERSION = '0.8.12' as const;

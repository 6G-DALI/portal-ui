import { execFileSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

/**
 * Roots the dev server is allowed to serve files from.
 *
 * `npm link @6g-dali/ui-theme` makes node_modules/@6g-dali/ui-theme a symlink
 * into the common-ui checkout, and its `@import '@fontsource/dm-sans/…'` then
 * resolves against *that* repository's node_modules — outside this project
 * root, which server.fs.allow rejects ("outside of Vite serving allow list").
 *
 * So: resolve each shared package through the symlink and allow the workspace
 * root it belongs to. When the packages are installed from GitHub Packages
 * instead of linked, realpath stays inside this project and each entry
 * collapses to the root that is already allowed — this costs nothing and needs
 * no undoing.
 */
function sharedPackageRoots(): string[] {
  return ['@6g-dali/ui-theme', '@6g-dali/ui-shell'].flatMap(name => {
    try {
      return [searchForWorkspaceRoot(realpathSync(`${projectRoot}node_modules/${name}`))]
    } catch {
      // Not installed yet (a fresh checkout before npm install); nothing to add.
      return []
    }
  })
}

/**
 * Short commit SHA for the footer's build marker.
 *
 * GIT_SHA first, because the image build cannot ask git: .dockerignore excludes
 * .git (correctly — it would bloat the context and bust the layer cache), so CI
 * passes the SHA in as a build arg. `git rev-parse` is the local-development
 * path. Neither working means an unmarked build rather than a failed one — a
 * missing build number must never be the reason a release cannot be cut.
 */
function buildSha(): string {
  const fromEnv = process.env.GIT_SHA?.trim()
  if (fromEnv) return fromEnv.slice(0, 7)

  try {
    return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim()
  } catch {
    return 'unknown'
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    // Serialised, not interpolated: define does a raw textual substitution, so
    // the value has to arrive as a JS literal.
    __BUILD_SHA__: JSON.stringify(buildSha()),
  },
  server: {
    port: 3100,
    // Fail loudly instead of silently moving to 3101 if the port is taken:
    // the Keycloak client's Web Origins list is per-origin, so a shifted port
    // surfaces as an opaque CORS failure on the token endpoint.
    strictPort: true,
    host: 'localhost',
    fs: {
      allow: [searchForWorkspaceRoot(projectRoot), ...sharedPackageRoots()],
    },
  },
})

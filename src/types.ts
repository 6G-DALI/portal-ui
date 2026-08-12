/** The portal's views. Hash-routed, mirroring dataops-ui's App.tsx. */
export type View = 'overview' | 'account'

export type NavigateFn = (view: View) => void

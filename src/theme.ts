import { createTheme } from '@mui/material/styles'

/**
 * Professional POS theme (Burmese-first, low-literacy friendly):
 * neutral surfaces + one green accent, restrained radii, clear hierarchy,
 * ≥52px touch targets, high contrast.
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0f6b3e', light: '#12814b', dark: '#0b4d2c', contrastText: '#fff' },
    secondary: { main: '#475467' },
    error: { main: '#b42318' },
    warning: { main: '#b54708' },
    success: { main: '#0f6b3e' },
    background: { default: '#f6f7f6', paper: '#ffffff' },
    text: { primary: '#101828', secondary: '#667085', disabled: '#98a2b3' },
    divider: '#e4e7ec',
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "'Padauk', 'Noto Sans Myanmar', 'Myanmar Text', sans-serif",
    fontSize: 15,
    h4: { fontSize: 26, fontWeight: 700, letterSpacing: 0 },
    h5: { fontSize: 22, fontWeight: 700 },
    h6: { fontSize: 18, fontWeight: 700 },
    subtitle1: { fontSize: 16, fontWeight: 600 },
    subtitle2: { fontSize: 14, fontWeight: 500, color: '#667085' },
    body1: { fontSize: 15, lineHeight: 1.5 },
    body2: { fontSize: 14, lineHeight: 1.5 },
    button: { fontSize: 15, fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
    caption: { fontSize: 12.5, color: '#667085' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 48,
          borderRadius: 9,
          paddingInline: 18,
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        sizeLarge: { minHeight: 56, fontSize: 16, borderRadius: 10 },
        outlined: { borderColor: '#d0d5dd', color: '#344054' },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { width: 44, height: 44, borderRadius: 9 } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: '1px solid #e4e7ec', borderRadius: 12, boxShadow: 'none', backgroundImage: 'none' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 7, fontWeight: 600, fontSize: 12.5, height: 26 },
        label: { paddingInline: 9 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 9, backgroundColor: '#fff' },
        notchedOutline: { borderColor: '#d0d5dd' },
      },
    },
    MuiInputBase: {
      styleOverrides: { root: { fontSize: 16 }, input: { fontSize: 16 } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 14, maxWidth: 440 } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 10, fontSize: 14.5, alignItems: 'center' } },
    },
    MuiToolbar: { styleOverrides: { root: { minHeight: 60 } } },
    MuiCssBaseline: {
      styleOverrides: {
        'input, textarea': { fontSize: 16 },
        '*': { WebkitTapHighlightColor: 'transparent' },
        // accessibility: visible keyboard focus everywhere
        ':focus-visible': { outline: '2px solid #0f6b3e', outlineOffset: 2 },
        // iOS safe area support for fixed bottom bars
        '.safe-bottom': { paddingBottom: 'env(safe-area-inset-bottom)' },
        '.safe-bottom-offset': { marginBottom: 'env(safe-area-inset-bottom)' },
      },
    },
  },
})

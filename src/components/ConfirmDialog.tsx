import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { LABELS } from '../data/labels.mm'

interface Props {
  open: boolean
  question: string
  onYes: () => void
  onNo: () => void
}

/** Confirm dialog — "accidental cart clear / sale confirm" guard. */
export function ConfirmDialog({ open, question, onYes, onNo }: Props) {
  return (
    <Dialog open={open} onClose={onNo} aria-label={LABELS.appName}>
      <DialogTitle sx={{ fontSize: 17, fontWeight: 700, pb: 1 }}>{LABELS.appName}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 15.5, lineHeight: 1.55 }}>{question}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1.25 }}>
        <Button variant="outlined" onClick={onNo} data-testid="confirm-no" sx={{ flex: 1 }}>
          {LABELS.no}
        </Button>
        <Button variant="contained" onClick={onYes} data-testid="confirm-yes" sx={{ flex: 1 }}>
          {LABELS.yes}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

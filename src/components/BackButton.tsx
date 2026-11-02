import { Button } from '@mui/material'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import { useNavigate } from 'react-router-dom'
import { LABELS } from '../data/labels.mm'
import type { JSX } from 'react'

interface Props {
  to?: string // navigate to a specific route; otherwise browser-back
  label?: string
}

/** Consistent back affordance: arrow icon + Burmese label (UX baseline). */
export function BackButton({ to, label }: Props): JSX.Element {
  const navigate = useNavigate()
  return (
    <Button
      variant="text"
      color="inherit"
      startIcon={<ArrowBackRounded />}
      onClick={() => (to ? navigate(to) : navigate(-1))}
      sx={{ minWidth: 0, color: 'text.secondary', pl: 0.5, '& .MuiButton-startIcon': { mr: 0.5 } }}
    >
      {label ?? LABELS.back}
    </Button>
  )
}

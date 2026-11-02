import { useState, type FormEvent } from 'react'
import { Box, Button, Card, CardContent, TextField, Typography, Alert, Divider } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { LABELS } from '../data/labels.mm'
import { login } from '../services/authService'
import type { JSX } from 'react'

export function LoginPage(): JSX.Element {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [failCount, setFailCount] = useState(0)
  const navigate = useNavigate()

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(username, password)
      navigate('/', { replace: true })
    } catch (e2) {
      const code = (e2 as { code?: string }).code ?? 'UNKNOWN'
      setError(LABELS.errCodeLabel(code))
      if (code === 'INVALID_CREDENTIALS') setFailCount((n) => n + 1)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        px: 2,
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 400 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            {LABELS.appName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {LABELS.shopName}
          </Typography>
        </Box>

        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              {LABELS.loginTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {LABELS.shopName}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Box component="form" onSubmit={onSubmit} noValidate>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.75, fontWeight: 600 }}>
                {LABELS.username}
              </Typography>
              <TextField
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder={LABELS.username}
                sx={{ mb: 2.5 }}
              />
              <Typography variant="caption" sx={{ display: 'block', mb: 0.75, fontWeight: 600 }}>
                {LABELS.password}
              </Typography>
              <TextField
                fullWidth
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder={LABELS.password}
                sx={{ mb: 3 }}
              />
              {error && (
                <Alert severity="error" sx={{ mb: 2.5 }}>
                  {error}
                </Alert>
              )}
              {failCount >= 3 ? (
                <Alert severity="info" sx={{ mb: 1 }}>
                  စကားဝှက် မေ့နေပါက မန်နေဂျာထံ ဆက်သွယ်ပါ။
                </Alert>
              ) : (
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={busy || !username || !password}
                >
                  {busy ? LABELS.signingIn : LABELS.signIn}
                </Button>
              )}
              {failCount > 0 && failCount < 3 && (
                <Typography align="right" variant="caption" sx={{ display: 'block', mt: 1 }}>
                  {failCount}/3
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>

        <Typography align="center" variant="caption" sx={{ display: 'block', mt: 3 }}>
          {LABELS.appName}
        </Typography>
      </Box>
    </Box>
  )
}

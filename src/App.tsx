import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { QueryClient } from '@tanstack/react-query'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { createIndexedDbPersister } from './db/queryPersister'
import { shouldPersistQueryKey } from './db/persistPolicy'
import { theme } from './theme'
import { router } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7, // persist window
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
})

export function App(): JSX.Element {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: createIndexedDbPersister(),
          dehydrateOptions: {
            shouldDehydrateQuery: (q) => shouldPersistQueryKey(q.queryKey),
          },
        }}
      >
        {router()}
      </PersistQueryClientProvider>
    </ThemeProvider>
  )
}

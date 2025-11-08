import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './Layout'
import { ThemeProvider } from '@/components/ThemeContext'

// Create a client
const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <Layout />
      </ThemeProvider>
    </QueryClientProvider>
  )
}




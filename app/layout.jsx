import './globals.css'
import { ToastProvider } from '@/components/shared/Toast'

export const metadata = {
  title: 'BiddingCrease - Cricket Auction Platform',
  description: 'Real-time cricket auction management platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}


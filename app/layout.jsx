import './globals.css'

export const metadata = {
  title: 'BiddingCrease - Cricket Auction Platform',
  description: 'Real-time cricket auction management platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}


import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Michroma, Newsreader } from "next/font/google"
import { CoinInspector } from "@/components/coin/coin-inspector"
import { PaywallHost } from "@/components/wce/paywall"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500"],
})

// Wide display face for league numbers (stand-in for Gear Wide from the Figma file).
const michroma = Michroma({
  variable: "--font-michroma",
  subsets: ["latin"],
  weight: "400",
})

export const metadata: Metadata = {
  title: "World Class Edge · Training",
  description: "Learn trading by doing: interactive chart exercises.",
  appleWebApp: { capable: true, title: "WCE Training", statusBarStyle: "black-translucent" },
}

export const viewport: Viewport = {
  themeColor: "#000000",
  // let pages extend under the notch / home indicator; the tab bar pads itself
  viewportFit: "cover",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${newsreader.variable} ${michroma.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <CoinInspector />
        <PaywallHost />
      </body>
    </html>
  )
}

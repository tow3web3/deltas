import TickerTape from '../components/TickerTape'
import Navigation from '../components/Navigation'
import Hero from '../components/Hero'
import Destinations from '../components/Destinations'
import TopPages from '../components/pages/TopPages'
import Why from '../components/Why'
import Peeks from '../components/Peeks'
import StatsBar from '../components/StatsBar'
import TokenSearch from '../components/TokenSearch'
import LiveFeed from '../components/LiveFeed'
import Screener from '../components/Screener'
import HowItWorks from '../components/HowItWorks'
import StockUniverse from '../components/StockUniverse'
import Modes from '../components/Modes'
import TokenLive from '../components/TokenLive'
import Developers from '../components/Developers'
import Security from '../components/Security'
import FAQ from '../components/FAQ'
import CTA from '../components/CTA'
import Footer from '../components/Footer'
import Reveal from '../components/Reveal'
import { Cut } from '../components/ui/Light'

export default function Home() {
  return (
    <main className="min-h-screen">
      <TickerTape />
      <Navigation />
      <Hero />

      <div className="mx-auto max-w-6xl space-y-28 px-5 py-24">
        <Reveal><StatsBar /></Reveal>
        {/* The token, right under the numbers: the first thing a launch-day visitor looks for */}
        <Reveal><TokenLive /></Reveal>
        <Reveal><HowItWorks /></Reveal>
        <Reveal><Destinations /></Reveal>
        <Cut />
        <Reveal><TopPages /></Reveal>
        <Why />
        <Cut />
        <Reveal><Modes /></Reveal>
        <Reveal><Peeks /></Reveal>
        <Reveal><StockUniverse compact /></Reveal>
        <Reveal><TokenSearch /></Reveal>
        <div id="live" className="scroll-mt-20 grid items-start gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <div className="eyebrow mb-4">Live</div>
            <h2 className="font-display text-[34px] font-medium leading-[1.05] tracking-[-0.03em] text-ink sm:text-[42px]">Watch the payouts land</h2>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-mut">Coins linking up and holders being paid, on Solana and Robinhood Chain, as it happens.</p>
          </div>
          <Reveal><LiveFeed /></Reveal>
        </div>
        <Reveal><Screener /></Reveal>
        <Cut />
        <Reveal><Developers /></Reveal>
        <Reveal><Security /></Reveal>
        <div id="faq" className="scroll-mt-20"><Reveal><FAQ /></Reveal></div>
        <Reveal><CTA /></Reveal>
      </div>

      <Footer />
    </main>
  )
}

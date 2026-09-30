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

export default function Home() {
  return (
    <main className="min-h-screen">
      <TickerTape />
      <Navigation />
      <Hero />

      <div className="mx-auto max-w-6xl space-y-24 px-5 py-24">
        <Reveal><StatsBar /></Reveal>
        {/* The token, right under the numbers: the first thing a launch-day visitor looks for */}
        <Reveal><TokenLive /></Reveal>
        <Reveal><Destinations /></Reveal>
        <Reveal><TopPages /></Reveal>
        <Reveal><HowItWorks /></Reveal>
        <Why />
        <Reveal><Modes /></Reveal>
        <Reveal><Peeks /></Reveal>
        <Reveal><TokenSearch /></Reveal>
        <Reveal><StockUniverse compact /></Reveal>
        <div id="live" className="scroll-mt-20 grid items-start gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <div className="eyebrow mb-2">Live</div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Watch the payouts land</h2>
            <p className="mt-3 text-sm leading-relaxed text-mut">Coins linking up and holders being paid, in real time.</p>
          </div>
          <Reveal><LiveFeed /></Reveal>
        </div>
        <Reveal><Screener /></Reveal>
        <Reveal><Developers /></Reveal>
        <Reveal><Security /></Reveal>
        <div id="faq" className="scroll-mt-20"><Reveal><FAQ /></Reveal></div>
        <Reveal><CTA /></Reveal>
      </div>

      <Footer />
    </main>
  )
}

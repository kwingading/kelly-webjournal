import { useState } from 'react'

const sections = [
  { id: 'about', title: 'About', numeral: 'i' },
  { id: 'analogue', title: 'Analogue', numeral: 'ii' },
  { id: 'digital', title: 'Digital', numeral: 'iii' },
  { id: 'writing', title: 'Writing', numeral: 'iv' },
]

const contentData = {
  about: [
    { num: 1, text: 'At heart - A storyteller, dreamer, lover of beauty. Crafting things that delight.' },
    { num: 2, text: 'haru wa akebono - Heian period court-ladies, Mishima and Kawabata. Natasha and Andrei at the ball. Austen.' },
    { num: 3, text: 'LinkedIn tldr - Product Manager at a FinTech startup in HK. Previously shipped hotel concierge voicebots at PolyAI.' },
    { num: 4, text: 'Flow - Reading, writing and building. (Ice) Dance and jamming to music. Volleyball. Kintsugi.' },
    { num: 5, text: 'Past Lives - London, Cambridge and Lockdown edition Oxford. Drew syntax trees and read Grice. Learned some Japanese and French. Wrote an unhealthy amount of fiction.' },
  ],
  analogue: [
    { num: 1, text: 'bun bun - bun bun' },
    { num: 2, text: 'More placeholder content to demonstrate the layout and styling of multiple entries.' },
  ],
  digital: [
    { num: 1, text: 'Placeholder content for Digital section. This section could showcase digital projects, code experiments, or online creations.' },
    { num: 2, text: 'Additional placeholder content for the digital realm.' },
  ],
  writing: {
    categories: [
      {
        title: 'Personal Musings',
        items: [
          { text: 'change is often quiet', url: 'https://portableonsens.substack.com/p/change-is-often-quiet' },
          { text: 'A Love Letter to Onsens', url: 'https://portableonsens.substack.com/p/on-onsens-and-ryokans' },
          { text: 'Interlude: An Homage to Spring [2024]', url: 'https://portableonsens.substack.com/p/interlude-an-homage-to-spring-2024' },
          { text: 'From the Archive: Early October Edition [2023]', url: 'https://portableonsens.substack.com/p/from-the-archive-early-october-edition' },
          { text: 'Limbo', url: 'https://portableonsens.substack.com/p/limbo' },
          { text: 'Goodbye London', url: 'https://portableonsens.substack.com/p/goodbye-london' },
          { text: '2022', url: 'https://portableonsens.substack.com/p/2022' },
          { text: 'On Being Fickle', url: 'https://portableonsens.substack.com/p/on-being-fickle' },
          { text: 'Adrift! A Little Boat Adrift!', url: 'https://portableonsens.substack.com/p/adrift-a-little-boat-adrift' },
          { text: 'Back From The Dead(ish) Just to Daydream About Japan', url: 'https://portableonsens.substack.com/p/back-from-the-dead-ish-just-to-daydream-about-japan' },
          { text: 'Meditations on Autumn', url: 'https://portableonsens.substack.com/p/meditations-on-autumn' },
        ],
      },
      {
        title: 'Various Essays and Notes',
        items: [
          { text: 'Information Privacy in the US, EU and China: Differences in Cultural Conceptions and Regulatory Stringency', url: 'https://portableonsens.substack.com/p/information-privacy-in-the-us-eu-and-china-differences-in-cultural-conceptions-and-regulatory-stringency' },
          { text: 'Personalised Learning™ - The Future of K12 Education?', url: 'https://portableonsens.substack.com/p/personalised-learning-tm-the-future-of-k12-education-personalised-learning-tm-the-future-of-k-12-education' },
          { text: 'Megaproject Entrepreneurs', url: '#' },
          { text: 'Understanding First Language Acquisition', url: 'https://portableonsens.substack.com/p/understanding-first-language-acquisition' },
        ],
      },
    ],
  },
}

function ContentItem({ num, text }) {
  const dashIndex = text.indexOf(' - ')
  const hasLabel = dashIndex !== -1
  const label = hasLabel ? text.slice(0, dashIndex) : null
  const content = hasLabel ? text.slice(dashIndex + 3) : text

  return (
    <div className="flex gap-4 mb-6 leading-relaxed">
      <span className="text-black shrink-0">[{num}]</span>
      <span>
        {hasLabel && <><em>{label}</em> - </>}
        {content}
      </span>
    </div>
  )
}

function Navigation({ activeSection, onSelectSection }) {
  return (
    <nav className="pt-[23vh] pb-12">
      <h1 className="text-4xl md:text-5xl mb-24 tracking-wide text-center">Contents</h1>
      <ul className="space-y-1 pl-[22%] pr-[26%]">
        {sections.map((section) => (
          <li key={section.id}>
            <button
              onClick={() => onSelectSection(section.id)}
              className={`w-full flex justify-between items-center text-xl md:text-2xl py-0.5 transition-colors duration-200 text-left hover:text-black ${
                activeSection === section.id
                  ? 'text-black'
                  : 'text-black/60'
              }`}
            >
              <span>{section.title}</span>
              <span className="ml-8 tabular-nums">{section.numeral}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function WritingContent() {
  const { categories } = contentData.writing

  return (
    <>
      {categories.map((category, idx) => (
        <div key={category.title} className={idx > 0 ? 'mt-8' : ''}>
          <h2 className="text-black mb-3">{category.title}</h2>
          <ul className="list-disc list-inside space-y-1.5">
            {category.items.map((item) => (
              <li key={item.text} className="text-black">
                <a
                  href={item.url}
                  className="text-black underline hover:text-black/60 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

function Content({ activeSection }) {
  const items = contentData[activeSection] || []
  const isComingSoon = activeSection === 'analogue' || activeSection === 'digital'
  const isWriting = activeSection === 'writing'

  return (
    <article className="pt-[calc(23vh+8rem)] pb-12 px-8 md:pt-[calc(23vh+9rem)] md:px-12 lg:px-16">
      <div className="text-[17.5px]">
        {isComingSoon ? (
          <p className="text-[23px] text-black/60 italic">coming soon</p>
        ) : isWriting ? (
          <div className="text-[15px]">
            <WritingContent />
          </div>
        ) : (
          items.map((item) => (
            <ContentItem key={item.num} num={item.num} text={item.text} />
          ))
        )}
      </div>
    </article>
  )
}

function App() {
  const [activeSection, setActiveSection] = useState('about')

  return (
    <div className="min-h-screen bg-cream text-black font-serif">
      {/* Mobile Layout */}
      <div className="md:hidden">
        <Navigation
          activeSection={activeSection}
          onSelectSection={setActiveSection}
        />
        <div className="border-t border-divider mx-8" />
        <Content activeSection={activeSection} />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex min-h-screen">
        <div className="w-1/2 relative">
          <Navigation
            activeSection={activeSection}
            onSelectSection={setActiveSection}
          />
          {/* Book gutter shadow on right edge */}
          <div
            className="absolute top-0 right-0 w-2 h-full pointer-events-none"
            style={{
              background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.08))',
            }}
          />
        </div>
        <div className="w-1/2 relative">
          {/* Book gutter shadow on left edge */}
          <div
            className="absolute top-0 left-0 w-2 h-full pointer-events-none"
            style={{
              background: 'linear-gradient(to left, transparent, rgba(0,0,0,0.08))',
            }}
          />
          <Content activeSection={activeSection} />
        </div>
      </div>
    </div>
  )
}

export default App

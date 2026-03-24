import Link from "next/link";

const treatmentCategories = [
  { name: "Anti-Wrinkles", icon: "neurology", from: 100 },
  { name: "Dermal Fillers", icon: "water_drop", from: 160 },
  { name: "Skin Boosters", icon: "spa", from: 150 },
  { name: "Laser Hair Removal", icon: "bolt", from: 30 },
  { name: "Chemical Peels", icon: "science", from: 60 },
  { name: "Microneedling", icon: "grid_on", from: 150 },
  { name: "IV & IM Treatments", icon: "vaccines", from: 80 },
  { name: "Facials & LED", icon: "auto_awesome", from: 40 },
  { name: "Body Treatments", icon: "fitness_center", from: 80 },
  { name: "Laser Skin", icon: "flare", from: 50 },
];

const insights = [
  {
    title: "The Science Behind Skin Boosters",
    description: "Learn how polynucleotides and Profhilo work to restore hydration and stimulate collagen deep within your skin.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAyMaHVtGXUe7ijF9lmHj44zeqa1LVhhIRdUdf_fwr7hhTa5HqIEMGppgoNN4QNBCN8NreYDPJx9ohHLtMXC4wLK9r47yKkGM8LHpXVF5IbDWMz4B_AQGv5XjqdJGbn-3aDxa7MKmgJwarlWJPvQJUW7chRl5aYT9XeKbCpL3kfvjOH3zVzwMucvPQQApIOZGxZ7VBYjJHUh-vph1nIeKLC2XrrUHr8G53DkC0JHhcznCPiH6vsTjk5my4Vzvdh9SInQZxhE1zAjJOy",
  },
  {
    title: "5 Habits for Healthy, Glowing Skin",
    description: "From hydration to skincare routines, learn how to maintain your clinic results at home between treatments.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCSvnwXwEHee9qCFCbzUYH7FSRuADkaQS-ilmfMvIahGFYATL3DaJbImu-OIuVWp8MRLPimgsE2RYcXAR-FTXhvAdAyuB378JS3FiIJLSDE-Nx-l7Ci16DEJ2rvzcNNPrhotsJDQYA5e5pSbJyhJvBQTw1HpbCwTN09M4lS7M22Gs-lcGLkGrLtnEHJ3xSFiOGK3NWqOHvB1lGdx8TV1hsSxxuecb2KfRKXKTECuhE09AwmkSxQ3nmeVbdEkau2EQisvZcAIfsultl9",
  },
  {
    title: "Why Microneedling Is a Favourite",
    description: "Discover how microneedling boosts collagen production, smooths texture, and restores natural radiance.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCy79q8CM3cONaNrIGdWs21JN4w8YDma8N8hpzV_6PfX2uFpsJfHMsri89aCLqTl3MradVw_y_A-jzusVpbBLFg5c5XPpE2LtRFSJIl5iqIJLrTqMDLgqnbwFlcZoJK7p73ltKFruJR6_Ia0fbiFv4KA1dZj51z1efwLhxf8vIZudWH6X4Y74q-J7qKPWp2hdVZkMytyDIffFsJCZgj-ocl5yD5FN_A-lgrBP9BjpM0i3Nj-p7Qb071MWrdaix5YSAK9vveIhiloM5a",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#f9faf2]/60 backdrop-blur-sm">
        <div className="flex justify-between items-center px-6 md:px-12 py-4 max-w-[1440px] mx-auto w-full">
          <div className="flex items-center gap-8 md:gap-12">
            <Link href="/" className="text-2xl font-headline italic text-[var(--primary)]">Dr Skin Central</Link>
            <div className="hidden md:flex items-center space-x-8">
              <a className="text-[var(--foreground)] text-sm font-medium" href="#home">Home</a>
              <a className="text-[var(--foreground)]/60 text-sm font-medium hover:text-[var(--primary)]" href="#about">About</a>
              <a className="text-[var(--foreground)]/60 text-sm font-medium hover:text-[var(--primary)]" href="#treatments">Treatments</a>
              <a className="text-[var(--foreground)]/60 text-sm font-medium hover:text-[var(--primary)]" href="#testimonials">Testimonials</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] hidden sm:inline">
              Log In
            </Link>
            <Link href="/book" className="bg-white border border-[var(--outline-variant)]/30 text-[var(--foreground)] px-6 py-2 rounded-full text-sm hover:bg-[var(--surface)] transition-colors">
              Book Now
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section id="home" className="relative min-h-screen pt-24 grid-bg overflow-hidden">
          <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-full flex flex-col md:flex-row items-center gap-12 pt-12">
            <div className="w-full md:w-1/2 z-10">
              <h1 className="font-headline text-5xl md:text-7xl lg:text-8xl text-[var(--foreground)] leading-[1.05] mb-6">
                Where <span className="italic">Beauty</span> Meets Wellness
              </h1>
              <p className="text-[var(--muted-foreground)] text-lg mb-8 max-w-md font-light leading-relaxed">
                Personalised aesthetic and wellness treatments tailored to you, delivered by expert practitioners in Ipswich.
              </p>
              <div className="flex flex-wrap gap-4 mb-10">
                <Link href="/book" className="bg-[var(--primary)] text-white px-8 py-3 rounded-full text-sm inline-block">
                  Book a Consultation
                </Link>
                <a href="#treatments" className="bg-white border border-[var(--outline-variant)]/30 text-[var(--foreground)] px-8 py-3 rounded-full text-sm inline-block">
                  Explore Treatments
                </a>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)] font-light">
                  <span className="material-symbols-outlined text-[var(--primary)] text-lg">check</span> Personalised treatment plans
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)] font-light">
                  <span className="material-symbols-outlined text-[var(--primary)] text-lg">check</span> Expert practitioners
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)] font-light">
                  <span className="material-symbols-outlined text-[var(--primary)] text-lg">check</span> 96+ treatments available
                </div>
              </div>
              <div className="mt-12 flex items-center gap-4">
                <div className="flex -space-x-3">
                  <img alt="" className="w-10 h-10 rounded-full border-2 border-[var(--surface)] object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvl3tZECW9SK5d18U5SbmU76TQ50kvba2UI5agPxxjfmiDqtf4WYKRdz0Ko0YGVzxwEOE9BiWm-LfEXpHfiofPFvLRP9suQ9A4cPRPayumoegCaVO_WobnJ_VcPykBbor20IK2_P_3wSv4O97JzjwgpS9A9lGMhwRn7EmDVv0Ft3jn46sMD0bD9_R32H_A_voqFQ7qhgmVPe69bxa3I-2TVTehuu9Go4F1W4jez_Ee9C6PZtEX1uZCVWSJcxdO3Ahg8ziubLl-DksN" />
                  <img alt="" className="w-10 h-10 rounded-full border-2 border-[var(--surface)] object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSvnwXwEHee9qCFCbzUYH7FSRuADkaQS-ilmfMvIahGFYATL3DaJbImu-OIuVWp8MRLPimgsE2RYcXAR-FTXhvAdAyuB378JS3FiIJLSDE-Nx-l7Ci16DEJ2rvzcNNPrhotsJDQYA5e5pSbJyhJvBQTw1HpbCwTN09M4lS7M22Gs-lcGLkGrLtnEHJ3xSFiOGK3NWqOHvB1lGdx8TV1hsSxxuecb2KfRKXKTECuhE09AwmkSxQ3nmeVbdEkau2EQisvZcAIfsultl9" />
                  <img alt="" className="w-10 h-10 rounded-full border-2 border-[var(--surface)] object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAyMaHVtGXUe7ijF9lmHj44zeqa1LVhhIRdUdf_fwr7hhTa5HqIEMGppgoNN4QNBCN8NreYDPJx9ohHLtMXC4wLK9r47yKkGM8LHpXVF5IbDWMz4B_AQGv5XjqdJGbn-3aDxa7MKmgJwarlWJPvQJUW7chRl5aYT9XeKbCpL3kfvjOH3zVzwMucvPQQApIOZGxZ7VBYjJHUh-vph1nIeKLC2XrrUHr8G53DkC0JHhcznCPiH6vsTjk5my4Vzvdh9SInQZxhE1zAjJOy" />
                </div>
                <p className="text-xs text-[var(--muted-foreground)] font-light">
                  <span className="font-bold text-[var(--foreground)]">5★ rated</span> clinic in Ipswich
                </p>
              </div>
            </div>
            <div className="w-full md:w-1/2 relative">
              <div className="relative rounded-[4rem] overflow-hidden aspect-[4/5] max-w-[500px] ml-auto">
                <img alt="Aesthetic treatment" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2o0sQmz_StbuV4CoLt9ENI_qFGaoBNqMuCtiAxF1brl6N2U48Esby_gDE579ezMBIC8quiCoDQB8dH8xbYWeQOWnioiL2PmyjKcWBkOogLVeF8IlKdr59VW9C24L0XCAjKd5M-IBdttbeCb88xH-gR_Vpzl3VWHx77iKRS9f1tcFK0Lbg6YK5xZ8cUfyzzvOT49ANC88mtMQmNjOZfsGh9s3eRsRcSHBoyqZ8Bdu-StGNafcVRz7hv9tpSmoJOdMcA73tW7tNbwOS" />
                <div className="absolute top-1/4 right-8 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30">
                  <span className="text-[10px] text-white uppercase tracking-widest font-medium">Skin Boosters</span>
                </div>
                <div className="absolute top-1/2 left-4 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30">
                  <span className="text-[10px] text-white uppercase tracking-widest font-medium">Anti-Wrinkles</span>
                </div>
                <div className="absolute bottom-1/4 right-12 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30">
                  <span className="text-[10px] text-white uppercase tracking-widest font-medium">Dermal Fillers</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row gap-16 items-start">
            <div className="md:w-1/2">
              <h2 className="font-headline text-4xl md:text-5xl leading-tight mb-8">
                Embrace Your Inner Peace and <span className="italic">Discover True Beauty</span>
              </h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed max-w-lg font-light">
                At Dr Skin Central, we believe beauty grows from confidence. Each treatment is thoughtfully designed by our expert team to deliver natural-looking results while caring for your overall wellbeing.
              </p>
            </div>
            <div className="md:w-1/2 flex justify-end">
              <div className="w-64 h-64 rounded-full overflow-hidden border-8 border-[var(--surface-container-low)] shadow-2xl">
                <img alt="Treatment" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvl3tZECW9SK5d18U5SbmU76TQ50kvba2UI5agPxxjfmiDqtf4WYKRdz0Ko0YGVzxwEOE9BiWm-LfEXpHfiofPFvLRP9suQ9A4cPRPayumoegCaVO_WobnJ_VcPykBbor20IK2_P_3wSv4O97JzjwgpS9A9lGMhwRn7EmDVv0Ft3jn46sMD0bD9_R32H_A_voqFQ7qhgmVPe69bxa3I-2TVTehuu9Go4F1W4jez_Ee9C6PZtEX1uZCVWSJcxdO3Ahg8ziubLl-DksN" />
              </div>
            </div>
          </div>
        </section>

        {/* Features Row */}
        <section className="pb-24 px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-[var(--surface-container-low)] rounded-[2rem] border border-[var(--outline-variant)]/10">
              <div className="bg-[var(--accent)] w-10 h-10 rounded-full flex items-center justify-center mb-10">
                <span className="material-symbols-outlined text-[var(--primary)] text-xl">spa</span>
              </div>
              <h3 className="font-headline text-2xl mb-4">Personalised Care</h3>
              <p className="text-[var(--muted-foreground)] text-sm font-light leading-relaxed">Every treatment is tailored to your unique skin type, goals, and lifestyle for truly individual results.</p>
            </div>
            <div className="p-8 bg-[var(--surface-container-low)] rounded-[2rem] border border-[var(--outline-variant)]/10">
              <div className="bg-[var(--accent)] w-10 h-10 rounded-full flex items-center justify-center mb-10">
                <span className="material-symbols-outlined text-[var(--primary)] text-xl">science</span>
              </div>
              <h3 className="font-headline text-2xl mb-4">Science & Expertise</h3>
              <p className="text-[var(--muted-foreground)] text-sm font-light leading-relaxed">Certified practitioners using safe, proven techniques and cutting-edge technology for reliable results.</p>
            </div>
            <div className="p-8 bg-[var(--surface-container-low)] rounded-[2rem] border border-[var(--outline-variant)]/10">
              <div className="bg-[var(--accent)] w-10 h-10 rounded-full flex items-center justify-center mb-10">
                <span className="material-symbols-outlined text-[var(--primary)] text-xl">energy_savings_leaf</span>
              </div>
              <h3 className="font-headline text-2xl mb-4">Holistic Wellness</h3>
              <p className="text-[var(--muted-foreground)] text-sm font-light leading-relaxed">We focus on enhancing natural beauty while promoting long-term skin health and confidence.</p>
            </div>
          </div>
        </section>

        {/* Treatment Categories */}
        <section id="treatments" className="py-24 px-6 md:px-12 bg-white">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
              <h2 className="font-headline text-4xl md:text-5xl max-w-xl">Where Care <span className="italic">Meets Innovation</span></h2>
              <p className="text-[var(--muted-foreground)] text-sm max-w-xs font-light leading-relaxed">Over 96 treatments across 16 categories, all delivered by our expert team in a calm, welcoming environment.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {treatmentCategories.map((cat) => (
                <Link
                  key={cat.name}
                  href="/book"
                  className="bg-[var(--secondary-container)]/30 rounded-[2rem] p-6 md:p-8 flex flex-col items-center text-center hover:bg-[var(--secondary-container)]/50 transition-colors group"
                >
                  <span className="material-symbols-outlined text-3xl mb-4 text-[var(--primary)] group-hover:scale-110 transition-transform">{cat.icon}</span>
                  <h3 className="font-headline text-lg md:text-xl mb-2">{cat.name}</h3>
                  <p className="text-[var(--muted-foreground)] text-xs font-light">From &pound;{cat.from}</p>
                </Link>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link href="/book" className="bg-[var(--primary)] text-white px-10 py-3 rounded-full text-sm inline-block hover:opacity-90 transition-opacity">
                View All Treatments
              </Link>
            </div>
          </div>
        </section>

        {/* Beauty Insights */}
        <section className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-headline text-4xl md:text-5xl mb-4">Beauty Insights & Wellness Tips</h2>
            <p className="text-[var(--muted-foreground)] font-light max-w-2xl mx-auto">Stay informed with expert tips, treatment insights, and beauty trends tailored for you.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {insights.map((insight) => (
              <div key={insight.title} className="group cursor-pointer">
                <div className="aspect-[16/10] rounded-2xl overflow-hidden mb-6">
                  <img alt={insight.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={insight.image} />
                </div>
                <h3 className="font-headline text-2xl mb-3">{insight.title}</h3>
                <p className="text-[var(--muted-foreground)] text-sm font-light leading-relaxed">{insight.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-20 items-center">
            <div className="lg:w-1/2">
              <h2 className="font-headline text-4xl md:text-5xl mb-6">Proof in Every Transformation</h2>
              <p className="text-[var(--muted-foreground)] font-light mb-10 max-w-md">Every glow tells a story — discover the difference expert care can make.</p>
              <div className="flex gap-4 mb-12">
                <Link href="/book" className="bg-[var(--primary)]/80 text-white px-8 py-3 rounded-full text-sm inline-block">Book a Consultation</Link>
                <a href="#treatments" className="bg-white border border-[var(--outline-variant)]/30 text-[var(--foreground)] px-8 py-3 rounded-full text-sm inline-block">Explore Treatments</a>
              </div>
              <div className="bg-[var(--surface-container-low)] p-8 rounded-2xl">
                <div className="flex text-[var(--primary)] mb-4">
                  {[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}
                </div>
                <p className="font-headline text-xl mb-6 leading-relaxed italic">&ldquo;After my microneedling session, my skin feels smoother and I finally feel confident without makeup!&rdquo;</p>
                <div>
                  <p className="font-bold text-sm">Sarah K</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Regular Client</p>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2 relative">
              <div className="rounded-[3rem] overflow-hidden aspect-square relative">
                <img alt="Treatment results" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgjqvzvGg19oNmiTMkDD4egDfkvcbha9T_Q1hec7Sz6WFoRHd6aA8HmtXGWWHU5l5VUp0U4j7idL3720UN_hkeJ3XG-H56CVYC4IibNPge4VmUWYlV2Ckl17BFE3LaSGRh2wVqwYwccNDfs1y84aROeZYZGNTx6VoIRba1AzPBAWmzNONuGkBdOgOpzeqSLGdwUa-_BXz5BRpx1kB6RzligvqCzIw0FyyIdW_Ve1JY4kuHelfh-Yr-ZPPiyL14UWG3PI6joMlVK7KC" />
              </div>
            </div>
          </div>
        </section>

        {/* Booking CTA */}
        <section className="max-w-[1440px] mx-auto px-6 md:px-12 pb-24">
          <div className="relative rounded-[3rem] overflow-hidden bg-[var(--primary)] min-h-[500px] md:min-h-[600px] flex items-center">
            <img alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvl3tZECW9SK5d18U5SbmU76TQ50kvba2UI5agPxxjfmiDqtf4WYKRdz0Ko0YGVzxwEOE9BiWm-LfEXpHfiofPFvLRP9suQ9A4cPRPayumoegCaVO_WobnJ_VcPykBbor20IK2_P_3wSv4O97JzjwgpS9A9lGMhwRn7EmDVv0Ft3jn46sMD0bD9_R32H_A_voqFQ7qhgmVPe69bxa3I-2TVTehuu9Go4F1W4jez_Ee9C6PZtEX1uZCVWSJcxdO3Ahg8ziubLl-DksN" />
            <div className="relative z-10 w-full px-6 md:px-12 py-12 flex flex-col items-center">
              <div className="bg-white/95 backdrop-blur-md rounded-[2.5rem] p-8 md:p-12 max-w-3xl w-full">
                <h2 className="font-headline text-3xl md:text-4xl mb-4">Book an <span className="italic">Appointment</span></h2>
                <p className="text-[var(--muted-foreground)] text-sm font-light mb-8">Choose your treatment and we&apos;ll take care of the rest.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--muted-foreground)]">Full Name</label>
                    <input className="w-full bg-[var(--surface-container-low)] border-none rounded-xl px-4 py-3 text-sm placeholder:text-[var(--outline)]" placeholder="e.g. John Smith" type="text" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--muted-foreground)]">Email</label>
                    <input className="w-full bg-[var(--surface-container-low)] border-none rounded-xl px-4 py-3 text-sm placeholder:text-[var(--outline)]" placeholder="you@example.com" type="email" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--muted-foreground)]">Phone Number</label>
                    <input className="w-full bg-[var(--surface-container-low)] border-none rounded-xl px-4 py-3 text-sm placeholder:text-[var(--outline)]" placeholder="e.g. 07700 123456" type="tel" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--muted-foreground)]">Treatment</label>
                    <select className="w-full bg-[var(--surface-container-low)] border-none rounded-xl px-4 py-3 text-sm text-[var(--muted-foreground)]">
                      <option>Select a treatment</option>
                      <option>Anti-Wrinkle Treatment</option>
                      <option>Dermal Fillers</option>
                      <option>Skin Boosters</option>
                      <option>Laser Hair Removal</option>
                      <option>Chemical Peel</option>
                      <option>Microneedling</option>
                      <option>IV Therapy</option>
                      <option>Facial</option>
                      <option>Consultation</option>
                    </select>
                  </div>
                </div>
                <Link href="/book" className="bg-[var(--primary)] text-white px-12 py-4 rounded-full text-sm uppercase tracking-widest hover:opacity-90 transition-opacity inline-block">
                  Book Online
                </Link>
              </div>
              <div className="mt-16 flex items-center justify-center gap-4 text-white">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                  <span className="material-symbols-outlined text-3xl">spa</span>
                </div>
                <div className="text-3xl font-headline italic">Dr Skin Central</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[var(--accent)]/30 py-24 px-6 md:px-12">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-16">
          <div className="md:col-span-4 space-y-8">
            <div className="text-3xl font-headline italic text-[var(--primary)]">Dr Skin Central</div>
            <p className="text-[var(--muted-foreground)] text-sm font-light leading-relaxed max-w-xs">
              Personalised aesthetic and wellness treatments tailored to you, delivered by expert practitioners in Ipswich.
            </p>
          </div>
          <div className="md:col-span-2 space-y-6">
            <h4 className="text-[10px] uppercase tracking-widest font-bold text-[var(--foreground)]">Navigation</h4>
            <ul className="space-y-4">
              <li><a className="text-[var(--muted-foreground)] text-sm hover:text-[var(--primary)] transition-colors" href="#home">Home</a></li>
              <li><a className="text-[var(--muted-foreground)] text-sm hover:text-[var(--primary)] transition-colors" href="#about">About</a></li>
              <li><a className="text-[var(--muted-foreground)] text-sm hover:text-[var(--primary)] transition-colors" href="#treatments">Treatments</a></li>
              <li><a className="text-[var(--muted-foreground)] text-sm hover:text-[var(--primary)] transition-colors" href="#testimonials">Testimonials</a></li>
              <li><Link className="text-[var(--muted-foreground)] text-sm hover:text-[var(--primary)] transition-colors" href="/book">Book Online</Link></li>
            </ul>
          </div>
          <div className="md:col-span-3 space-y-6">
            <div className="space-y-4">
              <h4 className="text-[10px] uppercase tracking-widest font-bold text-[var(--foreground)]">Address</h4>
              <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">42 Harley Street<br />Ipswich, Suffolk<br />IP1 3QH</p>
            </div>
            <div className="space-y-4 pt-4">
              <h4 className="text-[10px] uppercase tracking-widest font-bold text-[var(--foreground)]">Phone</h4>
              <p className="text-[var(--muted-foreground)] text-sm">+44 20 7946 0958</p>
            </div>
          </div>
          <div className="md:col-span-3 space-y-6">
            <h4 className="text-[10px] uppercase tracking-widest font-bold text-[var(--foreground)]">Quick Links</h4>
            <ul className="space-y-4">
              <li><Link className="text-[var(--muted-foreground)] text-sm hover:text-[var(--primary)] transition-colors" href="/login">Client Login</Link></li>
              <li><Link className="text-[var(--muted-foreground)] text-sm hover:text-[var(--primary)] transition-colors" href="/login">Staff Login</Link></li>
              <li><Link className="text-[var(--muted-foreground)] text-sm hover:text-[var(--primary)] transition-colors" href="/book">Book Appointment</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-[1440px] mx-auto mt-16 pt-8 border-t border-[var(--outline-variant)]/30">
          <p className="text-[var(--muted-foreground)] text-xs font-light text-center">&copy; 2026 Dr Skin Central. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

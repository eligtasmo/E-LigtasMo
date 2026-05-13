import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-[120px] md:py-[180px]">
        <div className="flex flex-col items-center max-w-7xl mx-auto">
          {/* Logo */}
          <div className="mb-6 animate-fade-in">
            <div className="w-[84px] h-[84px] bg-brand-500 rounded-[10px] flex items-center justify-center text-white font-black text-5xl shadow-xl">E</div>
          </div>

          {/* Badge */}
          <div className="flex items-center gap-2 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-fuel)]" />
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--color-fuel)] font-satoshi">
              Crowdsourced · Real-time · Accurate
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-fuel)]" />
          </div>

          {/* Main Title */}
          <h1 className="hero-heading mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Protect your community<br />
            <span style={{ color: 'color-mix(in srgb, var(--color-fuel) 72%, var(--color-text) 28%)' }}>
              before the storm.
            </span>
          </h1>

          {/* Description */}
          <p className="max-w-[510px] text-[clamp(1rem,2vw,1.18rem)] leading-[1.72] text-[var(--color-muted)] mb-10 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            E-LigtasMo lets citizens submit live hazard reports, browse flood maps, and find safe routes — powered by Santa Cruz, for Santa Cruz.
          </p>

          {/* Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-[520px] animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Link to="/auth/register" className="no-underline">
              <span className="flex items-center justify-center gap-2 w-full px-6 py-4 rounded-[12px] bg-[var(--color-fuel)] text-[var(--color-on-fuel)] font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all font-satoshi">
                Start for free <span className="text-lg">→</span>
              </span>
            </Link>
            <a href="#how-it-works" className="flex items-center justify-center w-full px-6 py-4 rounded-[12px] border border-[var(--color-border)] text-[var(--color-text)] font-medium text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-all font-satoshi">
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="relative z-10 max-w-[1100px] mx-auto px-12 py-20">
        <div className="grid md:grid-cols-2 gap-20 items-center">
          <div className="animate-fade-in">
            <div className="flex items-center gap-2.5 mb-3.5">
              <span className="w-[22px] h-px bg-[var(--color-fuel)] block" />
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-fuel)]">How it works</span>
            </div>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-black leading-[1.08] tracking-[-0.03em] mb-3.5">
              Three steps to tactical safety
            </h2>
            <p className="text-[0.96rem] leading-[1.72] text-[var(--color-muted)] max-w-[380px] mb-10">
              Join a community of responders making every storm safer, one report at a time.
            </p>

            <div className="space-y-0">
              {[
                { id: '01', title: 'Submit a report', desc: 'Spot a hazard? Log the location in seconds. Each report keeps the community informed and saves lives.' },
                { id: '02', title: 'Browse the live map', desc: 'Color-coded pins show safe zones, flood areas, and active hazards in real time. Green means safe.' },
                { id: '03', title: 'Find safe routes', desc: 'Enter your destination — E-LigtasMo calculates the safest route using live hazard data along the way.' }
              ].map((step, i) => (
                <div key={step.id} className="flex gap-5 py-5.5 border-b border-[var(--color-border)] last:border-none">
                  <span className="text-[11px] font-black text-[var(--color-fuel)] tracking-[0.12em] min-w-[28px] mt-1">{step.id}</span>
                  <div>
                    <h3 className="text-base font-bold mb-1.5">{step.title}</h3>
                    <p className="text-[0.86rem] leading-[1.65] text-[var(--color-muted)]">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Map Mockup */}
          <div className="relative rounded-[20px] overflow-hidden h-[430px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(0,232,122,0.07)_0%,transparent_55%),radial-gradient(circle_at_72%_68%,rgba(255,184,0,0.05)_0%,transparent_50%)]" />
            
            {/* SVG Grid Lines */}
            <svg viewBox="0 0 400 430" className="absolute inset-0 w-full h-full opacity-10">
              <line x1="0" y1="168" x2="400" y2="185" stroke="var(--color-fuel)" strokeWidth="2" />
              <line x1="0" y1="290" x2="400" y2="265" stroke="var(--color-fuel)" strokeWidth="1.5" />
              <line x1="135" y1="0" x2="160" y2="430" stroke="var(--color-fuel)" strokeWidth="1.5" />
              <path d="M0,105 Q200,85 400,142" stroke="var(--color-fuel)" strokeWidth="1" fill="none" />
            </svg>

            {/* Tactical Pins */}
            {[
              { top: '20%', left: '17%', color: 'var(--color-fuel)', label: 'Safe Zone' },
              { top: '34%', left: '51%', color: 'var(--color-amber)', label: 'Flood Level 1', pulse: true },
              { top: '59%', left: '27%', color: 'var(--color-fuel)', label: 'Shelter' },
              { top: '21%', left: '70%', color: 'var(--color-danger)', label: 'Critical Hazard' }
            ].map((pin, i) => (
              <div key={i} className="absolute flex flex-col items-center" style={{ top: pin.top, left: pin.left }}>
                {pin.pulse && <span className="absolute inset-0 rounded-full border-2 border-[var(--color-fuel)] animate-ping" />}
                <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[10px] px-3 py-1.5 text-[12px] font-medium shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: pin.color }} />
                  {pin.label}
                </div>
                <div className="w-0.5 h-2" style={{ background: pin.color }} />
                <div className="w-1.5 h-1.5 rounded-full border-2" style={{ borderColor: pin.color }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 max-w-[1100px] mx-auto px-12 py-20">
        <div className="mb-11 animate-fade-in">
          <div className="flex items-center gap-2.5 mb-3.5">
            <span className="w-[22px] h-px bg-[var(--color-fuel)] block" />
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-fuel)]">Features</span>
          </div>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-[-0.03em]">
            Everything a tactical responder needs
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0.5 bg-[var(--color-border)] rounded-[20px] overflow-hidden border border-[var(--color-border)]">
          {[
            { title: 'Live Hazard Map', desc: 'Community-updated alerts on an interactive map, refreshed within seconds of any change.' },
            { title: 'Safe Route Planner', desc: 'Set your destination and get the safest path instantly, avoiding active flood zones.' },
            { title: 'Strategic Alerts', desc: 'Track how hazards shift over time. Know exactly when it is safe to move.' },
            { title: 'Earn Badges', desc: 'Submit reports, verify alerts, and unlock exclusive tactical community perks.' },
            { title: 'Emergency Dispatch', desc: 'Direct connection to local responders the moment a critical hazard is reported.' },
            { title: 'Family Garage', desc: 'Save multiple locations and family members, track their safety status in one tap.' }
          ].map((feature, i) => (
            <div key={i} className="group bg-[var(--color-surface)] p-9 relative overflow-hidden h-full hover:bg-[var(--color-bg)] transition-colors animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--color-fuel)] to-transparent origin-left scale-x-0 group-hover:scale-x-100 transition-transform" />
              <h3 className="text-[1.05rem] font-bold mb-2">{feature.title}</h3>
              <p className="text-[0.85rem] leading-[1.65] text-[var(--color-muted)]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Community Section */}
      <section className="relative z-10 max-w-[1100px] mx-auto px-12 py-20 mb-20">
        <div className="bg-[var(--color-surface)] rounded-[22px] p-[72px_64px] relative overflow-hidden border border-[var(--color-border)] animate-fade-in">
          <div className="absolute top-[-50px] right-[-50px] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(0,232,122,0.08)_0%,transparent_70%)] blur-[40px]" />
          <div className="grid md:grid-cols-2 gap-15 items-center relative z-10">
            <div>
              <div className="flex items-center gap-2.5 mb-3.5">
                <span className="w-[22px] h-px bg-[var(--color-fuel)] block" />
                <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-fuel)]">Community & Rewards</span>
              </div>
              <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-black tracking-[-0.03em] mb-3.5">
                Protect. Report.<br />Level up.
              </h2>
              <p className="text-[0.94rem] leading-[1.72] text-[var(--color-muted)] mb-9 max-w-[360px]">
                Every hazard you report keeps the community informed — and earns you points toward tactical badges.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[14px] p-4 text-center hover:border-[var(--color-fuel)] transition-colors">
                    <div className="w-6 h-6 bg-[var(--color-fuel)]/10 rounded-full mx-auto mb-2 flex items-center justify-center text-[var(--color-fuel)]">
                      ★
                    </div>
                    <div className="text-[9px] text-[var(--color-muted)] uppercase font-bold tracking-tighter">Level {i}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini Leaderboard */}
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[16px] overflow-hidden shadow-xl">
              <div className="p-4.5 border-b border-[var(--color-border)] text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-muted)] flex justify-between font-satoshi">
                <span>Top Responders</span>
                <span className="text-[var(--color-fuel)]">Weekly</span>
              </div>
              {[
                { name: 'Andrew Robles', pts: 140 },
                { name: 'Juan Dela Cruz', pts: 120 },
                { name: 'Maria Santos', pts: 110 }
              ].map((user, i) => (
                <div key={i} className="px-6 py-4 border-b border-[var(--color-fuel)]/5 flex items-center gap-4">
                  <span className={`font-black text-sm ${i === 0 ? 'text-yellow-500' : 'text-[var(--color-muted)]'}`}>{i + 1}</span>
                  <span className="flex-1 font-medium text-sm">{user.name}</span>
                  <span className="font-black text-sm text-[var(--color-fuel)]">{user.pts} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 max-w-[680px] mx-auto px-12 py-20 mb-20 text-center">
        <h2 className="text-[clamp(2.2rem,5vw,4rem)] font-black tracking-[-0.03em] leading-[1.05] mb-4.5">
          Stop guessing<br />at the weather.
        </h2>
        <p className="text-[1.02rem] leading-[1.72] text-[var(--color-muted)] mb-10">
          Join 180,000 citizens who know where the safest routes are before they leave the house.
        </p>
        <Link to="/auth/register">
          <span className="inline-block px-10 py-4.5 rounded-[14px] bg-[var(--color-fuel)] text-[var(--color-on-fuel)] font-bold text-base hover:opacity-90 active:scale-[0.98] transition-all">
            Create your free account →
          </span>
        </Link>
      </section>
    </div>
  );
}

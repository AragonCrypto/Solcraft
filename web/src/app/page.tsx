import { Navbar } from "@/components/layout/Navbar";
import { HeroSection } from "@/components/sections/HeroSection";
import { PitchVideoSection } from "@/components/sections/PitchVideoSection";
import { MarqueeBanner } from "@/components/sections/MarqueeBanner";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { EconomySection } from "@/components/sections/EconomySection";
import { TechSection } from "@/components/sections/TechSection";
import { FooterCTA } from "@/components/layout/FooterCTA";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <PitchVideoSection />
      <MarqueeBanner />
      <FeaturesSection />
      <EconomySection />
      <TechSection />
      <FooterCTA />
    </main>
  );
}

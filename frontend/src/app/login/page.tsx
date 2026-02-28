"use client";

import { SignIn } from "@clerk/nextjs";
import dynamic from "next/dynamic";

const HeroScene = dynamic(() => import("@/components/HeroScene"), { ssr: false });

export default function LoginPage() {
  return (
    <main className="h-screen w-full bg-[var(--bg)] flex items-center justify-center px-4 relative overflow-hidden text-[var(--text)] font-[var(--font-body)]">
      {/* Background 3D Scene */}
      <div className="absolute inset-0 z-0 opacity-80"><HeroScene /></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-[var(--bg)]/50 to-[var(--bg)] pointer-events-none" />

      {/* Clerk SignIn component — handles email, Google, all auth */}
      <div className="z-10 relative">
        <SignIn
          routing="hash"
          signUpUrl="/signup"
          appearance={{
            layout: {
              logoPlacement: "none",
            },
            variables: {
              colorPrimary: "#06B6D4", // var(--cyan)
              colorBackground: "#030712", // var(--bg) to force dark mode internally
              colorText: "#F1F5F9", // var(--text)
              colorTextSecondary: "#64748B", // var(--muted)
              colorInputBackground: "#0F172A", // Dark slate for inputs
              colorInputText: "#F1F5F9",
              borderRadius: "16px",
              fontFamily: "Outfit, system-ui, sans-serif",
            },
            elements: {
              card: "shadow-2xl shadow-black/80 border border-[rgba(255,255,255,0.08)] bg-[#030712]/80 backdrop-blur-2xl",
              headerTitle: "text-[var(--text)] font-[var(--font-display)] font-bold text-xl",
              headerSubtitle: "text-[var(--muted)]",
              socialButtonsBlockButton: "border border-[rgba(255,255,255,0.08)] hover:border-[rgba(6,182,212,0.4)] transition-all text-white",
              formButtonPrimary: "bg-[linear-gradient(135deg,#06B6D4,#7C3AED)] hover:opacity-90 transition-all shadow-lg shadow-[#06B6D4]/20 text-white border-0",
              footerActionLink: "text-[var(--cyan)] hover:text-[#7C3AED]",
              formFieldInput: "bg-[#0F172A] border-[rgba(255,255,255,0.1)] text-white focus:border-[var(--cyan)]",
              formFieldLabel: "text-[var(--muted)]",
              phoneInputBox: "bg-[#0F172A] border-[rgba(255,255,255,0.1)] text-white",
              dividerLine: "bg-[rgba(255,255,255,0.1)]",
              dividerText: "text-[var(--muted)]"
            },
          }}
        />
      </div>
    </main>
  );
}

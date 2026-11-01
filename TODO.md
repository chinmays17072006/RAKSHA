# RAKSHA — Phase 0 outcomes

## 1. Application foundation and extensible structure — Complete
- Create a modern web application suitable for a disaster-response operations center using React, Vite, Tailwind CSS or high-quality CSS, Lucide icons, clean component architecture, and responsive desktop/tablet/mobile layouts.
- Use a structure that will allow future phases to be added without rewriting the application. Create reusable components and centralized data/state architecture. Avoid unnecessary dependencies.
- The application must start without errors, have clean navigation, no broken buttons in the implemented area, no obvious console errors, consistent spacing and typography, professional animations, accessible contrast, reusable components, and clean code organization. Do not over-engineer or create unnecessary backend infrastructure at this stage.
- This is a limited-credit hackathon build: prioritize a working application, premium UI, clean architecture, reusable components, and future extensibility. Do not repeatedly rewrite working code.

## 2. RAKSHA brand and command-center visual system — Complete
- Use the product name RAKSHA only; never use “RAKSHA-NET”. Branding: RAKSHA — AI DISASTER INTELLIGENCE. Subtitle: AI DISASTER INTELLIGENCE. Tagline: PREDICT. PRIORITIZE. ROUTE. RESCUE.
- Communicate emergency operations, disaster intelligence, geospatial awareness, AI-assisted decision making, professional command center, reliability, and speed. Do not make the interface look like a generic admin dashboard.
- Use a premium dark command-center interface: very dark charcoal / near-black primary background and dark navy/charcoal panels. Use a geometric heading font similar to Space Grotesk and clean body font similar to Inter or DM Sans.
- Keep emergency colors restrained: white/off-white primary text; muted blue primary interface; cyan/blue live technology indicators; amber warning; red critical emergency; green safe/available. Avoid rainbow colors, excessive gradients, cartoon graphics, huge rounded cards, excessive glassmorphism, generic Bootstrap styling, and template-looking UI. Use subtle borders, shadows, spacing, and motion.

## 3. Permanent application shell, navigation, and top bar — Complete
- Create the permanent application shell with a RAKSHA logo/wordmark at the top of a left sidebar.
- Include sidebar navigation in this order: Command Center; Live Incidents; Rescue Operations; Shelters & Resources; Citizen SOS; Offline Mode. For now only Command Center is implemented. Other items may be disabled/placeholder destinations but must look intentional and professional.
- At the bottom of the sidebar show “● SYSTEM OPERATIONAL”.
- Top bar must include RAKSHA, AI DISASTER INTELLIGENCE, current page COMMAND CENTER, “● LIVE MONITORING”, operations-center status OPERATIONAL, current date/time display, and a user/operator profile area.
- The sidebar must adapt appropriately on smaller screens; implement the Command Center as the working destination.

## 4. Phase 0 Command Center placeholder — Complete
- The Command Center page must contain clearly separated areas for HEADER / EMERGENCY STATUS, KPI AREA, LIVE DISASTER MAP AREA, PRIORITY INCIDENTS, RESCUE OPERATIONS STATUS, and SYSTEM / NETWORK STATUS.
- These areas may contain realistic placeholder/demo content. Do not implement the complete disaster map or rescue logic yet.
- Keep the current build limited to PHASE 0 — FOUNDATION & DESIGN SYSTEM. Do not implement Citizen SOS, AI Triage, Rescue Operations, Offline Mode, or other advanced features yet. Do not automatically build Phase 1 or later phases.

## 5. Centralized simulated domain models and demo scenario — Complete
- Create centralized demo data structures for future phases and models/interfaces/data structures for Incident, RescueTeam, Shelter, Resource, Road, DisasterZone, and SOSRequest.
- Use realistic simulated data and do not use real people's personal information.
- Primary demo scenario: Incident ID #1042; Type: Flash Flood; Location: Sector 04; People: 4; Vulnerable person: 1 elderly person. Example message: “Water has entered our house. Four people are trapped inside. My grandmother is with us and cannot walk.” This data will be used in later phases.

## 6. Reusable interface components and feedback states — Complete
- Create reusable components for Buttons; Cards; KPI cards; Status badges; Emergency severity badges; Navigation items; Modal/dialog; Toast notifications; Loading indicators; Empty states; Error states; Section headers; Data tables; Timeline items; and Progress indicators.
- Critical actions should have clear visual feedback. Do not leave broken controls in the implemented area.

## 7. Responsive, accessible experience — Complete
- The application must work on desktop, laptop, tablet, and mobile. Desktop is the primary hackathon presentation target.
- Do not allow horizontal overflow. The sidebar should adapt appropriately on smaller screens. Maintain accessible contrast, consistent typography, and professional motion.

## 8. Future-phase boundaries and Phase 0 handoff — Complete
- Keep the project structure ready to add the following without major restructuring: PHASE 1 Command Center; PHASE 2 Citizen SOS; PHASE 3 AI Triage; PHASE 4 Safe Evacuation Routing; PHASE 5 Rescue Operations; PHASE 6 Shelters & Resources; PHASE 7 Offline-First Resilience; PHASE 8 End-to-End Demo Mode; PHASE 9 Integration & Polish; PHASE 10 Judge Demo Optimization.
- Do NOT implement these phases now. Stop after Phase 0. At completion, provide a short implementation summary and identify any errors that need fixing before Phase 1.

## Phase 0 handoff

TypeScript checks and static production build pass. The home route returns HTTP 200, `/manus-routes.json` returns the expected JSON, and the RAKSHA SVG favicon and browser-safe platform config endpoint return HTTP 200. Desktop and mobile layouts were visually checked. No blocking errors remain before Phase 1.

Known non-blocking build warning: Vite notes that the starter's classic `/api/platform/config.js` script is intentionally external to the module bundle. Changing it to a module causes Vite to fail resolving the dynamic platform endpoint, so the working classic-script behavior is preserved.

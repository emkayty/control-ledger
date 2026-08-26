import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "en" | "ha";

const copy = {
  en: {
    language: "Language",
    english: "English",
    hausa: "Hausa",
    controlDesk: "Control desk",
    receivables: "Receivables",
    evidenceIntake: "Evidence intake",
    operations: "Operations",
    collections: "Collections",
    ledger: "Ledger",
    variances: "Variances",
    peopleAccess: "People & access",
    auditTrail: "Audit trail",
    operationsControl: "Operations control",
    scopedWorkspace: "Scoped workspace",
    signOut: "Sign out",
    varianceCentre: "Variance centre",
    accountableDiscrepancyControl: "Accountable discrepancy control",
    outstandingCases: "Outstanding cases",
    awaitingIndependentDecision: "awaiting an independent decision",
    varianceIntro: "Track the value, evidence, investigation, proposal, and independent decision for each outstanding discrepancy. A resolution is never applied automatically.",
    openValue: "Open value",
    derivedUnresolved: "Derived from unresolved scoped cases",
    decisionQueue: "Decision queue",
    awaitingApprovalReturn: "Awaiting independent approval or return",
    varianceQueue: "Variance queue",
    openWork: "Open work",
    awaitingDecision: "Awaiting decision",
    resolved: "Resolved",
    allCases: "All cases",
    noCasesHere: "No cases in this view",
    changeQueueFilter: "Change the queue filter or record an evidence mismatch through the controlled workflow.",
    selectVariance: "Select a variance to inspect it",
    detailTrail: "The detail panel keeps investigation and independent decisions in one accountable trail.",
    valueImpact: "Value impact",
    latestProposedResolution: "Latest proposed resolution",
    noResolutionSubmitted: "No resolution proposal has been submitted. Add investigation notes first, then submit a genuine proposal for independent review.",
    aiAssistant: "AI investigation assistant",
    aiDisabled: "AI variance assistance is disabled for this organisation.",
    aiEnabled: "AI variance assistance is enabled for this organisation.",
    aiOwnerOnly: "An organisation owner can review the processing notice and decide whether to enable this optional feature.",
    aiProposalOnly: "AI suggestion only — review evidence; no action has been taken.",
    aiProcessingNotice: "A requested analysis sends only this variance’s control attributes and a short same-branch candidate list to the configured AI processor. It does not send receipt files, storage links, customer contacts, investigation notes, or unrelated branch records.",
    aiEnableNotice: "I understand that enabling AI variance assistance permits authorised users to request proposal-only analysis of minimised variance and candidate metadata. I will review every suggestion against evidence; it cannot settle, reconcile, resolve, post, or approve anything.",
    reviewNotice: "Review processing notice",
    enableAssistance: "Enable AI assistance",
    disableAssistance: "Disable AI assistance",
    requestAnalysis: "Request AI suggestions",
    analysing: "Analysing controlled data…",
    recentSuggestions: "Recent AI suggestions",
    noSuggestions: "No AI suggestion has been requested for this variance.",
    potentialCauses: "Potential causes",
    possibleMatches: "Possible matching entries",
    reviewSteps: "Human review steps",
    confidence: "Confidence",
    model: "Model",
    generated: "Generated",
    noCandidateMatch: "No candidate reference was suggested.",
    notAction: "AI output does not create a resolution proposal or prefill the decision workflow.",
    dashboardEvidenceTitle: "Decide from evidence, not assumptions.",
    dashboardEvidenceCopy: "A scoped view of receivable position, recorded proof, deterministic matching, and operational exceptions.",
    reconciliationCoverage: "Reconciliation coverage",
    receivablePosition: "Receivable position",
    reconciledValue: "Reconciled value",
    needsAttention: "Needs attention",
    todayControlRun: "Today’s control run",
    controlChain: "Source fact → evidence → decision → governed consequence.",
    priorityExceptions: "Priority exceptions",
  },
  ha: {
    language: "Harshe",
    english: "Turanci",
    hausa: "Hausa",
    controlDesk: "Wurin kula da aiki",
    receivables: "Kuɗaɗen karɓa",
    evidenceIntake: "Shigar da shaida",
    operations: "Ayyuka",
    collections: "Tattara kuɗi",
    ledger: "Ledger (rijistar lissafi)",
    variances: "Bambance-bambance",
    peopleAccess: "Mutane da izini",
    auditTrail: "Tarihin bincike (audit trail)",
    operationsControl: "Kula da ayyuka",
    scopedWorkspace: "Wurin aiki mai iyaka",
    signOut: "Fita",
    varianceCentre: "Cibiyar bambanci",
    accountableDiscrepancyControl: "Kula da bambanci mai alhaki",
    outstandingCases: "Lamuran da ba a rufe ba",
    awaitingIndependentDecision: "suna jiran yanke hukunci mai zaman kansa",
    varianceIntro: "Bi ƙima, shaida, bincike, shawarar warwarewa, da yanke hukunci mai zaman kansa ga kowane bambanci da bai rufe ba. Ba a aiwatar da warwarewa kai tsaye.",
    openValue: "Ƙimar da ke buɗe",
    derivedUnresolved: "An samo daga lamuran wannan reshe da ba a warware ba",
    decisionQueue: "Jerin yanke hukunci",
    awaitingApprovalReturn: "Ana jiran amincewa mai zaman kanta ko mayarwa",
    varianceQueue: "Jerin bambance-bambance",
    openWork: "Aikin da ke buɗe",
    awaitingDecision: "Ana jiran hukunci",
    resolved: "An warware",
    allCases: "Dukkan lamura",
    noCasesHere: "Babu lamari a wannan gani",
    changeQueueFilter: "Canza matatar jerin ko rubuta bambancin shaida ta hanyar aikin kulawa.",
    selectVariance: "Zaɓi bambanci domin a bincika",
    detailTrail: "Bangaren bayani yana ajiye bincike da yanke hukunci mai zaman kansa a hanya guda mai alhaki.",
    valueImpact: "Tasirin ƙima",
    latestProposedResolution: "Sabuwar shawarar warwarewa",
    noResolutionSubmitted: "Ba a gabatar da shawarar warwarewa ba. Da farko ƙara bayanan bincike, sannan gabatar da sahihiyar shawara domin duba mai zaman kansa.",
    aiAssistant: "Mataimakin bincike na AI",
    aiDisabled: "An kashe taimakon AI don bambance-bambance a wannan ƙungiya.",
    aiEnabled: "An kunna taimakon AI don bambance-bambance a wannan ƙungiya.",
    aiOwnerOnly: "Mai ƙungiya ne kawai zai duba sanarwar sarrafawa kuma ya yanke shawarar kunna wannan zaɓin fasali.",
    aiProposalOnly: "Shawarar AI kawai — a duba shaida; ba a ɗauki wani mataki ba.",
    aiProcessingNotice: "Binciken da aka nema zai aika kawai da bayanan kula na wannan bambanci da ɗan jerin masu yiwuwar dacewa daga wannan reshe zuwa mai sarrafa AI. Ba ya aika fayilolin rasit, hanyoyin ajiya, bayanan tuntuɓar kwastoma, bayanan bincike, ko bayanan wani reshe.",
    aiEnableNotice: "Na fahimci cewa kunna taimakon AI yana bai wa masu izini damar neman bincike na shawara kawai daga taƙaitattun bayanan bambanci da masu yiwuwar dacewa. Zan duba kowace shawara da shaida; ba zai iya daidaitawa, biyan bashi, warwarewa, wallafawa, ko amincewa da komai ba.",
    reviewNotice: "Duba sanarwar sarrafawa",
    enableAssistance: "Kunna taimakon AI",
    disableAssistance: "Kashe taimakon AI",
    requestAnalysis: "Nemi shawarwarin AI",
    analysing: "Ana nazarin bayanan kulawa…",
    recentSuggestions: "Sabbin shawarwarin AI",
    noSuggestions: "Ba a nemi shawarar AI ga wannan bambanci ba.",
    potentialCauses: "Dalilan da za su iya faruwa",
    possibleMatches: "Masu yiwuwar daidaituwar bayanai",
    reviewSteps: "Matakan dubawar mutum",
    confidence: "Amincewa",
    model: "Samfurin AI",
    generated: "An samar",
    noCandidateMatch: "Ba a ba da shawarar wani bayani mai dacewa ba.",
    notAction: "Sakamakon AI ba ya ƙirƙirar shawarar warwarewa ko cike tsarin yanke hukunci da kansa.",
    dashboardEvidenceTitle: "Yanke hukunci daga shaida, ba zato ba.",
    dashboardEvidenceCopy: "Gani mai iyaka na kuɗaɗen karɓa, hujjar da aka rubuta, daidaitawa mai ƙa'ida, da lamuran aiki.",
    reconciliationCoverage: "Rabon daidaitawa",
    receivablePosition: "Matsayin kuɗaɗen karɓa",
    reconciledValue: "Ƙimar da aka daidaita",
    needsAttention: "Na buƙatar kulawa",
    todayControlRun: "Aikin kula na yau",
    controlChain: "Bayanan asali → shaida → hukunci → sakamako mai kulawa.",
    priorityExceptions: "Muhimman lamuran banbanci",
  },
} as const;

export type TranslationKey = keyof typeof copy.en;

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const languageStorageKey = "control-ledger.language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    try {
      return window.localStorage.getItem(languageStorageKey) === "ha" ? "ha" : "en";
    } catch {
      return "en";
    }
  });
  useEffect(() => {
    try { window.localStorage.setItem(languageStorageKey, language); } catch { /* Browser storage may be unavailable. */ }
    document.documentElement.lang = language;
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: (key: TranslationKey) => copy[language][key] }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider.");
  return context;
}

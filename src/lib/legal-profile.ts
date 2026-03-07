export type LegalLocale = "ja" | "en"

const legalOperatorProfile = {
  operatorName: "",
  representativeName: "",
  postalAddress: "",
  phoneNumber: "",
  supportEmail: "",
  privacyRequestEmail: "",
  supportHours: "",
}

const fallbackByField = {
  operatorName: {
    ja: "公開前に入力してください",
    en: "Fill this in before launch",
  },
  representativeName: {
    ja: "公開前に入力してください",
    en: "Fill this in before launch",
  },
  postalAddress: {
    ja: "公開前に入力してください",
    en: "Fill this in before launch",
  },
  phoneNumber: {
    ja: "公開前に入力してください",
    en: "Fill this in before launch",
  },
  supportEmail: {
    ja: "公開前に入力してください",
    en: "Fill this in before launch",
  },
  privacyRequestEmail: {
    ja: "公開前に入力してください",
    en: "Fill this in before launch",
  },
  supportHours: {
    ja: "公開前に入力してください",
    en: "Fill this in before launch",
  },
} satisfies Record<keyof typeof legalOperatorProfile, Record<LegalLocale, string>>

const readLegalField = (
  key: keyof typeof legalOperatorProfile,
  locale: LegalLocale
) => {
  const value = legalOperatorProfile[key].trim()
  return value || fallbackByField[key][locale]
}

export const getLegalOperatorProfile = (locale: LegalLocale) => ({
  serviceName: "Branch",
  operatorName: readLegalField("operatorName", locale),
  representativeName: readLegalField("representativeName", locale),
  postalAddress: readLegalField("postalAddress", locale),
  phoneNumber: readLegalField("phoneNumber", locale),
  supportEmail: readLegalField("supportEmail", locale),
  privacyRequestEmail: readLegalField("privacyRequestEmail", locale),
  supportHours: readLegalField("supportHours", locale),
})

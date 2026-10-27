/** HOME defaults to real data. Demo is an explicit, saved choice in Más. */
const DEMO_ON_BY_DEFAULT = false

const override = process.env.NEXT_PUBLIC_HOME_V2_DEMO_DEFAULT?.trim().toLowerCase()

export const HOME_V2_DEMO_DEFAULT_ON: boolean =
  override === undefined || override === ""
    ? DEMO_ON_BY_DEFAULT
    : !["0", "off", "false", "no"].includes(override)

/**
 * HOME V2 build-time configuration.
 *
 * TEMPORARY (development): the demonstration mode starts ON for visitors who
 * have not chosen yet, so the whole product can be reviewed without a device.
 *
 * Before launching to real users, turn the automatic start OFF with either:
 *   - the environment variable  NEXT_PUBLIC_HOME_V2_DEMO_DEFAULT=off  (no code change), or
 *   - the constant below set to `false`.
 *
 * Whatever the default, a visitor's own choice (Más → Modo demostración) is saved
 * and always wins. This only decides what happens when nothing has been chosen.
 */
const DEMO_ON_BY_DEFAULT = true

const override = process.env.NEXT_PUBLIC_HOME_V2_DEMO_DEFAULT?.trim().toLowerCase()

export const HOME_V2_DEMO_DEFAULT_ON: boolean =
  override === undefined || override === ""
    ? DEMO_ON_BY_DEFAULT
    : !["0", "off", "false", "no"].includes(override)

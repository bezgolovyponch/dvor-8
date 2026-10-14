// REQUIREMENT (the creator, verbatim): "The sky is the v6 design: one blue with designed clouds." And: "Dithering only
// in the sky's horizon band."
//
// So the sky is DESIGNED, never the photograph's: one plane, a horizon band, designed clouds. The photograph supplies
// only where the sky is.
export const SKY_TONE = [88, 154, 226];
export const BAND_TONE = [214, 232, 244];
export const CLOUD_TONES = [[250, 250, 252], [232, 236, 244], [198, 214, 232]];

/** The predicate the checker runs: the drawn sky must be one tone owning its band, and it must be blue. */
export function predicate(measure) {
  return !!measure && measure.skyShare >= 0.35 && measure.skyBlue;
}

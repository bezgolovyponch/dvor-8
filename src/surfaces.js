// What the picture is made of, as far as anything needs to know.
//
// THIS FILE USED TO BE LARGER AND CLAIMED MORE. It held a material classifier — colour and texture
// statistics that decided whether a pixel was foliage, asphalt, wall or earth — and a geometric sky-and-ground
// finder, and a dither-pattern table per material. None of it is reachable any more, and the reason is a
// measurement rather than a change of mind: on the courtyard photograph, TREE and BENCH differ by 4.4 in
// colour spread and 0.7 in local texture, and ASPHALT and TREE overlap on both, so a classifier built on
// those statistics put the bench in the trees and the trees in "unknown". The numbers are in
// docs/environment-transfer.md. Only SKY has a signature clean enough to find, and it is clean only because
// it is unoccluded.
//
// So there are two entries, not six, and they answer the only question the rest of the game asks: may this
// pixel be painted, and may a window be looked for here. Everything else the old file tried to name was
// guessed, and a guess that is written down as a fact is worse than no answer.
//
// The styled picture carries one of these per pixel in `st.surfaces.what`, and `flat.js` — which actually
// knows, because it chose the ramp — is where the value comes from.

export const SURFACES = ['sky', 'other'];
export const SKY = 0;
export const OTHER = 1;

/** The surface a palette ramp name denotes. `flat.js` names its ramps; this maps those names to surfaces. */
export const surfaceOfRamp = (name) => (name === 'sky' ? SKY : OTHER);

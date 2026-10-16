# The render policy: which classes are DESIGNED and which are FAITHFUL

The reason the build does not look like v6, stated as one table. v6 designs what the photograph says nothing about
and copies what it says everything about; this project copied everything, which is why a grey sky stayed grey and a
wall kept its photographic texture under the windows.

| class | policy | why | how it is verified |
|---|---|---|---|
| **sky** | **DESIGN** | a sky has no layout worth preserving - clouds move, and the photograph's own overcast grey carries no information | the sky band is one BLUE plane with designed clouds (the v9 rule): at most 10 colours in the band, one tone owning >= 40%, and the dominant tone blue-ish |
| **facade wall** | **DESIGN** | the wall is what the windows hang on; its photographic grain fights the window sprites and reads as blur | the wall is a plane: its own flat share >= 70% and at most 6 palette entries, with the lit and turned-away faces two tones apart |
| **windows** | **DESIGN** (sprites) | v6's own construction: frame, glass, sill | window sprites present and aligned to the facade's pitch |
| **road, kerbs, markings** | **FAITHFUL** | R14: the photograph's own layout, only pixelated - a lane marking stays where it is | >= 8 palette entries on the road, the layout unmoved |
| **ground, pavement, vegetation** | **FAITHFUL** | the photograph's own greenery must survive (F12: it was being eaten) | foliage pixels present exactly where the photograph has green, none where it does not |
| **vehicles, people, street furniture** | **FAITHFUL + one outline** | v9's verdict: *"photo pixels plus one shared outline"*; the cartoon template is REJECTED | things cut out, their own pixels kept, one 1-px outline in the darkest entry |

**The rule that follows, and that this project kept breaking:** *a class is designed only when the photograph
carries no layout for it.* Where the photograph carries layout - the road, the markings, the cars, the people, the
green - fidelity is mandatory; where it carries none - the sky - design is mandatory. A wall is the interesting
case and belongs to DESIGN, because its layout is the WINDOW GRID, which is drawn as sprites; the grain behind it
is noise, not layout.

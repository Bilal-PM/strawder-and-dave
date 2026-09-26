"""Ground registrations (grass family and soft ground)."""
from sets import tileset, emit_tiles
import grass


@tileset('lawn', group='grass')
def _lawn(out, man, pv):
    v, w = grass.lawn_variants(); emit_tiles(out, man, 'lawn', v, w, pv)


@tileset('grass', group='grass')
def _grass(out, man, pv):
    v, w = grass.grass_variants(); emit_tiles(out, man, 'grass', v, w, pv)


@tileset('meadow', group='grass')
def _meadow(out, man, pv):
    v, w = grass.meadow_variants(); emit_tiles(out, man, 'meadow', v, w, pv)

# Icy Companion — Custom Emoji Prompt

Use the existing custom emojis from the server's `/bot-info` panel as **visual
references only** for the overall friendliness, silhouette clarity, and line
weight. Do not trace them, copy their shapes, or reproduce their exact
composition. The new set should feel like an original Icy Companion identity.

## Master prompt

```text
Create one original Discord custom emoji icon for a bot UI called “Icy
Companion”. Use the attached existing server emoji set only as a loose style
reference; do not copy, trace, recreate, or imitate any individual icon.

Design language: calm, premium, friendly, clean, slightly futuristic, icy
utility-bot aesthetic. Make the symbol instantly readable at Discord emoji
size (32–128 px). Use a simple bold silhouette with rounded geometry, soft
crystalline accents, subtle glass-like highlights, and a small amount of
controlled depth. Keep the design recognizable and uncluttered.

Color direction: a smooth, soft diagonal gradient from warm golden yellow and
sunset orange in the top-left to icy cyan, glacier blue, and pale blue in the
bottom-right. Blend the colors gently; no harsh split, stripes, noise, or
rainbow colors. Use a restrained navy-blue shadow only where it improves
contrast. The gradient direction and lighting must match across the entire
icon set.

Composition: one centered symbol, balanced padding on every side, transparent
background, no words, no letters, no numbers, no watermark, no mock Discord
interface, no extra objects, no border outside the icon. Export as a clean
square PNG with crisp edges and transparency, suitable for a Discord custom
emoji.
```

## Negative prompt

```text
Copied logo, traced icon, lookalike of the reference emoji, generic stock
emoji, flat default system emoji, harsh neon, muddy colors, purple-heavy
palette, red-green gradient, hard color split, stripes, noisy texture, tiny
unreadable details, thin lines, overcrowded composition, text, lettering,
numbers, watermark, background, scenery, shadow outside the symbol, multiple
objects, different perspective, different gradient direction, low contrast,
blurry edges, cropped icon, photorealism.
```

## Icon-specific prompt suffixes

Append exactly one suffix to the master prompt for each image. Keep the same
style, lighting, scale, padding, and gradient direction for every icon.

- **Home:** `A rounded icy cabin/home symbol with a small warm window and a subtle snow-crystal roof accent.`
- **Arrow left:** `A bold rounded navigation arrow pointing left, with a soft comet-tail ice accent.`
- **Arrow right:** `A bold rounded navigation arrow pointing right, with a soft comet-tail ice accent.`
- **First page:** `A rounded double-chevron pointing left with a tiny grounded ice-spark accent.`
- **Last page:** `A rounded double-chevron pointing right with a tiny grounded ice-spark accent.`
- **Settings:** `A compact rounded gear with an icy center crystal, simple enough to read at tiny size.`
- **Commands:** `A neat stack of rounded command cards with one small glowing sparkle, no text on the cards.`
- **Search:** `A rounded magnifying glass with a tiny frost sparkle inside the lens.`
- **Success:** `A confident rounded check mark inside a soft crystal badge, positive but not childish.`
- **Error:** `A rounded warning mark inside a soft crystal badge, clear and calm rather than aggressive.`
- **Loading:** `A small circular icy orbit made from three rounded shards, suggesting motion without animation.`
- **File:** `A rounded document sheet with one folded corner and two abstract icy lines, no writing.`
- **Info:** `A rounded information badge with a clean lowercase-free symbol, no lettering, and a small frost highlight.`
- **Premium:** `A small faceted ice-gem with a warm golden core and a cool blue outer edge.`

## Recommended settings

- 1:1 square canvas
- Transparent background
- 128×128 or 256×256 source, downscaled cleanly for Discord
- Generate one icon per image, not a sheet
- Reuse the same seed/reference images when the tool supports it
- Check every icon at 32×32 before uploading

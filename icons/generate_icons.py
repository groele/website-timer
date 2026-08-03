import os
import fitz  # PyMuPDF
from PIL import Image

# Directory setup
ICONS_DIR = os.path.dirname(os.path.abspath(__file__))

# 128x128 Master SVG design
# Theme: Squircle badge background with vibrant indigo-purple gradient + high contrast white stopwatch & emerald stats bars
SVG_128 = '''<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <!-- Background Squircle Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4338CA" />
      <stop offset="50%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#8B5CF6" />
    </linearGradient>

    <!-- Emerald Accent Gradient -->
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>

    <!-- Amber Accent Gradient -->
    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>

    <!-- Soft Drop Shadow for Inner Dial -->
    <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.35"/>
    </filter>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Base Squircle Container (Ensures visibility on dark & light browser bars) -->
  <rect x="4" y="4" width="120" height="120" rx="28" fill="url(#bgGrad)" stroke="rgba(255,255,255,0.25)" stroke-width="2.5" filter="url(#dropShadow)" />

  <!-- Background Decorative Subdued Chart Lines -->
  <path d="M22 96 L42 82 L62 88 L82 65 L106 72" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Main Stopwatch Outer Ring & Dial -->
  <!-- Stopwatch Top Crown / Button -->
  <rect x="58" y="15" width="12" height="7" rx="2" fill="#FFFFFF" />
  <rect x="61" y="21" width="6" height="5" fill="#FFFFFF" />
  
  <!-- Stopwatch Side Lap Button (Top Right 45deg) -->
  <rect x="87" y="25" width="8" height="5" rx="1.5" fill="#FBBF24" transform="rotate(45 91 27.5)" />

  <!-- Outer Main Timer Circle -->
  <circle cx="64" cy="67" r="38" fill="none" stroke="#FFFFFF" stroke-width="7" />

  <!-- Active Timer Progress Arc (Top Right 0deg to 120deg) -->
  <path d="M 64 29 A 38 38 0 0 1 97 81" fill="none" stroke="url(#emeraldGrad)" stroke-width="8" stroke-linecap="round" filter="url(#glow)" />

  <!-- Clock Center Pin -->
  <circle cx="64" cy="67" r="5" fill="#FFFFFF" />
  <circle cx="64" cy="67" r="2.5" fill="#4338CA" />

  <!-- Clock Hands (Pointing to ~10:10 for classic aesthetic) -->
  <!-- Hour hand -->
  <line x1="64" y1="67" x2="48" y2="53" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" />
  <!-- Minute hand -->
  <line x1="64" y1="67" x2="78" y2="47" stroke="#34D399" stroke-width="4.5" stroke-linecap="round" />

  <!-- 3 Ascending Statistics Bar Chart Overlaid at Bottom Right -->
  <!-- Bar 1 (Short - Amber) -->
  <rect x="80" y="82" width="6" height="14" rx="2" fill="url(#amberGrad)" />
  <!-- Bar 2 (Medium - Cyan/White) -->
  <rect x="89" y="74" width="6" height="22" rx="2" fill="#60A5FA" />
  <!-- Bar 3 (Tall - Emerald) -->
  <rect x="98" y="66" width="6" height="30" rx="2" fill="url(#emeraldGrad)" />
</svg>
'''

# 16x16 Master SVG design (Ultra high-contrast pixel optimized for 16px Chrome Toolbar)
SVG_16 = '''<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <defs>
    <linearGradient id="bgGrad16" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="100%" stop-color="#7C3AED" />
    </linearGradient>
  </defs>

  <!-- Container Squircle with crisp white border -->
  <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" fill="url(#bgGrad16)" stroke="#FFFFFF" stroke-width="0.8" />

  <!-- Top Crown -->
  <rect x="7" y="1.5" width="2" height="1.5" rx="0.5" fill="#FFFFFF" />

  <!-- Stopwatch Main Ring -->
  <circle cx="8" cy="9" r="4.5" fill="none" stroke="#FFFFFF" stroke-width="1.6" />

  <!-- Progress Arc (Emerald) -->
  <path d="M 8 4.5 A 4.5 4.5 0 0 1 12.5 9" fill="none" stroke="#34D399" stroke-width="1.8" stroke-linecap="round" />

  <!-- Clock Hands -->
  <line x1="8" y1="9" x2="6.2" y2="7.2" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" />
  <line x1="8" y1="9" x2="10" y2="6.8" stroke="#34D399" stroke-width="1.3" stroke-linecap="round" />

  <!-- Mini Bar Chart at bottom right -->
  <rect x="10.5" y="11" width="1.2" height="2.5" rx="0.4" fill="#FBBF24" />
  <rect x="12.2" y="9.5" width="1.2" height="4" rx="0.4" fill="#34D399" />
</svg>
'''

def render_svg_to_png(svg_str, size, viewBox_size=128):
    doc = fitz.open(stream=svg_str.encode('utf-8'), filetype='svg')
    page = doc[0]
    scale = size / viewBox_size
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=True)
    img = Image.frombytes("RGBA", [pix.width, pix.height], pix.samples)
    if img.size != (size, size):
        img = img.resize((size, size), Image.Resampling.LANCZOS)
    return img

def main():
    # Save SVG master template
    svg_path = os.path.join(ICONS_DIR, 'icon-template.svg')
    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(SVG_128)
    print(f"Saved master SVG to {svg_path}")

    # Generate PNG files
    # For 16px: use optimized 16px SVG
    img16 = render_svg_to_png(SVG_16, 16, 16)
    img16.save(os.path.join(ICONS_DIR, 'icon16.png'), "PNG")
    print("Generated icon16.png")

    # For 32px: render from 128 SVG
    img32 = render_svg_to_png(SVG_128, 32, 128)
    img32.save(os.path.join(ICONS_DIR, 'icon32.png'), "PNG")
    print("Generated icon32.png")

    # For 48px: render from 128 SVG
    img48 = render_svg_to_png(SVG_128, 48, 128)
    img48.save(os.path.join(ICONS_DIR, 'icon48.png'), "PNG")
    print("Generated icon48.png")

    # For 128px: render from 128 SVG
    img128 = render_svg_to_png(SVG_128, 128, 128)
    img128.save(os.path.join(ICONS_DIR, 'icon128.png'), "PNG")
    print("Generated icon128.png")

if __name__ == '__main__':
    main()

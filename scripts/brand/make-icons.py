"""Genera el ícono y la pantalla de inicio de Ronda: personas vistas desde arriba, en ronda.

Uso: python3 scripts/brand/make-icons.py  (escribe en assets/images/)
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

BRAND = (255, 107, 61, 255)   # --color-brand-500
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)
SS = 4  # supersampling para bordes suaves
OUT = Path(__file__).resolve().parents[2] / "assets" / "images"


def ellipse_points(cx, cy, rx, ry, angle, n=96):
    """Puntos de una elipse rotada (PIL no rota elipses)."""
    ca, sa = math.cos(angle), math.sin(angle)
    pts = []
    for k in range(n):
        t = 2 * math.pi * k / n
        x, y = rx * math.cos(t), ry * math.sin(t)
        pts.append((cx + x * ca - y * sa, cy + x * sa + y * ca))
    return pts


def ronda(size: int, scale: float, color, background, people: int = 5) -> Image.Image:
    """Personas vistas desde arriba, en ronda: cabeza + hombros mirando al centro.
    scale: fracción del lado que ocupa el dibujo."""
    s = size * SS
    img = Image.new("RGBA", (s, s), background)
    d = ImageDraw.Draw(img)
    cx = cy = s / 2
    outer = s * scale / 2
    head_r = outer * 0.15
    shoulder_rx, shoulder_ry = outer * 0.32, outer * 0.16
    ring = outer * 0.80  # distancia del centro a los hombros
    for i in range(people):
        a = -math.pi / 2 + i * 2 * math.pi / people
        ux, uy = math.cos(a), math.sin(a)
        # Hombros: elipse tangente al círculo.
        sx, sy = cx + ring * ux, cy + ring * uy
        d.polygon(ellipse_points(sx, sy, shoulder_rx, shoulder_ry, a + math.pi / 2), fill=color)
        # Cabeza: un poco hacia el centro, separada de los hombros.
        head_dist = ring - shoulder_ry - head_r * 1.25
        hx, hy = cx + head_dist * ux, cy + head_dist * uy
        d.ellipse([hx - head_r - head_r * 0.25, hy - head_r - head_r * 0.25, hx + head_r + head_r * 0.25, hy + head_r + head_r * 0.25],
                  fill=background if background[3] else CLEAR)
        d.ellipse([hx - head_r, hy - head_r, hx + head_r, hy + head_r], fill=color)
    return img.resize((size, size), Image.LANCZOS)


def save(img: Image.Image, name: str) -> None:
    img.save(OUT / name)
    print("✓", name)


# Ícono general (Play Store / iOS): fondo naranja.
save(ronda(1024, 0.72, WHITE, BRAND), "icon.png")
# Ícono adaptable de Android: el sistema recorta a círculo/squircle; el dibujo va en la zona segura (~66 %).
save(Image.new("RGBA", (1024, 1024), BRAND), "android-icon-background.png")
save(ronda(1024, 0.64, WHITE, CLEAR), "android-icon-foreground.png")
save(ronda(1024, 0.64, WHITE, CLEAR), "android-icon-monochrome.png")
# Pantalla de inicio: dibujo blanco sobre el fondo naranja que define app.json.
save(ronda(512, 0.9, WHITE, CLEAR), "splash-icon.png")

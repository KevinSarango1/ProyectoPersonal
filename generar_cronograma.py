import matplotlib.pyplot as plt
import matplotlib.patches as patches

WEEKS = 16
COL_W = 3.2          # ancho columna de actividades (en unidades de semana)
CELL_H = 0.78
PADDING = 0.11
COLOR_OE1 = "#F4C2C2"   # rosa claro
COLOR_OE2 = "#C8E6C9"   # verde claro
COLOR_HDR1 = "#1565C0"  # azul oscuro texto OE1
COLOR_HDR2 = "#2E7D32"  # verde oscuro texto OE2
COLOR_GRID = "#CCCCCC"

rows = [
    ("1. Objetivo Específico 1",                                        None, None, "hdr1"),
    ("1.1. Recopilación y estructuración del catálogo alimentario",        1,    4,  "oe1"),
    ("1.2. Definición arquitectura C4 y configuración pipeline RAG",       3,    7,  "oe1"),
    ("1.3. Desarrollo de la interfaz del sistema",                         6,   11,  "oe1"),
    ("2. Objetivo Específico 2",                                        None, None, "hdr2"),
    ("2.1. Diseño y validación del cuestionario Likert",                   9,   12,  "oe2"),
    ("2.2. Definición y ejecución de casos de prueba",                    11,   14,  "oe2"),
    ("2.3. Aplicación del cuestionario y análisis estadístico",           13,   16,  "oe2"),
]

N = len(rows)
fig_w = 16
fig_h = 0.55 * N + 1.0
fig, ax = plt.subplots(figsize=(fig_w, fig_h))
ax.set_xlim(0, COL_W + WEEKS + 0.15)
ax.set_ylim(0, N)
ax.axis("off")

# ── Encabezado de semanas ─────────────────────────────────────────────────────
for w in range(1, WEEKS + 1):
    x = COL_W + (w - 1)
    rect = patches.Rectangle((x, N - PADDING), 1, PADDING * 1.8,
                              linewidth=0.5, edgecolor=COLOR_GRID,
                              facecolor="#E3F2FD", clip_on=False)
    ax.add_patch(rect)
    ax.text(x + 0.5, N + 0.05, f"S{w}", ha="center", va="bottom",
            fontsize=6.5, fontweight="bold", color="#1A237E")

# ── Encabezado columna actividades ───────────────────────────────────────────
rect = patches.Rectangle((0, N - PADDING), COL_W, PADDING * 1.8,
                          linewidth=0.5, edgecolor=COLOR_GRID,
                          facecolor="#E3F2FD", clip_on=False)
ax.add_patch(rect)
ax.text(COL_W / 2, N + 0.05, "Actividades", ha="center", va="bottom",
        fontsize=7.5, fontweight="bold", color="#1A237E")

# ── Filas ─────────────────────────────────────────────────────────────────────
for i, (label, start, end, rtype) in enumerate(rows):
    y = N - 1 - i

    if rtype in ("hdr1", "hdr2"):
        bg = "#FFFFFF"
        txt_color = COLOR_HDR1 if rtype == "hdr1" else COLOR_HDR2
        fw = "bold"
        fs = 7.5
    else:
        bg = "#FAFAFA"
        txt_color = "#333333"
        fw = "normal"
        fs = 7.0

    rect = patches.Rectangle((0, y + PADDING / 2), COL_W, CELL_H,
                              linewidth=0.5, edgecolor=COLOR_GRID, facecolor=bg)
    ax.add_patch(rect)
    ax.text(0.12, y + CELL_H / 2 + PADDING / 2, label,
            ha="left", va="center", fontsize=fs, fontweight=fw, color=txt_color)

    bar_color = COLOR_OE1 if rtype == "oe1" else COLOR_OE2
    for w in range(1, WEEKS + 1):
        x = COL_W + (w - 1)
        cell_bg = bar_color if (start and end and start <= w <= end) else "#FFFFFF"
        rect = patches.Rectangle((x + 0.02, y + PADDING / 2), 0.96, CELL_H,
                                  linewidth=0.4, edgecolor=COLOR_GRID, facecolor=cell_bg)
        ax.add_patch(rect)

# ── Borde exterior ────────────────────────────────────────────────────────────
border = patches.Rectangle((0, PADDING / 2), COL_W + WEEKS, N - PADDING / 2,
                            linewidth=1.2, edgecolor="#555555", facecolor="none")
ax.add_patch(border)

plt.tight_layout(pad=0.2)
out = r"c:\Users\ASUS\Downloads\ClaudeProyecto\cronograma.png"
plt.savefig(out, dpi=180, bbox_inches="tight", facecolor="white")
plt.close()
print("Guardado en:", out)

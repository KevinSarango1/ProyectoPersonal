from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

PAGE_W, PAGE_H = A4
MARGIN = 2.5 * cm

doc = SimpleDocTemplate(
    "ObjetivoGeneral_SarangoKevin.pdf",
    pagesize=A4,
    rightMargin=MARGIN,
    leftMargin=MARGIN,
    topMargin=2.0 * cm,
    bottomMargin=2.0 * cm,
)

BLUE = colors.HexColor("#1F3864")
LIGHT_BLUE = colors.HexColor("#BDD7EE")

s_header = ParagraphStyle("header", fontName="Helvetica", fontSize=10, textColor=BLUE, alignment=TA_LEFT)
s_section = ParagraphStyle("section", fontName="Helvetica-Bold", fontSize=13, textColor=BLUE, spaceAfter=6)
s_label = ParagraphStyle("label", fontName="Helvetica-Bold", fontSize=11, textColor=colors.black, spaceAfter=4)
s_body = ParagraphStyle("body", fontName="Helvetica", fontSize=11, textColor=colors.black,
                         leading=16, alignment=TA_JUSTIFY, spaceAfter=6)

content = []

# Header right-aligned
header_table = Table(
    [[Paragraph("FEIRNNR - Carrera de Computación", s_header)]],
    colWidths=[PAGE_W - 2 * MARGIN],
)
header_table.setStyle(TableStyle([
    ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
]))
content.append(header_table)
content.append(Spacer(1, 0.6 * cm))

# Section title "1. Datos Generales"
content.append(Paragraph("1.  Datos Generales", s_section))
content.append(Spacer(1, 0.2 * cm))

# Identification table
table_data = [
    [Paragraph("<b>Asignatura</b>", s_body), Paragraph("Proyectos Tecnológicos 2", s_body)],
    [Paragraph("<b>Estudiante</b>", s_body), Paragraph("Kevin Patricio Sarango Olaya", s_body)],
    [Paragraph("<b>Ciclo</b>", s_body), Paragraph("8° – Período académico marzo–agosto 2026", s_body)],
    [Paragraph("<b>Unidad</b>", s_body), Paragraph("2", s_body)],
    [Paragraph("<b>Nombre del Docente</b>", s_body), Paragraph("Cumbicus Pineda Oscar Miguel", s_body)],
    [Paragraph("<b>Fecha</b>", s_body), Paragraph("20/05/2026", s_body)],
]

col1 = 5.5 * cm
col2 = PAGE_W - 2 * MARGIN - col1

id_table = Table(table_data, colWidths=[col1, col2])
id_table.setStyle(TableStyle([
    ("BOX",        (0, 0), (-1, -1), 0.5, colors.black),
    ("INNERGRID",  (0, 0), (-1, -1), 0.5, colors.black),
    ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ("LEFTPADDING",   (0, 0), (-1, -1), 6),
]))
content.append(id_table)
content.append(Spacer(1, 0.8 * cm))

# Pregunta de investigación
content.append(Paragraph("<b>Pregunta de investigación</b>", s_label))
content.append(Spacer(1, 0.15 * cm))
pregunta = (
    "¿Cuál es el nivel de satisfacción (Escala SUS) percibido por el nutricionista respecto a las "
    "recomendaciones de planes nutricionales personalizados generadas mediante un prototipo de "
    "sistema de gestión nutricional basado en RAG, utilizando los datos antropométricos, "
    "bioquímicos y un catálogo de alimentos ecuatorianos?"
)
content.append(Paragraph(pregunta, s_body))
content.append(Spacer(1, 0.8 * cm))

# Objetivo general
content.append(Paragraph("<b>Objetivo general:</b>", s_label))
content.append(Spacer(1, 0.15 * cm))
objetivo = (
    "Evaluar el nivel de satisfacción percibido por el nutricionista respecto a las "
    "recomendaciones de planes nutricionales personalizados generadas mediante un prototipo de "
    "sistema de gestión nutricional basado en RAG, midiéndolo mediante la Escala SUS, "
    "utilizando los datos antropométricos, bioquímicos y un catálogo de alimentos ecuatorianos."
)
content.append(Paragraph(objetivo, s_body))

doc.build(content)
print("PDF generado: ObjetivoGeneral_SarangoKevin.pdf")

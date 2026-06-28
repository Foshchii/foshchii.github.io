from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


OUTPUT = "assets/Sviatoslav-Foshchii-CV.pdf"


def bullet(text, style):
    return ListItem(Paragraph(text, style), leftIndent=8, bulletColor=colors.HexColor("#4f46e5"))


def section(title, styles):
    return [
        Spacer(1, 4.2 * mm),
        Paragraph(title.upper(), styles["Section"]),
        Spacer(1, 1.3 * mm),
    ]


def make_pdf():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=13 * mm,
        bottomMargin=13 * mm,
        title="Sviatoslav Foshchii CV",
        author="Sviatoslav Foshchii",
    )

    base = getSampleStyleSheet()
    styles = {
        "Name": ParagraphStyle(
            "Name",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=27,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=2,
        ),
        "Role": ParagraphStyle(
            "Role",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11.2,
            leading=14,
            textColor=colors.HexColor("#334155"),
            spaceAfter=6,
        ),
        "Contact": ParagraphStyle(
            "Contact",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.4,
            leading=10.5,
            textColor=colors.HexColor("#475569"),
        ),
        "Section": ParagraphStyle(
            "Section",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=8.8,
            leading=10,
            textColor=colors.HexColor("#4f46e5"),
            spaceBefore=3,
            spaceAfter=2,
        ),
        "H2": ParagraphStyle(
            "H2",
            parent=base["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11.3,
            leading=13.5,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=1,
        ),
        "Meta": ParagraphStyle(
            "Meta",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8.4,
            leading=10,
            textColor=colors.HexColor("#64748b"),
            spaceAfter=3,
        ),
        "Body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.9,
            leading=11.4,
            textColor=colors.HexColor("#334155"),
            spaceAfter=3,
        ),
        "Bullet": ParagraphStyle(
            "Bullet",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.45,
            leading=10.7,
            textColor=colors.HexColor("#334155"),
        ),
        "Small": ParagraphStyle(
            "Small",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.2,
            leading=10.2,
            textColor=colors.HexColor("#475569"),
        ),
        "Metric": ParagraphStyle(
            "Metric",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=16,
            textColor=colors.HexColor("#0f172a"),
        ),
        "MetricLabel": ParagraphStyle(
            "MetricLabel",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.2,
            leading=8.5,
            textColor=colors.HexColor("#475569"),
        ),
    }

    story = [
        Paragraph("Sviatoslav Foshchii", styles["Name"]),
        Paragraph("Salesforce Marketing Cloud Consultant | Technical Project Manager", styles["Role"]),
        Paragraph(
            "Copenhagen, Denmark | sviatoslav.foshchii@gmail.com | +45 71 63 63 96 | "
            "linkedin.com/in/sviatoslav-foshchii | github.com/Foshchii | foshchii.github.io",
            styles["Contact"],
        ),
    ]

    story += section("Profile", styles)
    story.append(
        Paragraph(
            "Salesforce Marketing Cloud Consultant and Technical Project Manager with 6+ years across martech, CRM operations, e-commerce and digital growth. "
            "Recent work includes Salesforce Marketing Cloud operations for a worldwide brand and a significant Adobe Campaign Standard to SFMC migration. "
            "Strong at turning ambiguous requirements into plans, protecting business-as-usual marketing work during change, and creating documentation that technical and business teams can use.",
            styles["Body"],
        )
    )

    story += section("Impact snapshot", styles)
    metric_rows = [
        [
            Paragraph("25%", styles["Metric"]),
            Paragraph("20%", styles["Metric"]),
            Paragraph("15%", styles["Metric"]),
            Paragraph("5", styles["Metric"]),
        ],
        [
            Paragraph("delivery efficiency gain", styles["MetricLabel"]),
            Paragraph("team productivity improvement", styles["MetricLabel"]),
            Paragraph("operating cost reduction", styles["MetricLabel"]),
            Paragraph("active Salesforce certifications", styles["MetricLabel"]),
        ],
    ]
    metrics = Table(metric_rows, colWidths=[41 * mm, 41 * mm, 41 * mm, 41 * mm])
    metrics.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#dbe3ef")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#dbe3ef")),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(metrics)

    story += section("Experience", styles)
    story.append(Paragraph("VML MAP", styles["H2"]))
    story.append(Paragraph("Application Consultant, Jun 2026 - Present | Technical Project Manager, Dec 2022 - Jun 2026 | Copenhagen", styles["Meta"]))
    story.append(
        ListFlowable(
            [
                bullet("Maintain and enhance Salesforce Marketing Cloud operations for a worldwide brand, contributing to a 25% increase in delivery efficiency.", styles["Bullet"]),
                bullet("Managed a significant Adobe Campaign Standard to Salesforce Marketing Cloud migration while preserving business-as-usual marketing operations.", styles["Bullet"]),
                bullet("Built delivery plans, status routines, QA checkpoints and handover documentation across technical development teams.", styles["Bullet"]),
                bullet("Facilitated Scrum ceremonies, dependency tracking and blocker removal for large projects, improving team productivity by up to 20%.", styles["Bullet"]),
                bullet("Coordinated resource allocation with stakeholders and delivery leads, reducing operating costs by up to 15%.", styles["Bullet"]),
            ],
            bulletType="bullet",
            start="circle",
            leftIndent=12,
            bulletFontSize=5,
            spaceAfter=3,
        )
    )

    story.append(Paragraph("Optimozg", styles["H2"]))
    story.append(Paragraph("Digital Project Manager | Jan 2020 - Dec 2022 | Ukraine", styles["Meta"]))
    story.append(
        ListFlowable(
            [
                bullet("Managed digital marketing and technology projects across PPC, e-commerce and product-growth workstreams.", styles["Bullet"]),
                bullet("Owned campaign roadmaps, workload planning, stakeholder coordination and delivery routines across client accounts.", styles["Bullet"]),
                bullet("Supported MOSH growth roadmap and A/B testing work that contributed to a 20% improvement in user experience.", styles["Bullet"]),
                bullet("Contributed to a 10% annual revenue increase for Gulvdeal through e-commerce project delivery and marketing strategy.", styles["Bullet"]),
                bullet("Mentored paid media colleagues and helped integrate them into structured delivery teams.", styles["Bullet"]),
            ],
            bulletType="bullet",
            start="circle",
            leftIndent=12,
            bulletFontSize=5,
            spaceAfter=2,
        )
    )

    story += section("Selected proof", styles)
    story.append(
        ListFlowable(
            [
                bullet("Adobe Campaign to SFMC migration: led migration delivery while keeping campaign operations running and preparing teams for the new SFMC operating model.", styles["Bullet"]),
                bullet("SFMC operations improvement: supported delivery routines, documentation and technical coordination for Salesforce Marketing Cloud operations.", styles["Bullet"]),
                bullet("Keto Scanner: built a live AI-assisted web product from concept and data model to interface and deployment.", styles["Bullet"]),
            ],
            bulletType="bullet",
            start="circle",
            leftIndent=12,
            bulletFontSize=5,
            spaceAfter=2,
        )
    )

    story.append(PageBreak())
    story += section("Best-fit roles", styles)
    story.append(Paragraph("Salesforce Marketing Cloud Consultant | Application Consultant | Technical Project Manager | Martech Project Manager | CRM Operations Consultant", styles["Body"]))

    story += section("Core skills", styles)
    skills = [
        ["Salesforce Marketing Cloud", "SFMC migrations", "CRM operations"],
        ["Journey and automation delivery", "Salesforce Data Cloud", "Salesforce AI"],
        ["Agentforce", "Agile delivery", "Scrum facilitation"],
        ["Stakeholder alignment", "Risk management", "Jira and Confluence"],
        ["Process documentation", "Email marketing", "E-commerce delivery"],
    ]
    table = Table(
        [[Paragraph(item, styles["Small"]) for item in row] for row in skills],
        colWidths=[55 * mm, 55 * mm, 55 * mm],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#e2e8f0")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(table)

    story += section("Credentials", styles)
    story.append(
        ListFlowable(
            [
                bullet("Salesforce Certified Marketing Cloud Consultant", styles["Bullet"]),
                bullet("Salesforce Certified Marketing Associate", styles["Bullet"]),
                bullet("Salesforce Certified AI Specialist", styles["Bullet"]),
                bullet("Salesforce Data Cloud Consultant", styles["Bullet"]),
                bullet("Salesforce Marketing Cloud Administrator", styles["Bullet"]),
                bullet("Professional Scrum Master II and I", styles["Bullet"]),
                bullet("PMI Agile Certified Practitioner", styles["Bullet"]),
                bullet("Google Fundamentals of Digital Marketing", styles["Bullet"]),
            ],
            bulletType="bullet",
            start="circle",
            leftIndent=12,
            bulletFontSize=5,
            spaceAfter=3,
        )
    )
    story.append(Paragraph("5 active Salesforce certifications; 7 Salesforce credentials earned.", styles["Small"]))

    story += section("Education", styles)
    story.append(
        ListFlowable(
            [
                bullet("MSc Psychology, Kremenchuk Mykhailo Ostrohradskyi National University", styles["Bullet"]),
                bullet("BSc Psychology with honours, Kremenchuk Mykhailo Ostrohradskyi National University", styles["Bullet"]),
                bullet("Diploma in Project Management, Oxford Home Study Centre", styles["Bullet"]),
            ],
            bulletType="bullet",
            start="circle",
            leftIndent=12,
            bulletFontSize=5,
            spaceAfter=3,
        )
    )

    story += section("Languages", styles)
    story.append(Paragraph("Ukrainian - native | English - advanced | Russian - fluent", styles["Body"]))

    story += section("Portfolio", styles)
    story.append(Paragraph("Portfolio, insight articles and project context: https://foshchii.github.io/", styles["Body"]))

    def footer(canvas, document):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#64748b"))
        canvas.drawString(15 * mm, 8 * mm, "Sviatoslav Foshchii CV")
        canvas.drawRightString(195 * mm, 8 * mm, f"Page {document.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)


if __name__ == "__main__":
    make_pdf()

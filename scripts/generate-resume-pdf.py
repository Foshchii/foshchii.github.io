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
        Spacer(1, 5 * mm),
        Paragraph(title.upper(), styles["Section"]),
        Spacer(1, 1.5 * mm),
    ]


def make_pdf():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
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
            leading=28,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=4,
        ),
        "Role": ParagraphStyle(
            "Role",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11.5,
            leading=15,
            textColor=colors.HexColor("#334155"),
            spaceAfter=8,
        ),
        "Contact": ParagraphStyle(
            "Contact",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.7,
            leading=11,
            textColor=colors.HexColor("#475569"),
        ),
        "Section": ParagraphStyle(
            "Section",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=colors.HexColor("#4f46e5"),
            spaceBefore=4,
            spaceAfter=2,
        ),
        "H2": ParagraphStyle(
            "H2",
            parent=base["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=15,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=2,
        ),
        "Meta": ParagraphStyle(
            "Meta",
            parent=base["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8.8,
            leading=11,
            textColor=colors.HexColor("#64748b"),
            spaceAfter=4,
        ),
        "Body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9.2,
            leading=12.2,
            textColor=colors.HexColor("#334155"),
            spaceAfter=4,
        ),
        "Bullet": ParagraphStyle(
            "Bullet",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.8,
            leading=11.4,
            textColor=colors.HexColor("#334155"),
        ),
        "Small": ParagraphStyle(
            "Small",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.4,
            leading=10.5,
            textColor=colors.HexColor("#475569"),
        ),
    }

    story = []
    story.append(Paragraph("Sviatoslav Foshchii", styles["Name"]))
    story.append(
        Paragraph(
            "Salesforce Marketing Cloud Consultant and Technical Project Manager",
            styles["Role"],
        )
    )
    story.append(
        Paragraph(
            "Copenhagen, Denmark | sviatoslav.foshchii@gmail.com | +45 71 63 63 96 | "
            "linkedin.com/in/sviatoslav-foshchii | github.com/Foshchii | foshchii.github.io",
            styles["Contact"],
        )
    )

    story += section("Profile", styles)
    story.append(
        Paragraph(
            "I combine hands-on Salesforce Marketing Cloud delivery, agile project management and a psychology background. "
            "My work sits between technical teams, client stakeholders and marketing operations: translating ambiguity into plans, "
            "keeping migrations moving, documenting repeatable processes and helping teams adopt new tools without losing momentum.",
            styles["Body"],
        )
    )

    story += section("Target roles", styles)
    story.append(
        Paragraph(
            "Salesforce Marketing Cloud Consultant | Application Consultant | Technical Project Manager | Martech Project Manager | CRM Operations Consultant",
            styles["Body"],
        )
    )

    story += section("Experience", styles)
    story.append(Paragraph("VML MAP", styles["H2"]))
    story.append(
        Paragraph(
            "Application Consultant, Jun 2026 - Present | Technical Project Manager, Dec 2022 - Jun 2026 | Copenhagen",
            styles["Meta"],
        )
    )
    story.append(
        ListFlowable(
            [
                bullet("Maintain and enhance Salesforce Marketing Cloud operations for a worldwide brand, contributing to a 25% increase in delivery efficiency.", styles["Bullet"]),
                bullet("Managed a significant Adobe Campaign Standard to Salesforce Marketing Cloud migration while keeping marketing operations running continuously.", styles["Bullet"]),
                bullet("Create uniform procedures and documentation across technical development teams.", styles["Bullet"]),
                bullet("Facilitate Scrum ceremonies for large projects, improving team productivity by up to 20%.", styles["Bullet"]),
                bullet("Coordinate resource allocation with stakeholders, reducing operating costs by up to 15%.", styles["Bullet"]),
            ],
            bulletType="bullet",
            start="circle",
            leftIndent=12,
            bulletFontSize=5,
            spaceAfter=4,
        )
    )

    story.append(Paragraph("Digital Project Manager - Optimozg", styles["H2"]))
    story.append(Paragraph("Jan 2020 - Dec 2022 | Ukraine", styles["Meta"]))
    story.append(
        ListFlowable(
            [
                bullet("Managed digital marketing and technology projects across PPC, e-commerce and product-growth workstreams.", styles["Bullet"]),
                bullet("Led campaign roadmaps, workload planning and team structures to meet KPIs across client accounts.", styles["Bullet"]),
                bullet("Contributed to a 10% annual revenue increase on Gulvdeal through e-commerce project delivery and marketing strategy.", styles["Bullet"]),
                bullet("Supported product-roadmap discussions and A/B testing for MOSH, contributing to a 20% improvement in user experience.", styles["Bullet"]),
            ],
            bulletType="bullet",
            start="circle",
            leftIndent=12,
            bulletFontSize=5,
            spaceAfter=4,
        )
    )

    story.append(Paragraph("Earlier communication and field roles", styles["H2"]))
    story.append(Paragraph("OSCE/ODIHR and legal clinic work | 2018 - 2019 | Ukraine", styles["Meta"]))
    story.append(
        ListFlowable(
            [
                bullet("Supported OSCE observers during the 2019 parliamentary election process in Ukraine.", styles["Bullet"]),
                bullet("Provided communication counselling and mediation support in a legal clinic context.", styles["Bullet"]),
            ],
            bulletType="bullet",
            start="circle",
            leftIndent=12,
            bulletFontSize=5,
            spaceAfter=2,
        )
    )

    story += section("Selected projects", styles)
    story.append(
        ListFlowable(
            [
                bullet("Adobe Campaign to Salesforce Marketing Cloud migration: led migration delivery while protecting marketing continuity and operational handover.", styles["Bullet"]),
                bullet("Keto Scanner: built a live personal web app with AI-assisted product development, from concept and data model to interface and deployment.", styles["Bullet"]),
                bullet("Personal website and booking widget: static GitHub Pages site with structured data, llms.txt, crawler-friendly articles and a reusable scheduling widget.", styles["Bullet"]),
            ],
            bulletType="bullet",
            start="circle",
            leftIndent=12,
            bulletFontSize=5,
            spaceAfter=3,
        )
    )

    story.append(PageBreak())
    story += section("Core skills", styles)
    skills = [
        ["Salesforce Marketing Cloud", "Salesforce Data Cloud", "Salesforce AI"],
        ["Agentforce", "CRM operations", "Email marketing"],
        ["Agile delivery", "Scrum", "Stakeholder management"],
        ["Jira", "Confluence", "Process documentation"],
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

    story += section("References and portfolio", styles)
    story.append(
        Paragraph(
            "Portfolio, articles and project context are available at https://foshchii.github.io/. "
            "LinkedIn recommendations are referenced on the website with source context.",
            styles["Body"],
        )
    )

    def footer(canvas, document):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#64748b"))
        canvas.drawString(16 * mm, 8 * mm, "Sviatoslav Foshchii CV")
        canvas.drawRightString(194 * mm, 8 * mm, f"Page {document.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)


if __name__ == "__main__":
    make_pdf()

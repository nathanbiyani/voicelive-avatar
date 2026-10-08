"""Curated, non-patient evaluation data used by the demo."""

from dataclasses import dataclass


@dataclass(frozen=True)
class TerminologyPack:
    id: str
    name: str
    description: str
    instructions: str


@dataclass(frozen=True)
class NamePack:
    id: str
    name: str
    description: str
    phrases: tuple[str, ...]


@dataclass(frozen=True)
class AccentProfile:
    id: str
    name: str
    locale: str
    description: str


TERMINOLOGY_PACKS = {
    pack.id: pack
    for pack in (
        TerminologyPack("none", "None", "No domain glossary.", ""),
        TerminologyPack(
            "general-radiography",
            "General radiography",
            "Patient-facing X-ray and radiography terms.",
            (
                "Use radiography terminology accurately. Distinguish an X-ray "
                "examination from the resulting radiograph. Use 'radiologic "
                "technologist' or 'technologist' for the person positioning the "
                "patient. Explain detector, positioning, exposure, and shielding "
                "in plain language when they arise."
            ),
        ),
        TerminologyPack(
            "computed-tomography",
            "Computed tomography (CT)",
            "Common CT preparation and scanning terms.",
            (
                "Use computed tomography terminology accurately. On first use, "
                "say 'computed tomography, or CT.' Explain gantry, contrast "
                "material, scan, and breath-hold in plain language. Do not call "
                "CT an MRI."
            ),
        ),
        TerminologyPack(
            "magnetic-resonance-imaging",
            "Magnetic resonance imaging (MRI)",
            "Common MRI preparation and safety terms.",
            (
                "Use magnetic resonance imaging terminology accurately. On first "
                "use, say 'magnetic resonance imaging, or MRI.' Explain magnetic "
                "field, coil, gadolinium contrast, and screening in plain language. "
                "Do not describe MRI as using ionizing radiation."
            ),
        ),
        TerminologyPack(
            "ultrasound",
            "Ultrasound",
            "Common diagnostic ultrasound terms.",
            (
                "Use ultrasound terminology accurately. Explain transducer, "
                "sonographer, gel, and Doppler in plain language. Describe "
                "ultrasound as using sound waves rather than ionizing radiation."
            ),
        ),
    )
}


NAME_PACKS = {
    pack.id: pack
    for pack in (
        NamePack("none", "None", "No name recognition hints.", ()),
        NamePack(
            "multicultural-names-v1",
            "Multicultural synthetic names",
            "Synthetic names for repeatable recognition tests.",
            (
                "Siobhan O'Sullivan",
                "Nguyen Thi Minh",
                "Xochitl Hernandez",
                "Saoirse McLaughlin",
                "Niamh Choudhury",
                "Joaquin Villasenor",
                "Hyun-joo Kim",
                "Adebayo Ogunleye",
                "Priyanka Subramanian",
                "Ryszard Wojciechowski",
            ),
        ),
    )
}


ACCENT_PROFILES = {
    profile.id: profile
    for profile in (
        AccentProfile("auto", "Automatic language detection", "auto", "Let Azure Speech detect the language."),
        AccentProfile("en-US", "English (United States)", "en-US", "Baseline U.S. English evaluation."),
        AccentProfile("en-GB", "English (United Kingdom)", "en-GB", "British English evaluation."),
        AccentProfile("en-IN", "English (India)", "en-IN", "Indian English evaluation."),
        AccentProfile("es-ES", "Spanish (Spain)", "es-ES", "European Spanish evaluation."),
        AccentProfile("es-MX", "Spanish (Mexico)", "es-MX", "Mexican Spanish evaluation."),
        AccentProfile("fr-FR", "French (France)", "fr-FR", "French evaluation."),
        AccentProfile("ko-KR", "Korean", "ko-KR", "Korean evaluation."),
        AccentProfile("zh-CN", "Mandarin Chinese", "zh-CN", "Mandarin evaluation."),
    )
}

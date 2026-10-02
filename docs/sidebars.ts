import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docsSidebar: [
    "intro",
    "installation",
    "getting-started",
    "mental-model",
    "coordinate-system",
    "api-overview",
    {
      type: "category",
      label: "Core concepts",
      collapsed: false,
      items: [
        "core/scenes-and-tattvas",
        "core/animations-and-timelines",
        "core/updaters",
        "core/camera-and-depth",
        "core/scene-views",
      ],
    },
    {
      type: "category",
      label: "Tattvas",
      collapsed: false,
      link: { type: "doc", id: "tattvas/index" },
      items: [
        "tattvas/primitives",
        "tattvas/text-and-formulae",
        "tattvas/morphing",
        "tattvas/maths",
        "tattvas/fractals",
        "tattvas/ai",
        "tattvas/storytelling-and-composites",
      ],
    },
    {
      type: "category",
      label: "Production guides",
      collapsed: false,
      items: [
        "guides/themes-fonts-branding",
        "guides/react-three-and-web",
        "guides/rendering-and-export",
        "guides/captures-and-gifs",
        "guides/audio",
      ],
    },
    "examples/index",
    "troubleshooting",
    "roadmap",
    {
      type: "category",
      label: "Architecture",
      items: ["architecture/determinism-and-rendering"],
    },
    "logo",
  ],
};

export default sidebars;

import { render } from "murali-js";
import { Scene, Timeline } from "murali-js/core";
import { Newspaper, NewspaperOpening } from "murali-js/storytelling";

class NewspaperOpeningScene extends Scene {
  constructor() {
    super({ width: 1920, height: 1080, background: "#0c0b0a" });
  }

  override construct(): void {
    const newspapers = [
      new Newspaper("A New Era Begins")
        .keyword("BREAKING")
        .publication("THE MORNING REGISTER")
        .date("OCTOBER 4, 2026")
        .volume("CITY EDITION · 7 AM")
        .section("WORLD DESK")
        .deck("Markets, governments, and communities prepare for a new technological chapter.")
        .body(
          "The first signs arrived quietly, then all at once. Institutions across the world are adapting to a rapidly changing landscape.",
          "Local leaders say the transformation will be measured not only by speed, but by how widely its benefits are shared.",
        )
        .layout("lead"),
      new Newspaper("Technology Reshapes the World")
        .keyword("AI")
        .publication("THE GLOBAL OBSERVER")
        .date("WEEKEND EDITION")
        .volume("NO. 8,412")
        .section("TECHNOLOGY")
        .deck("Inside the tools moving from research labs into daily life.")
        .layout("columns"),
      new Newspaper("The Story Everyone Is Talking About")
        .keyword("GLOBAL")
        .publication("THE WORLD JOURNAL")
        .date("MORNING EDITION")
        .section("FRONT PAGE")
        .layout("lead"),
      new Newspaper("Ideas Move at the Speed of Light")
        .keyword("REVOLUTION")
        .publication("THE DAILY SIGNAL")
        .date("SPECIAL EDITION")
        .section("ANALYSIS")
        .layout("columns"),
      new Newspaper("Tomorrow Arrives Today")
        .keyword("FUTURE")
        .publication("METRO EXTRA")
        .date("LATE EDITION")
        .volume("EXTRA · EXTRA")
        .section("EXCLUSIVE")
        .deck("The inventions and decisions defining what comes next.")
        .layout("tabloid"),
      // A real scan can replace any generated page:
      // Newspaper.fromImage(imageFile("./assets/my-newspaper.jpg")).date("ARCHIVE EDITION"),
    ];

    const opening = NewspaperOpening(newspapers, {
      title: "THE WORLD IS CHANGING",
      kicker: "A NEW ERA BEGINS",
      publication: "THE FUTURE CHRONICLE",
      date: "OCTOBER 4, 2026",
      volume: "SUNDAY · VOL. 42",
      finalBody: [
        "Five editions, five perspectives, and one defining story come together in today's special report.",
        "Follow the people and ideas reshaping the world—and discover what the next chapter may hold.",
      ],
      totalTime: 5.5,
      timing: {
        introDelay: 0.2,
        flashDuration: 0.72,
        flashStagger: 0.48,
        finalDelay: 0.3,
        finalRevealDuration: 1.05,
        endHold: 1.3,
      },
    })
      .addTo(this);

    const timeline = new Timeline();
    opening.animate(timeline);
    this.play(timeline);
    this.captureScreenshotsNamed([
      [1.25, "newspaper-flash"],
      [opening.duration - 0.45, "newspaper-title"],
    ]);
  }
}

render(import.meta.url, NewspaperOpeningScene, { fps: 30 });

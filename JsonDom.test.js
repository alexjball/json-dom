const JsonDom = require("./JsonDom");
const fs = require("fs");

const simpleDom = {
    identifier: "System",
    subviews: [
      {
        class: "StackView",
        classNames: ["container"],
        subviews: [{ class: "ImageView" }]
      },
      {
        class: "StackView",
        classNames: ["container2"]
      },
      {
        class: "GridView"
      },
    ]
  },
  simpleDomString = JSON.stringify(simpleDom);

const fullDomString = fs.readFileSync("./SystemViewController.json", {
  encoding: "utf8"
});

describe("JsonDom", () => {
  it("matches viewClass", () => {
    const dom = JsonDom.parse(simpleDomString);
    expect(dom.matchViewClass("GridView")).toEqual([simpleDom.subviews[2]]);
  });

  it("matches identifier", () => {
    const dom = JsonDom.parse(simpleDomString);
    expect(dom.matchIdentifier("System")).toEqual([simpleDom]);
  });

  it("matches className", () => {
    const dom = JsonDom.parse(simpleDomString);
    expect(dom.matchClassName("container")).toEqual([simpleDom.subviews[0]]);
  });

  it("matches compound selector", () => {
    const dom = JsonDom.parse(simpleDomString);
    expect(dom.matchSelector("StackView.container2")).toEqual([
      simpleDom.subviews[1]
    ]);
  });

  it("matches combining selector", () => {
    const dom = JsonDom.parse(simpleDomString);
    expect(dom.matchSelector("StackView.container2, GridView ")).toEqual([
      simpleDom.subviews[1],
      simpleDom.subviews[2]
    ]);
  });

  it("rejects chaining selector", () => {
    const dom = JsonDom.parse(simpleDomString);
    expect(() => dom.matchSelector("StackView container2")).toThrow();
  });

  it("matches full dom", () => {
    const dom = JsonDom.parse(fullDomString);
    expect(dom.matchViewClass("Input").length).toEqual(26);
  });
});

#!/usr/bin/env node

const readline = require("readline");
const yargs = require("yargs");
const fs = require("fs");
const JsonDom = require("./JsonDom");

const argv = yargs
  .option("file", {
    description: "JSON file containing the view hierarchy to query"
  })
  .demandOption("file", "Please specify the view file to query").argv;

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const dom = JsonDom.parse(fs.readFileSync(argv.file, { encoding: "utf8" }));
const repl = () => {
  terminal.question("Selector to query: ", rule => {
    try {
      const matchedViews = dom.matchSelector(rule);
      console.log(`Matched ${matchedViews.length} views`);
      console.log(matchedViews);
    } catch (e) {
      if (e instanceof SyntaxError) {
        console.error(e.message);
      } else {
        console.error("Couldn't match selector", e);
      }
    }
    repl();
  });
};

repl();

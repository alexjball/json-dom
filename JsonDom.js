const _ = require("lodash");

/**
 * Loads a JSON view hierarchy and matches selectors to views.
 */
module.exports = class JsonDom {
  /** Creates a new JsonDom from a JSON string. */
  static parse(domString) {
    return new JsonDom(JSON.parse(domString));
  }

  /** Creates a new JsonDom from the root node of the hierarchy. */
  constructor(rootJson) {
    this.root = rootJson;
    this.viewsByViewClass = {};
    this.viewsByClassName = {};
    this.viewsByIdentifier = {};

    const append = (obj, key, value) => {
      if (!obj[key]) {
        obj[key] = [];
      }
      obj[key].push(value);
    };

    JsonDom._traverseJsonDom(this.root, view => {
      if (view.class) {
        append(this.viewsByViewClass, view.class, view);
      }
      if (view.classNames) {
        view.classNames.forEach(className =>
          append(this.viewsByClassName, className, view)
        );
      }
      if (view.identifier) {
        append(this.viewsByIdentifier, view.identifier, view);
      }
    });
  }

  static _traverseJsonDom(view, visitor) {
    const visitView = view => JsonDom._traverseJsonDom(view, visitor);

    if (view.subviews) {
      view.subviews.forEach(visitView);
    }
    if (view.contentView) {
      visitView(view.contentView);
    }
    if (view.input) {
      visitView(view.input);
    }
    if (view.control) {
      visitView(view.control);
    }

    visitor(view);
  }

  /**
   * Parses a string representing a selector rule.
   *
   * @return an array of chained, compound selector objects: 
   *    [[{classNames: [String], identifier: String, viewClass: String}, ...], ...]
   */
  static _parseRule(rule) {
    const compoundSelectorRe = /(?<viewClass>[\w]+)?(?<classNames>(?:\.[\w\-]*)*)(?:#(?<identifier>[\w\-]+))?/;
    return rule.split(",").map(clause =>
      clause
        .trim()
        .split(" ")
        .map(compoundSelectorString => {
          const {
            groups: { classNames, identifier, viewClass }
          } = compoundSelectorString.match(compoundSelectorRe);

          const compoundSelector = {};
          if (classNames) {
            compoundSelector.classNames = _.compact(classNames.split("."));
          }
          if (identifier) {
            compoundSelector.identifier = identifier;
          }
          if (viewClass) {
            compoundSelector.viewClass = viewClass;
          }

          return compoundSelector;
        })
    );
  }

  /** 
   * Return all views that match the given selector rule string.
   * 
   * The string should consist of comma separate compound selectors. All
   * views that match at least one selector are returned.
   * 
   * Each compound selector has the form (((ViewClass)?(.className)*(#identifier)?.
   *
   * Ex: "Input", "StackView.column,Box,VideoModeSelect#videoMode"
   * 
   * @throws If the selector contains chained rules 
   */
  matchSelector(selectorRule) {
    const rule = JsonDom._parseRule(selectorRule);

    return _.union(
      ...rule.map(chainedCompoundSelector => {
        if (chainedCompoundSelector.length > 1) {
          throw Error(`Unsupported chained selector in selector rule "${selectorRule}"`);
        }
        const m = this._matchCompoundSelector(chainedCompoundSelector[0]);
        return m;
      })
    );
  }

  _matchCompoundSelector(compoundSelector) {
    const toIntersect = [];
    if (compoundSelector.viewClass) {
      toIntersect.push(this.matchViewClass(compoundSelector.viewClass));
    }
    if (compoundSelector.classNames) {
      compoundSelector.classNames.forEach(className =>
        toIntersect.push(this.matchClassName(className))
      );
    }
    if (compoundSelector.identifier) {
      toIntersect.push(this.matchIdentifier(compoundSelector.identifier));
    }
    return _.intersection(...toIntersect);
  }

  matchViewClass(viewClass) {
    return Array.from(this.viewsByViewClass[viewClass] || []);
  }

  matchClassName(className) {
    return Array.from(this.viewsByClassName[className] || []);
  }

  matchIdentifier(identifier) {
    return Array.from(this.viewsByIdentifier[identifier] || []);
  }
}
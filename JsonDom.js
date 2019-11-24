const _ = require("lodash");

const parentViewProperty = Symbol("parentView");

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

    JsonDom._traverseJsonDom(this.root, null, (view, parent) => {
      Object.defineProperty(view, parentViewProperty, {
        enumerable: false,
        value: parent
      });
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

  static _traverseJsonDom(view, viewParent, visitor) {
    const visitView = child => JsonDom._traverseJsonDom(child, view, visitor);

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

    visitor(view, viewParent);
  }

  /**
   * Parses a string representing a selector rule.
   *
   * @return an array of chained, compound selector objects:
   *    [[{classNames: [String], identifier: String, viewClass: String}, ...], ...]
   * @throws SyntaxError if the rule could not be parsed.
   */
  static _parseRule(rule) {
    // Matches (ViewClass)?(.className)*(#identifier)? and captures the view class,
    // all CSS class names, and identifier.
    const compoundSelectorRe = /^([\w]+)?((?:\.[\w\-]*)*)(?:#([\w\-]+))?$/;
    return rule.split(",").map(clause =>
      clause
        .trim()
        .split(" ")
        .map(compoundSelectorString => {
          const [matched, viewClass, classNames, identifier] =
            compoundSelectorString.match(compoundSelectorRe) || [];

          if (!matched) {
            throw SyntaxError(
              `Invalid rule "${rule}"` +
                "\nExpected (ViewClass)?(.className)*(#identifier)?" +
                "\nAllowed characters: A-z, 0-9, _, -"
            );
          }

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
   * The string should consist of comma separate compound, chained selectors. All
   * views that match at least one selector are returned.
   *
   * Each compound selector has the form "(ViewClass)?(.className)*(#identifier)?".
   *
   * Ex: "Input", "StackView.column, StackView Box, VideoModeSelect#videoMode"
   *
   * @returns An array of matched views. The array should not be modified.
   * @throws SyntaxError if the rule can't be parsed.
   */
  matchSelector(selectorRule) {
    const rule = JsonDom._parseRule(selectorRule);

    return _.union(
      ...rule.map(compoundSelectorChain => {
        const [
          childSelector,
          ...ancestorSelectors
        ] = compoundSelectorChain.reverse();
        return this._matchCompoundSelector(childSelector).filter(view =>
          this._checkAncestors(view, ancestorSelectors)
        );
      })
    );
  }

  /**
   * Returns true iff the given view has ancestors matching the selector chain,
   * starting with the first element selector in the chain.
   */
  _checkAncestors(view, compoundSelectorChain) {
    let i = 0;
    view = view[parentViewProperty];
    while (view && i < compoundSelectorChain.length) {
      if (this._checkCompoundSelector(view, compoundSelectorChain[i])) {
        i++;
      }
      view = view[parentViewProperty];
    }
    return i === compoundSelectorChain.length;
  }

  /** Returns true iff the view satisfies the compound selector. */
  _checkCompoundSelector(view, compoundSelector) {
    const classNames = view.classNames || [];
    const classNamesMatch = (
      compoundSelector.classNames || []
    ).every(className => classNames.includes(className));
    return (
      view.identifier === compoundSelector.identifier &&
      view.class === compoundSelector.viewClass &&
      classNamesMatch
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
};

import { append, filter, propEq, keys, pick, dropLast, contains, not, equals, always, compose, join, merge, values, difference, forEach, concat, map, flatten, path, split, last, intersperse, __ } from 'ramda';

export class InvalidField extends Error {
  constructor(field, ...params) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(`Attempted to set undefined field "${field}"`, ...params);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidField);
    }

    // Custom debugging information
    this.field = field;
  }
}

export class InvalidChoice extends Error {
  constructor(field, value, reason, ...params) {
    super(`Attempted to choose [${value}] for [${field}], ${reason}`);

    if (Error.captureStackTrace) Error.captureStackTrace(this, InvalidChoice);

    this.field = field;
    this.value = value;
    this.reason = reason;
  }
}

export default function(definition) {
  // choices that have custom side effects
  const nonLiteral = (f) => not(contains(f.options, values(OptionLiterals)));
  const nonLiteralDefChoices = keys(filter(nonLiteral, definition.fields));
  return class GeneratedBuilder {
    
    constructor(values) {
      this.choices = {};

      function set(field, value) {
        this.choices[field] = value;
      }
      
      const validFields = keys(definition.fields);
      
      Object.keys(values).forEach((field) => {
        const nonLiteralChoices = nonLiteralDefChoices;
        if (not(contains(field, this.fields()))) throw new InvalidField(field);
        const choices = split('.', field);
        const choicePath =  intersperse('options', choices); // append(last(choices), flatten(map(v => [v, 'options'], dropLast(choices))));
        const validOptions = path(append('options', choicePath), definition.fields);
        switch (typeof validOptions) {
          case 'symbol': {
            const notMatchType = compose(not, equals(__, (typeof values[field])));
            switch (validOptions) {
              case OptionLiterals.STRING:
                if (notMatchType('string')) throw new InvalidChoice(field, values[field], 'must be string');
                break;
              case OptionLiterals.NUMBER:
                if (notMatchType('number')) throw new InvalidChoice(field, values[field], 'must be number');
                break;
            }
            break;
          }
          case 'object': {
            if (not(contains(values[field], keys(validOptions)))) {
              throw new InvalidChoice(field, values[field], `must be one of [${join(', ', keys(validOptions))}]`);
              // TODO: I think what I want to do is: when an enumerated option with modifications is chosen it creates a new GeneratedBuilder class using the higher
              // order function. That GeneratedBuilder retains a back link to "this" instance and merges its own options with the ones downstream".
            }
          }
          default:
            break;
        }
        // if we don't have a validation rule, then it is always valid
        const validationRule = path(append('validation', choicePath), definition.fields) || always(true);
        if (not(validationRule(values[field]))) throw new InvalidChoice(field, values[field], )
        set.call(this, field, values[field]);
      });
    }

    static createFrom(origin, config) {
      return new this.prototype.constructor(config);
    }

    fields() {
      const root = keys(definition.fields)
      return concat(root, flatten(map((f) => {
        const nestedKey = i => `${f}.${i}`;
        return map(nestedKey, keys(definition.fields[f].options[this.choices[f]]));
      }, root)));
    }

    requires() {
      return keys(filter(propEq('required', true), definition.fields));
    }

    missing() {
      let result = [];
      const undefinedChoice = (field) => (this.choices[field] === undefined);
      // fields missing values
      const rootMissing = filter(undefinedChoice, keys(definition.fields));
      // non-literal fields with values
      const nextLevel = difference(nonLiteralDefChoices, rootMissing);
      const nestedMissing = flatten(map((f) => {
        const innerFields = definition.fields[f].options[this.choices[f]];
        const nestedKey = i => `${f}.${i}`;
        const innerKeys = map(nestedKey, keys(innerFields));
        return filter(undefinedChoice, innerKeys);
      }, nextLevel));
      return concat(rootMissing, nestedMissing);
    }

    options(field) {

      return definition.fields[field].options;
    }

    choose(field, value) {
      return new GeneratedBuilder.prototype.constructor(merge(this.choices, { [field]: value }));
    }

    get(field) {
      return this.choices[field];
    }
  }
}

const STRING = Symbol('STRING');
const NUMBER = Symbol('NUMBER');
export const OptionLiterals = {
  STRING: STRING,
  NUMBER: NUMBER,
};

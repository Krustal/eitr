import { filter, propEq, keys, pick, contains, not, equals, always, compose, join, __ } from 'ramda';

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
  return class GeneratedBuilder {
    constructor(values) {
      this.choices = {};

      function set(field, value) {
        this.choices[field] = value;
      }
      
      Object.keys(values).forEach((field) => {
        if (not(contains(field, keys(definition.fields)))) throw new InvalidField(field);
        const validOptions = definition.fields[field].options;
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
            }
          }
          default:
            break;
        }
        // if we don't have a validation rule, then it is always valid
        const validationRule = definition.fields[field].validation || always(true);
        if (not(validationRule(values[field]))) throw new InvalidChoice(field, values[field], )
        set.call(this, field, values[field]);
      });
    }

    static createFrom(origin, config) {
      return new this.prototype.constructor(config);
    }

    requires() {
      return keys(filter(propEq('required', true), definition.fields));
    }

    missing() {
      return filter((f) => (this.choices[f] === undefined), keys(definition.fields));
    }

    options(field) {
      return definition.fields[field].options;
    }

    choose(field, value) {
      return GeneratedBuilder.createFrom(this, { [field]: value });
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

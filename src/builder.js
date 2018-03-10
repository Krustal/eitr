import {
  append,
  filter,
  propEq,
  keys,
  contains,
  not,
  equals,
  always,
  compose,
  join,
  merge,
  values,
  concat,
  map,
  flatten,
  path,
  split,
  last,
  reduce,
  cond,
  type,
  identity,
  init,
  ifElse,
  reject,
  isNil,
  tail,
  chain,
  prop,
  isEmpty,
  complement,
  __,
} from 'ramda';

import { InvalidField, InvalidChoice } from './errors';

const STRING = Symbol('STRING');
const NUMBER = Symbol('NUMBER');
export const OptionLiterals = {
  STRING,
  NUMBER,
};

export const Builder = function(definition) {
  return class GeneratedBuilder {
    constructor(setupValues) {
      this.choices = {};
      this.mods = {};
      const set = (field, value) => {
        this.choices[field] = value;
        const mods = (this._choiceConfig(field).options[value] || {}).modifiers;
        if (mods) {
          keys(mods).forEach(moddedField => {
            if (!this.mods[moddedField]) this.mods[moddedField] = {};
            if (!this.mods[moddedField][mods[moddedField].category]) {
              this.mods[moddedField][mods[moddedField].category] = [];
            }
            this.mods[moddedField][mods[moddedField].category].push(
              mods[moddedField].fn
            );
          });
        }
      };
      keys(setupValues).forEach(field => {
        this.validateOption(field, setupValues);
        set.call(this, field, setupValues[field]);
      });
    }

    static createFrom(origin, config) {
      return new this.prototype.constructor(config);
    }

    validateOption(field, setupValues) {
      if (not(contains(field, this.fields()))) throw new InvalidField(field);
      const choiceConfig = this._choiceConfig(field);
      const validOptions = choiceConfig.options;
      switch (typeof validOptions) {
        case 'symbol': {
          const notMatchType = compose(
            not,
            equals(__, typeof setupValues[field])
          );
          switch (validOptions) {
            case OptionLiterals.STRING:
              if (notMatchType('string')) {
                throw new InvalidChoice(
                  field,
                  setupValues[field],
                  'must be string'
                );
              }
              break;
            case OptionLiterals.NUMBER:
              if (notMatchType('number')) {
                throw new InvalidChoice(
                  field,
                  setupValues[field],
                  'must be number'
                );
              }
              break;
            default:
              break;
          }
          break;
        }
        case 'object': {
          if (not(contains(setupValues[field], keys(validOptions)))) {
            throw new InvalidChoice(
              field,
              setupValues[field],
              `must be one of [${join(', ', keys(validOptions))}]`
            );
          }
          break;
        }
        default:
          break;
      }
      // if we don't have a validation rule, then it is always valid
      const validationRule = choiceConfig.validation || always(true);
      if (not(validationRule(setupValues[field]))) {
        throw new InvalidChoice(field, setupValues[field]);
      }
    }

    fields() {
      const ideaFn = (config, breadcrumb = []) => {
        const { fields } = config;
        const field = join('.', breadcrumb);
        const children = keys(fields);
        const response = [
          field,
          map(key => {
            const { options } = fields[key];
            const route = append(key, breadcrumb);
            const choicePath = join('.', reject(isNil, route));
            const optionsAreLiteral = equals('Symbol', type(options));
            const hasChoice = this.choices[choicePath] === undefined;
            if (optionsAreLiteral || hasChoice) return choicePath;
            return ideaFn(options[this.choices[choicePath]], route);
          }, children),
        ];
        return flatten(response);
      };
      // remove the empty string field that is generated for the root
      return tail(ideaFn(definition));
    }

    // TODO: requires should not return fields that have been filled
    // eslint-disable-next-line class-methods-use-this
    requires() {
      return keys(filter(propEq('required', true), definition.fields));
    }

    missing() {
      const undefinedChoice = field => this.choices[field] === undefined;
      const literalChoice = f => contains(f.options, values(OptionLiterals));
      const findMissingFor = chain(choicePath => {
        const choice = this.choices[choicePath];
        const choiceFields = path(['options', choice, 'fields']);
        const config = this._choiceConfig(choicePath);
        const fields = isNil(choice) ? config : choiceFields(config);
        // TODO: still bugs me that I need these branches
        const addBreadcrumb = field =>
          ifElse(isEmpty, always(field), concat(__, `.${field}`))(choicePath);
        const fullChoicePaths = map(addBreadcrumb);
        // choices at this level that are unmade
        const missingChoices = filter(
          undefinedChoice,
          fullChoicePaths(keys(fields))
        );
        // made choices that need further exploration
        const nonLiteralChoices = keys(reject(literalChoice, fields || []));
        const madeChoices = filter(
          complement(undefinedChoice),
          fullChoicePaths(nonLiteralChoices)
        );
        return concat(missingChoices, findMissingFor(madeChoices));
      });
      return findMissingFor(['']);
    }

    /**
     * @private
     * Given a period seperated path, returns the config for the
     * option. Each step in the path will follow that field and
     * the choice made for it so you don't have to re-specify the
     * choice.
     * @example
     * let Character = new Builder(config);
     * let ragnar = new Character({ a: 'first' });
     * ragnar.choiceConfig('a.b');
     * // => { options: { second: { foo: 'baz' } } };
     * @param {string} field - period seperated path to field
     * @returns {object} - object configuring field following field path
     */
    _choiceConfig(field) {
      const breadcrumb = split('.', field);
      const choices = reject(isNil, init(breadcrumb));
      const builtPath = append(
        last(breadcrumb),
        chain(
          option => [option, 'options', this.choices[option], 'fields'],
          choices
        )
      );
      return path(reject(isEmpty, builtPath), definition.fields);
    }

    /**
     * Given a period seperated list of options, resolves the path to provide
     * a list of valid choices that can passed to `.choose()` or a symbol for
     * literal types (e.g. string, number).
     * @param {string} field - period seperated path to field
     * @return {string[]|symbol} - list of valid option choices
     */
    options(field) {
      const options = prop('options', this._choiceConfig(field));

      return cond([
        [compose(equals('Symbol'), type), identity],
        [compose(equals('Object'), type), keys],
      ])(options);
    }

    modifiers(field) {
      return this.mods[field];
    }

    choose(field, value) {
      return new GeneratedBuilder.prototype.constructor(
        merge(this.choices, { [field]: value })
      );
    }

    get(field) {
      const priority = ['*', '+']; // TODO: should be configurable eventually
      const mods = this.modifiers(field) || {};
      const result = reduce(
        (acc, elem) => reduce((iAcc, mod) => mod(iAcc), acc, mods[elem] || []),
        this.choices[field],
        priority
      );
      return result;
    }
  };
};

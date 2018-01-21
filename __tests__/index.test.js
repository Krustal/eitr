import Builder, { OptionLiterals, InvalidField, InvalidChoice } from 'builder';

// example of a class configuration (post-compile)
const testDefinition = {
  name: '13th Age',
  fields: {
    name: { options: OptionLiterals.STRING, required: true },
    level: {
      options: OptionLiterals.NUMBER, 
      validation: (v) => (v >= 1 && v <= 10), 
      required: true 
    },
    hometown: { options: OptionLiterals.STRING },
    class: {
      options: {
        fighter: {},
        barbarian: {},
      }
    }
  },
};

function testCharBuilder(startValues = {}) {
  const Creator = new Builder(testDefinition);
  return new Creator(startValues);
}

describe('creating a builder', () => {
  describe('constructor', () => {
    it('can set multiple fields from a config param', () => {
      const character = testCharBuilder({ name: 'Ragnar', hometown: 'Neverwinter', class: 'fighter' });
      expect(character.get('name')).toEqual('Ragnar');
      expect(character.get('hometown')).toEqual('Neverwinter');
      expect(character.get('class')).toEqual('fighter');
    });
    it('throws if given values for undefined fields', () => {
      expect(() => testCharBuilder({ favoriteColor: 'red' })).toThrowError(InvalidField);
    });
    it('throws if given values of incorrect type to a field', () => {
      expect(() => testCharBuilder({ name: 1 })).toThrowError(InvalidChoice);
      expect(() => testCharBuilder({ level: 'one' })).toThrowError(InvalidChoice);
    });
    it('throws if given a value that violates field\'s validation rule', () => {
      expect(() => testCharBuilder({ level: 30 })).toThrowError(InvalidChoice);
    });
    it('throw if given a value that is not among the list of options', () => {
      expect(() => testCharBuilder({ class: 'accountant' })).toThrowError(InvalidChoice);
    });
    it('imposes modifications defined by the option choice');
  });
  it('can list required fields', () => {
    const required = testCharBuilder().requires();
    const expected = expect.arrayContaining(['name', 'level']);
    const unexpected = expect.arrayContaining(['hometown']);
    expect(required).toEqual(expected);
    expect(required).not.toEqual(unexpected)
  });
  it('lists possible fields', () => {
    const missing = testCharBuilder().missing();
    const expected = expect.arrayContaining(['name', 'level', 'hometown']);
    expect(missing).toEqual(expected);
  });
  describe('.options([fieldName])', () => {
    it('returns valid options for literal fields', () => {
      const options = testCharBuilder().options('name');
      const expected = OptionLiterals.STRING;
      expect(options).toEqual(expected);
    });

    it('returns the options for custom fields', () => {
      const options = testCharBuilder().options('class');
      const expected = expect.arrayContaining(['fighter', 'barbarian']);
    })
  });

  describe('.choose([fieldName], [value])', () => {
    it('creates a new character', () => {
      const character = testCharBuilder();
      const nextCharacter = character.choose('name', 'Ragnar');
      expect(nextCharacter).not.toBe(character);
    });
    it('returns a character with the field set', () => {
      const nextCharacter = testCharBuilder().choose('name', 'Ragnar');
      expect(nextCharacter.get('name')).toEqual('Ragnar');
    });
    it('updates list of possible fields', () => {
      const missing = testCharBuilder().choose('name', 'Ragnar').missing();
      const expected = expect.arrayContaining(['level', 'hometown']);
      const unexpected = expect.arrayContaining(['name']);
      expect(missing).toEqual(expected);
      expect(missing).not.toEqual(unexpected);
    });
  });
});

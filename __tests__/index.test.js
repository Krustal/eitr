import Builder, { OptionLiterals, InvalidField, InvalidChoice } from "builder";

// example of a class configuration (post-compile)
const testDefinition = {
  name: "13th Age",
  fields: {
    name: { options: OptionLiterals.STRING, required: true },
    level: {
      options: OptionLiterals.NUMBER,
      validation: v => v >= 1 && v <= 10,
      required: true
    },
    hometown: { options: OptionLiterals.STRING },
    class: {
      options: {
        fighter: {
          fields: {
            ability: { options: { str: {}, con: {} } },
            weapon: {
              options: {
                one_handed: {
                  fields: {
                    size: {
                      options: { small: {}, medium: {} }
                    }
                  }
                },
                two_handed: {}
              }
            }
          }
        },
        barbarian: {}
      }
    }
  }
};

function testCharBuilder(startValues = {}) {
  const Creator = new Builder(testDefinition);
  return new Creator(startValues);
}

describe("creating a builder", () => {
  describe("constructor", () => {
    it("can set multiple fields from a config param", () => {
      const character = testCharBuilder({
        name: "Ragnar",
        hometown: "Neverwinter",
        class: "fighter"
      });
      expect(character.get("name")).toEqual("Ragnar");
      expect(character.get("hometown")).toEqual("Neverwinter");
      expect(character.get("class")).toEqual("fighter");
    });
    it("can set options introduced by earlier options", () => {
      const character = testCharBuilder({
        class: "fighter",
        "class.ability": "str"
      });
      expect(character.get("class")).toEqual("fighter");
      expect(character.get("class.ability")).toEqual("str");
    });
    it("throws if given values for undefined fields", () => {
      expect(() => testCharBuilder({ favoriteColor: "red" })).toThrowError(
        InvalidField
      );
    });
    it("throws if given values for a nested choice, when the parent choice isn't made yet", () => {
      expect(() => testCharBuilder({ "class.ability": "str" })).toThrowError(
        InvalidField
      );
    });
    it("throws if given values of incorrect type to a field", () => {
      expect(() => testCharBuilder({ name: 1 })).toThrowError(InvalidChoice);
      expect(() => testCharBuilder({ level: "one" })).toThrowError(
        InvalidChoice
      );
    });
    it("throws if given a value that violates field's validation rule", () => {
      expect(() => testCharBuilder({ level: 30 })).toThrowError(InvalidChoice);
    });
    it("throw if given a value that is not among the list of options", () => {
      expect(() => testCharBuilder({ class: "accountant" })).toThrowError(
        InvalidChoice
      );
    });
    it("imposes modifications defined by the option choice");
  });
  describe(".fields()", () => {
    it("can list all fields, even once chosen", () => {
      const character = testCharBuilder().choose("name", "Ragnar");
      expect(character.fields()).toEqual(
        expect.arrayContaining(["name", "level"])
      );
    });
    it("can list all fields, even ones added by a choice", () => {
      const character = testCharBuilder()
        .choose("class", "fighter")
        .choose("class.weapon", "one_handed");
      const expecting = expect.arrayContaining([
        "name",
        "class.ability",
        "class.weapon",
        "class.weapon.size"
      ]);
      expect(character.fields()).toEqual(expecting);
      expect(character.fields()).not.toContain("");
    });
  });
  it("can list required fields", () => {
    const required = testCharBuilder().requires();
    const expected = expect.arrayContaining(["name", "level"]);
    const unexpected = expect.arrayContaining(["hometown"]);
    expect(required).toEqual(expected);
    expect(required).not.toEqual(unexpected);
  });
  it("lists possible fields", () => {
    const missing = testCharBuilder().missing();
    const expected = expect.arrayContaining(["name", "level", "hometown"]);
    expect(missing).toEqual(expected);
  });
  describe(".options([fieldName])", () => {
    it("returns valid options for literal fields", () => {
      const options = testCharBuilder().options("name");
      const expected = OptionLiterals.STRING;
      expect(options).toEqual(expected);
    });

    it("returns the options for custom fields", () => {
      const options = testCharBuilder().options("class");
      const expected = expect.arrayContaining(["fighter", "barbarian"]);
      expect(options).toEqual(expected);
    });

    it("returns the options for nested options", () => {
      const character = testCharBuilder().choose("class", "fighter");
      const expected = expect.arrayContaining(["one_handed", "two_handed"]);
      expect(character.options("class.weapon")).toEqual(expected);
    });
  });

  describe(".choose([fieldName], [value])", () => {
    it("creates a new character", () => {
      const character = testCharBuilder();
      const nextCharacter = character.choose("name", "Ragnar");
      expect(nextCharacter).not.toBe(character);
    });
    it("returns a character with the field set", () => {
      const nextCharacter = testCharBuilder().choose("name", "Ragnar");
      expect(nextCharacter.get("name")).toEqual("Ragnar");
    });
    it("removes choice from list of possible fields", () => {
      const missing = testCharBuilder()
        .choose("name", "Ragnar")
        .missing();
      const expected = expect.arrayContaining(["level", "hometown"]);
      const unexpected = expect.arrayContaining(["name"]);
      expect(missing).toEqual(expected);
      expect(missing).not.toEqual(unexpected);
    });
    it("can be chained", () => {
      const character = testCharBuilder()
        .choose("name", "ragnar")
        .choose("level", 3);
      expect(character.get("name")).toEqual("ragnar");
      expect(character.get("level")).toEqual(3);
    });
    it("can nest", () => {
      const character = testCharBuilder()
        .choose("class", "fighter")
        .choose("class.weapon", "one_handed");
      expect(character.get("class")).toEqual("fighter");
      expect(character.get("class.weapon")).toEqual("one_handed");
    });
    it("can add new choices", () => {
      const character = testCharBuilder().choose("class", "fighter");
      expect(character.missing()).toEqual(
        expect.arrayContaining(["class.ability"])
      );
    });
    xit("can add new choices that nest", () => {
      const character = testCharBuilder()
        .choose("class", "fighter")
        .choose("class.weapon", "one_handed");
      expect(character.missing()).toEqual(
        expect.arrayContaining(["class.weapon.handed"])
      );
    });
  });
});

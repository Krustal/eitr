```
# custom definition for a character
character "13th Age"
    name* # a generic field, required
    hometown # a generic field, not required
    level* (int,1,10) # a numeric field restricted to values >= 0 or <= 10
    race?* (Race) # a custom field (choice) based on the options of "Race"
    class?* (Class)
    class2?[!class] (Class) # a custom field (choice) of Options Class, cannot duplicate `class`

    # a namespaced group of fields (useful when referring to values, avoiding namespace collisions, or defining broad rules)
    attributes
        str (int) | * + # field of numeric type that applies "*" modifiers followed by "+" modifiers, and then any remaining (optionally throwing a warning)
        dex (int)
        con (int)
        int (int)
        wis (int)
        cha (int)

    attributeMods
        str (int) = (attributes.str - 10) / 2 # computed field, cannot be directly edited
        dex (int) = (attributes.dex - 10) / 2

    attributeModsPlusLevel
        str (int) = attributeMods.str + level

    Options Class
        fighter
            # option with restriction, cannot equal race choices attribute bonus
            attributeBonus?[!race.attributeBonus]
                # inline choices
                str: attributes.str + 2 # "+" modifier, add 2 to attribute strength
                con # options can either follow a `:` on a single line or cover multiple lines with indent
                    attributes.con + 2
        barbarian
            attributeBonus?
                str: attributes.str + 2
                dex: attributes.dex + 2

    Options Race
        human
            attributeBonus?[!class.attributeBonus]
                str: attributes.str + 2
                dex: attributes.dex + 2
```

Outputs a immutable constructor for the character builder rules.

```
const charBuilder = new Builder("config.file");

const character = charBuilder(); // un-configured character
character.isDone();
// => false
character.requires();
// => ['name', 'level', 'race', 'class']
character.missing();
// => ['hometown', 'class2']
character.options('name');
// => String()
character.options('level');
// => Number(1-10)
character.options('race');
// => Race(['human', 'dwarf'])

character
const withName = character.set('name', 'Highchurch');
character.get('name')
// => "Highchurch"

// bulk setup
const character = charBuilder({
    name: 'Highchurch',
    level: 3,
    str: 12, // namespaces are optional, if there is no collision, during configuration
    'attributes.dex': 10, // namespaces can be specified as a dot seperated path
    attributes: { // or as a nested object.
        wis: 8
    }
    class: 'fighter' // string matching choice name,
    'class.attributeBonus': 'str', // string matching choice path and name

    'invalid.
})

// output will flatten
character.toString();
// =>
// Name: 'Highchurch'
// level: 3
// class: 'fighter'
// str: 14  // notice the output of strength is given after modifiers are applied
```

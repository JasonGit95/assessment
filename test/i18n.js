const fs = require('fs');
const YAML = require('yaml');

const lang = process.env.CHALLENGE_LANGUAGE || 'ja';
const langMap = {};
add(`locale/${lang}.yml`);

module.exports = {
    text: tagify(text => langMap[text] || text),
    add: add,
};

function tagify(fn) {
    return function(strings, ...values) {
        if (typeof strings === 'string') {
            return fn(strings);
        } else {
            return String.raw.apply(String,
              [{ raw: strings.raw.map(s => fn(s)) }].concat(values.map(s => fn(s)) || [])
            );
        }
    }
}

function add(target) {
    if (typeof target === 'string') {
        try {
            Object.assign(langMap, YAML.parse(fs.readFileSync(target, 'utf8')));
        } catch (_) { /* Do nothing */ }
    } else {
        Object.assign(langMap, target);
    }
}

function ms(ms = 10) { // wait a little to stabilize tests
    return new Promise((res, rej) => {
        setTimeout(() => res(), ms);
    });
}

function traverse(el, fn) {
    fn(el);
    for (const child of el.childNodes) {
        traverse(child, fn);
    }
}

function isAncestor(ancestor, el) {
    while((el = el.parentNode)) {
        if (ancestor === el) {
            return true;
        }
    }
    return false;
}

module.exports = {
    ms,
    traverse,
    isAncestor,
}
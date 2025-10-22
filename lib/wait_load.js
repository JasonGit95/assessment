function ms(ms = 10) { // wait a little to stabilize tests
    return new Promise((res, rej) => {
        setTimeout(() => res(), ms);
    });
}

function waitLoad(dom) {
    return new Promise(async (resolve, reject) => {
        let completed = false;
        for(let iter = 0; iter < 200; iter++) {
            if (dom.window.document.readyState == "complete") {
                completed = true;
                await ms(300);
                break;
            }
            await ms(30);
        }
        completed ? resolve() : reject();
    });
}

module.exports = {
    waitLoad,
}

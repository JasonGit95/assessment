"use strict";

const _ = require("./i18n").text;
const jsdom = require("jsdom");
const { JSDOM, VirtualConsole } = jsdom;
const expect = require("chai").expect;
const got = require("got");
const fetch = require("node-fetch");
const { ms, traverse } = require("./util");
const { waitLoad } = require("../lib/wait_load");
const cp = require("child_process");

class App {
  static async create(server) {
    const http = cp.spawn("python3", ["-m", "http.server", "8888"], { cwd: "./public" });
    await ms(1000);
    const virtualConsole = new VirtualConsole();
    const domOption = {
      resources: "usable",
      runScripts: "dangerously",
      virtualConsole,
    };
    const dom = await App.retrieveDOM("http://localhost:8888/", domOption, 0);
    dom.window.Element.prototype.__defineGetter__("innerText", function() {
      return this.textContent;
    });
    dom.window.Element.prototype.__defineSetter__("innerText", function(val) {
      this.textContent = val;
    });
    dom.window.requestAnimationFrame = () => {};
    dom.window.fetch = fetch;
    await ms();
    const app = new App(dom, server, http);
    await waitLoad(app.dom);
    virtualConsole.sendTo(console);
    return app;
  }

  static async retrieveDOM(url, domOptions, retryCount) {
    await ms(500);
    try {
      return await JSDOM.fromURL(url, domOptions);
    } catch (e) {
      if (retryCount >= 10) {
        throw e;
      }
      return await App.retrieveDOM(url, domOptions, retryCount + 1);
    }
  }

  constructor(dom, server, http) {
    this.dom = dom;
    this.server = server;
    this.http = http;
    this.token = this.uuid();
    const document = dom.window.document;
    this.elements = {
      accessToken: () => document.querySelector("input[type='text']#access_token"),
      login: () => document.querySelector("button#login"),
      category: n => document.querySelector(`#category-${n}`),
      categories: () => {
        const result = [];
        traverse(document.body, el => {
          if (/^category-\d+$/.test(el.id)) {
            result.push(el);
          }
        });
        return result;
      },
      categoryTitle: n => document.querySelector(`#category-${n}-title`),
      memo: n => document.querySelector(`#memo-${n}`),
      memos: () => {
        const result = [];
        traverse(document.body, el => {
          if (/^memo-\d+$/.test(el.id)) {
            result.push(el);
          }
        });
        return result;
      },
      memoTitle: () => document.querySelector("input[type='text']#memo-title"),
      memoContent: () => document.querySelector("textarea#memo-content"),
      saveMemo: () => document.querySelector("button#save-memo"),
      newMemo: () => document.querySelector("button#new-memo"),
      deleteMemo: () => document.querySelector("button#delete-memo"),
      in: () => dom.window.document.querySelectorAll("input[type='text'], input[type='number']"),
      button: () => dom.window.document.querySelectorAll("button"),
      out: () => dom.window.document.querySelectorAll("span"),
    };
  }

  uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
        .split('')
        .map(c => {
          switch (c) {
            case 'x': return (Math.random() * 16 | 0).toString(16);
            case 'y': return ((Math.random() * 4 | 0) + 8).toString(16);
            default: return c;
          }
        })
        .join('');
  }

  async login() {
    const accessToken = this.elements.accessToken();
    const login = this.elements.login();
    expect(accessToken, _`Element #access_token is missing.`).to.exist;
    expect(login, _`Element #login is missing`).to.exist;
    await this._input(accessToken, this.token);
    await this._click(login);
    await ms(1500);
    return this.token;
  }

  async clickCategoryItem(id) {
    const el = this.elements.categoryTitle(id);
    expect(el, _`Element #category-${id}-title is missing.`).to.exist;
    await this._click(el);
    await ms(1500);
  }

  async clickMemoItem(id) {
    const el = this.elements.memo(id);
    expect(el, _`Element #memo-${id} is missing.`).to.exist;
    await this._click(el);
    await ms(1500);
  }

  async setEditingMemo(title, content) {
    const el_title = this.elements.memoTitle();
    const el_content = this.elements.memoContent();
    expect(el_title, _`Element #memo-title is missing.`).to.exist;
    expect(el_content, _`Element #memo-content is missing.`).to.exist;
    await this._input(el_title, title);
    await this._input(el_content, content);
    await ms();
  }

  async saveMemo(title, content) {
    await this.setEditingMemo(title, content);
    const el_save = this.elements.saveMemo();
    expect(el_save, _`Element #save-memo is missing.`).to.exist;
    await this._click(el_save);
    await ms(1500);
  }

  async createMemo() {
    const el = this.elements.newMemo();
    expect(el, _`Element #new-memo is missing.`).to.exist;
    await this._click(el);
    await ms(1500);
  }

  async deleteMemo() {
    const el = this.elements.deleteMemo();
    expect(el, _`Element #delete-memo is missing.`).to.exist;
    await this._click(el);
    await ms(1500);
  }

  async getMemo() {
    const el_title = this.elements.memoTitle();
    const el_content = this.elements.memoContent();
    expect(el_title, _`Element #memo-title is missing.`).to.exist;
    expect(el_content, _`Element #memo-content is missing.`).to.exist;
    return {
      title: el_title.value,
      content: el_content.value,
    };
  }

  async dataset() {
    // console.log(`${this.server}/admin/_dataset?token=${this.token}`);
    return (await got(`${this.server}/admin/_dataset?token=${this.token}`, { responseType: "json" })).body;
  }

  async close() {
    this.http.kill();
    await got(`${this.server}/admin/_close?token=${this.token}`);
  }


  async _input(el, value) {
    if (!el) {
      return;
    }
    let lastValue = el.value;
    el.value = value;
    let event = new this.dom.window.InputEvent("input", {bubbles: true});

    // hack for React15
    event.simulated = true;

    // hack for React 16
    let tracker = el._valueTracker;
    if (tracker) {
      tracker.setValue(lastValue);
    }

    el.dispatchEvent(event);
    el.dispatchEvent(new this.dom.window.Event("change", {bubbles: true}));
    await ms();
  }

  async _click(el) {
    if (el.click) {
      el.click();
    } else {
      el.dispatchEvent(new this.dom.window.Event("click", {bubbles: true, cancelable: true}));
    }
    await ms();
  }
}

module.exports = App;

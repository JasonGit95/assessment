"use strict";

const _ = require("./i18n").text;
const expect = require("chai").expect;
const App = require("./app");
const u = require("./util");

const API_SERVER = "https://challenge-server.tracks.run/memoapp";
describe("", function() {
  this.timeout(10000);

  let app;
  beforeEach("", async () => {
    app = await App.create(API_SERVER);
  });

  afterEach(async () => {
    app.close();
  });

  it(_`[Step 1] Elements for the login feature exist.`, async () => {
    expect(app.elements.accessToken(), _`#access_token element is missing.`).to.exist;
    expect(app.elements.login(), _`#login element is missing.`).to.exist;
  });

  it(_`[Step 1] #access_token is enabled at initial state.`, async () => {
    const el = app.elements.accessToken();
    expect(el, _`#access_token element is missing.`).to.exist;
    expect(el.disabled, _`#access_token element is disabled.`).to.be.false;
  });

  it(_`[Step 1] #login becomes enabled only when a valid token is assigned to #access_token.`, async () => {
    expect(app.elements.accessToken(), _`Element is missing.`).to.exist;
    expect(app.elements.login(), _`Element is missing.`).to.exist;

    const tests = [
      [_`UUID`, app.uuid(), false],
      [_`UUID`, app.uuid(), false],
      [_`UUID`, app.uuid(), false],
      [_`null character`, "", true],
      [_`character "a"`, "a", true],
      [_`UUID (v1)`, "6f308468-b879-11ea-b3de-0242ac130004", true],
      [_`UUID (v4; Large character)`, "1ae903cf-f9f4-4c69-bbaa-6726b1edeccd".toUpperCase(), true],
      [_`UUID (v4; No hyphen)`, "1ae903cf-f9f4-4c69-bbaa-6726b1edeccd".replace(/-/g), true],
    ];

    for (const [title, input, expected] of tests) {
      const el = app.elements.accessToken();
      const prevVal = el.value;
      el.value = input;
      const e = new app.dom.window.Event("input", {bubbles: true});
      e.simulated = true;
      const tracker = el._valueTracker;
      if (tracker) {
        tracker.setValue(prevVal);
      }
      el.dispatchEvent(e);
      await u.ms();
      expect(app.elements.login().disabled,
          expected ? _`#login is enabled when ${title} is entered.`
              : _`#login is disabled when ${title} is entered.`
      ).to.be.equal(expected);
    }
  });

  it(_`[Step 1] #access_token and #login become disabled when #login is clicked.`, async () => {
    await app.login();

    expect(app.elements.accessToken().disabled, _`#access_token is enabled.`).to.be.true;
    expect(app.elements.login().disabled, _`#login is enabled.`).to.be.true;
  });

  it(_`[Step 1] A request to enumerate the category list is issued when #login is clicked.`, async () => {
    await app.login();

    const calls = (await app.dataset()).calls;
    expect(calls, _`The request to enumerate the category list was not issued.`).to.include("GET /category");
  });

  it(_`[Step 2] The category list is displayed after the login.`, async () => {
    await app.login();

    const categories = (await app.dataset()).categories;
    for (const {id, name} of categories) {
      const el_category = app.elements.category(id);
      const el_categoryTitle = app.elements.categoryTitle(id);
      expect(el_category, _`#category-${id} element is missing.`).to.exist;
      expect(el_categoryTitle, _`#category-${id}-title element is missing.`).to.exist;
      expect(u.isAncestor(el_category, el_categoryTitle), _`#category-${id}-title is not a child element of  #category-${id}.`).to.be.true;
      expect(el_categoryTitle.textContent, _`#category-${id}-title is displaying a wrong title.`).to.equal(name);
    }
  });

  it(_`[Step 2] The corresponding Memo Item is displayed when a Category Item is clicked once.`, async () => {
    await app.login();
    await app.clickCategoryItem(2); //Restaurants

    const expected = [
      { id: 'memo-10', title: "Blue Plate" },
      { id: 'memo-11', title: "Daily Grill"},
    ];
    const actual = app.elements.memos();
    expect(actual.map(el => el.id), _`The displayed id of the Memo Item is wrong.`).to.eql(expected.map(el => el.id));
    expect(actual.map(el => el.textContent), _`The displayed content of the Memo Item is wrong.`).to.eql(expected.map(el => el.title));
  });

  it(_`[Step 2] The Category Item is minimized when the same Category Item is clicked twice.`, async () => {
    await app.login();
    await app.clickCategoryItem(2); //Restaurants
    await app.clickCategoryItem(2);

    const actual = app.elements.memos()
        .map(el => el.textContent);
    expect(actual, _`A Memo Item is still displayed.`).to.have.lengthOf(0);
  });

  it(_`[Step 2] Every Category Item is minimized after the login.`, async () => {
    await app.login();

    const actual = app.elements.memos()
        .map(el => el.textContent);
    expect(actual, _`A Memo Item is still displayed.`).to.have.lengthOf(0);
  });

  it(_`[Step 3] Elements for the memo editing feature exist in the initial state.`, async () => {
    expect(app.elements.memoTitle(), _`#memo-title element is missing.`).to.exist;
    expect(app.elements.memoContent(), _`#memo-content element is missing.`).to.exist;
    expect(app.elements.saveMemo(), _`#save-memo element is missing.`).to.exist;
  });

  it(_`[Step 3] A request to get the memo is issued when a memo is selected.`, async () => {
    await app.login();
    await app.clickCategoryItem(2); // Restaurants
    await app.clickMemoItem(11); // Daily Grill

    const calls = (await app.dataset()).calls;
    expect(calls, _`The request to get the selected memo was not issued.`).to.include("GET /memo/{id}");
  });

  it(_`[Step 3] The content of a memo is displayed when a memo is selected.`, async () => {
    expect(app.elements.memoTitle(), _`#memo-title element is missing.`).to.exist;
    expect(app.elements.memoContent(), _`#memo-content element is missing.`).to.exist;

    await app.login();
    await app.clickCategoryItem(2); // Restaurants
    await app.clickMemoItem(11); // Daily Grill

    expect(app.elements.memoTitle().value, _`#memo-title is displaying a wrong title.`).to.eql("Daily Grill");
    expect(app.elements.memoContent().value, _`#memo-content is displaying a wrong content.`).to.eql("13 Newcastle Ave. Woodbridge, VA 22191");
  });

  it(_`[Step 3] A request to update the selected memo is issued when #save-memo is clicked.`, async () => {
    const expected = {
      id: 11,
      category_id: 2,
      title: "★ Daily Grill",
      content: "15 Newcastle Ave. Woodbridge, VA 22222"
    };
    await app.login();
    await app.clickCategoryItem(2); // Restaurants
    await app.clickMemoItem(11); // Daily Grill
    await app.saveMemo(expected.title, expected.content);

    const dataset = await app.dataset();
    expect(dataset.calls, _`The request to update the selected memo was not issued.`).to.include("PUT /memo/{id}");
    expect(dataset.memos.filter(m => m.id === expected.id)[0], _`The memo was not updated correctly.`).to.eql(expected);
  });

  it(_`[Step 4] Elements for a memo adding feature exist.`, async () => {
    expect(app.elements.newMemo(), _`#new-memo element is missing.`).to.exist;
  });

  it(_`[Step 4] When a Category Item is expanded, the #new-memo element is enabled.`, async () => {
    const el = app.elements.newMemo();
    expect(el, _`#new-memo element is missing.`).to.exist;

    await app.login();
    expect(el.disabled, _`#new-memo element is enabled. (Initial state)`).to.be.true;
    await app.clickCategoryItem(2); // Restaurants
    expect(el.disabled, _`#new-memo element is disabled. (Expanded)`).to.be.false;
  });

  it(_`[Step 4] A request to add a memo is issued when #new-memo is clicked.`, async () => {
    await app.login();
    await app.clickCategoryItem(2); // Restaurants
    await app.createMemo();

    const dataset = await app.dataset();
    expect(dataset.calls, _`The request to update the memo was not issued.`).to.include("POST /memo");
  });

  it(_`[Step 4] Memo Item is added and selected when #new-memo is clicked.`, async () => {
    await app.login();
    await app.clickCategoryItem(2); // Restaurants
    await app.createMemo();

    const dataset = await app.dataset();
    const newMemo = dataset.memos[dataset.memos.length - 1];

    const el_newMemo = app.elements.memo(newMemo.id);
    expect(el_newMemo, _`A memo was not added to the list.`).to.exist;
    expect(u.isAncestor(app.elements.category(2), el_newMemo), _`The added Memo Item is displayed with a different category.`).to.be.true
  });

  it(_`[Step 5] Elements for the memo deleting feature exist.`, async () => {
    expect(app.elements.deleteMemo(), _`#delete-memo element is missing.`).to.exist;
  });

  it(_`[Step 5] The #delete-memo element is enabled when a memo item is selectable.`, async () => {
    const el = app.elements.deleteMemo();
    expect(el, _`#delete-memo element is missing.`).to.exist;

    await app.login();
    expect(el.disabled, _`#delete-memo is enabled.`).to.be.true;
    await app.clickCategoryItem(2); // Restaurants
    await app.clickMemoItem(11); // Daily Grill
    expect(el.disabled, _`#delete-memo is disabled.`).to.be.false;
  });

  it(_`[Step 5] A request to add a memo is issued when #delete-memo is clicked.`, async () => {
    await app.login();
    await app.clickCategoryItem(2); // Restaurants
    await app.clickMemoItem(11); // Daily Grill
    await app.deleteMemo();

    const dataset = await app.dataset();
    expect(dataset.calls, _`A request to delete the memo was not issued.`).to.include("DELETE /memo");
  });

  it(_`[Step 5] Memo Item is deleted when #delete-memo is clicked.`, async () => {
    await app.login();
    await app.clickCategoryItem(2); // Restaurants
    await app.clickMemoItem(11); // Daily Grill
    await app.deleteMemo();
    expect(app.elements.memo(11), _`The deleted Memo Item is displayed on the list.`).not.to.exist;
  });
});
